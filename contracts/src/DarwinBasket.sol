// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {PqcAuth} from "./pqc/PqcAuth.sol";
import {PqcAdmin} from "./pqc/PqcAdmin.sol";
import {DarwinOracle} from "./DarwinOracle.sol";
import {DarwinReserve} from "./DarwinReserve.sol";

/// @title DarwinBasket
/// @notice One ERC-20 share of a portfolio of tokens (BLUEDW, BALDW, QOREDW...).
///
/// - **Mint in kind:** bring every component in the vault's current proportions and receive shares.
/// - **Redeem in kind:** burn shares and take your pro-rata slice of every component. Redemption
///   never depends on the oracle, the curator or the admin, and cannot be paused: your coins are
///   always yours to take back.
/// - **NAV:** the oracle's ML-DSA-87 signed prices value the vault, for display, for the router and
///   to bound every rebalance.
/// - **Rebalance:** only with an ML-DSA-87 signature of the curator over the exact trades, checked
///   on chain by pqcVerify. The trades run against the DarwinReserve at oracle prices and the
///   rebalance reverts if it costs the vault more than `maxRebalanceLossBps` of its NAV.
/// - **Pause:** the guardian (an ordinary key, for speed) can pause minting only. Unpausing and
///   every other admin action need the admin's ML-DSA-87 signature.
contract DarwinBasket is ERC20, PqcAdmin, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Trade {
        address tokenIn; // component the vault sells
        address tokenOut; // component the vault buys
        uint256 amountIn;
        uint256 minAmountOut;
    }

    uint16 public constant BPS = 10_000;
    uint256 public constant MAX_COMPONENTS = 8;

    /// @notice A free-text description shown by the app.
    string public description;
    DarwinOracle public oracle;
    DarwinReserve public reserve;
    /// @notice The account whose registered ML-DSA-87 key signs rebalances and weight changes.
    address public curator;
    uint256 public curatorNonce;
    /// @notice May pause minting (never redemption).
    address public guardian;
    bool public mintPaused;
    /// @notice The most NAV a rebalance may cost, in basis points.
    uint16 public maxRebalanceLossBps;
    /// @notice The account allowed to make the first mint (fixes the initial proportions).
    address public immutable seeder;
    /// @notice Set by the one and only seed.
    bool public seeded;

    address[] internal componentList;
    mapping(address => uint16) public targetWeightBps;
    mapping(address => bool) public isComponent;
    mapping(address => uint8) internal componentDecimals;

    event Minted(address indexed caller, address indexed to, uint256 shares, uint256[] amounts);
    event Redeemed(address indexed owner, address indexed to, uint256 shares, uint256[] amounts);
    event Rebalanced(uint256 indexed nonce, uint256 trades, uint256 navBefore, uint256 navAfter, address relayer);
    event TargetWeightsChanged(uint256 indexed nonce, uint16[] weights);
    event CuratorChanged(address indexed previous, address indexed next);
    event GuardianChanged(address indexed guardian);
    event MintPaused(bool paused, address by);
    event ReserveChanged(address indexed reserve);
    event OracleChanged(address indexed oracle);
    event MaxRebalanceLossChanged(uint16 bps);

    error BadComponents();
    error BadWeights();
    error ZeroShares();
    error AlreadySeeded();
    error NotSeeded();
    error NotSeeder();
    error MintIsPaused();
    error NotGuardian();
    error NotComponent(address token);
    error RebalanceTooCostly(uint256 navBefore, uint256 navAfter);
    error LengthMismatch();
    error BadParams();

    constructor(
        string memory name_,
        string memory symbol_,
        string memory description_,
        DarwinOracle oracle_,
        DarwinReserve reserve_,
        address admin_,
        address curator_,
        address guardian_,
        address[] memory components_,
        uint16[] memory weights_
    ) ERC20(name_, symbol_) PqcAdmin(admin_) {
        if (address(oracle_) == address(0) || curator_ == address(0)) revert ZeroAddress();
        uint256 n = components_.length;
        if (n == 0 || n > MAX_COMPONENTS || n != weights_.length) revert BadComponents();
        uint256 sum;
        for (uint256 i; i < n; ++i) {
            address t = components_[i];
            if (t == address(0) || isComponent[t]) revert BadComponents();
            isComponent[t] = true;
            componentList.push(t);
            componentDecimals[t] = IERC20Metadata(t).decimals();
            targetWeightBps[t] = weights_[i];
            sum += weights_[i];
        }
        if (sum != BPS) revert BadWeights();
        description = description_;
        oracle = oracle_;
        reserve = reserve_;
        curator = curator_;
        guardian = guardian_;
        maxRebalanceLossBps = 100;
        seeder = msg.sender;
        emit CuratorChanged(address(0), curator_);
        emit GuardianChanged(guardian_);
        emit ReserveChanged(address(reserve_));
        emit TargetWeightsChanged(0, weights_);
    }

    // ---------------------------------------------------------------------------------------------
    // Mint and redeem, in kind
    // ---------------------------------------------------------------------------------------------

    /// @notice The first mint: fixes the vault's initial proportions. Only the seeder, once.
    function seed(uint256[] calldata amounts, uint256 shares, address to) external nonReentrant {
        if (msg.sender != seeder) revert NotSeeder();
        // one-shot: even if every share is later redeemed, the classical seeder key cannot seed again
        if (seeded || totalSupply() != 0) revert AlreadySeeded();
        seeded = true;
        if (shares == 0) revert ZeroShares();
        uint256 n = componentList.length;
        if (amounts.length != n) revert LengthMismatch();
        for (uint256 i; i < n; ++i) {
            if (amounts[i] != 0) IERC20(componentList[i]).safeTransferFrom(msg.sender, address(this), amounts[i]);
        }
        _mint(to, shares);
        emit Minted(msg.sender, to, shares, amounts);
    }

    /// @notice What minting `shares` costs, component by component (rounded up).
    function mintAmounts(uint256 shares) public view returns (uint256[] memory amounts) {
        uint256 supply = totalSupply();
        if (supply == 0) revert NotSeeded();
        uint256 n = componentList.length;
        amounts = new uint256[](n);
        for (uint256 i; i < n; ++i) {
            uint256 held = IERC20(componentList[i]).balanceOf(address(this));
            amounts[i] = Math.mulDiv(held, shares, supply, Math.Rounding.Ceil);
        }
    }

    /// @notice What redeeming `shares` pays, component by component (rounded down).
    function redeemAmounts(uint256 shares) public view returns (uint256[] memory amounts) {
        uint256 supply = totalSupply();
        uint256 n = componentList.length;
        amounts = new uint256[](n);
        if (supply == 0) return amounts;
        for (uint256 i; i < n; ++i) {
            uint256 held = IERC20(componentList[i]).balanceOf(address(this));
            amounts[i] = Math.mulDiv(held, shares, supply);
        }
    }

    /// @notice Mint `shares` to `to`, pulling every component from the caller.
    function mint(uint256 shares, address to) external nonReentrant returns (uint256[] memory amounts) {
        if (mintPaused) revert MintIsPaused();
        if (shares == 0) revert ZeroShares();
        amounts = mintAmounts(shares);
        for (uint256 i; i < amounts.length; ++i) {
            if (amounts[i] != 0) IERC20(componentList[i]).safeTransferFrom(msg.sender, address(this), amounts[i]);
        }
        _mint(to, shares);
        emit Minted(msg.sender, to, shares, amounts);
    }

    /// @notice Burn `shares` of the caller and send the pro-rata components to `to`. Never paused.
    function redeem(uint256 shares, address to) external nonReentrant returns (uint256[] memory amounts) {
        if (shares == 0) revert ZeroShares();
        if (to == address(0)) revert ZeroAddress();
        amounts = redeemAmounts(shares);
        _burn(msg.sender, shares);
        for (uint256 i; i < amounts.length; ++i) {
            if (amounts[i] != 0) IERC20(componentList[i]).safeTransfer(to, amounts[i]);
        }
        emit Redeemed(msg.sender, to, shares, amounts);
    }

    // ---------------------------------------------------------------------------------------------
    // Valuation
    // ---------------------------------------------------------------------------------------------

    function components() external view returns (address[] memory) {
        return componentList;
    }

    /// @notice Components, target weights, holdings, USD values and current weights in one call.
    function composition()
        external
        view
        returns (
            address[] memory tokens,
            uint16[] memory targets,
            uint256[] memory balances,
            uint256[] memory values,
            uint16[] memory weights
        )
    {
        uint256 n = componentList.length;
        tokens = componentList;
        targets = new uint16[](n);
        balances = new uint256[](n);
        values = new uint256[](n);
        weights = new uint16[](n);
        uint256 total;
        for (uint256 i; i < n; ++i) {
            address t = tokens[i];
            targets[i] = targetWeightBps[t];
            balances[i] = IERC20(t).balanceOf(address(this));
            values[i] = _value(t, balances[i]);
            total += values[i];
        }
        if (total != 0) {
            for (uint256 i; i < n; ++i) {
                weights[i] = uint16(values[i] * BPS / total);
            }
        }
    }

    function _value(address token, uint256 amount) internal view returns (uint256) {
        if (amount == 0) return 0;
        return Math.mulDiv(amount, oracle.priceOfToken(token), 10 ** componentDecimals[token]);
    }

    /// @notice The vault's net asset value in USD (18 decimals) at the oracle's prices.
    function nav() public view returns (uint256 total) {
        uint256 n = componentList.length;
        for (uint256 i; i < n; ++i) {
            address t = componentList[i];
            total += _value(t, IERC20(t).balanceOf(address(this)));
        }
    }

    /// @notice NAV of one share (18 decimals), in USD with 18 decimals.
    function navPerShare() external view returns (uint256) {
        uint256 supply = totalSupply();
        if (supply == 0) return 0;
        return Math.mulDiv(nav(), 1e18, supply);
    }

    // ---------------------------------------------------------------------------------------------
    // Rebalance (curator, ML-DSA-87 signed)
    // ---------------------------------------------------------------------------------------------

    /// @notice The exact bytes the curator signs for a rebalance.
    function rebalanceMessage(Trade[] calldata trades, uint256 nonce, uint256 deadline)
        public
        view
        returns (bytes memory)
    {
        return abi.encodePacked(
            "DarwinBasket:rebalance:v1", block.chainid, address(this), nonce, deadline, keccak256(abi.encode(trades))
        );
    }

    /// @notice Run the curator-signed trades against the reserve. Anyone may relay.
    function rebalance(Trade[] calldata trades, uint256 deadline, bytes calldata signature) external nonReentrant {
        if (block.timestamp > deadline) revert Expired(deadline);
        if (trades.length == 0) revert BadParams();
        uint256 n = curatorNonce;
        PqcAuth.requireSigned(curator, rebalanceMessage(trades, n, deadline), signature);
        curatorNonce = n + 1;

        uint256 navBefore = nav();
        DarwinReserve r = reserve;
        for (uint256 i; i < trades.length; ++i) {
            Trade calldata t = trades[i];
            if (!isComponent[t.tokenIn]) revert NotComponent(t.tokenIn);
            if (!isComponent[t.tokenOut]) revert NotComponent(t.tokenOut);
            IERC20(t.tokenIn).forceApprove(address(r), t.amountIn);
            r.swapExactIn(t.tokenIn, t.tokenOut, t.amountIn, t.minAmountOut, address(this));
        }
        uint256 navAfter = nav();
        if (navAfter * BPS < navBefore * (BPS - maxRebalanceLossBps)) revert RebalanceTooCostly(navBefore, navAfter);
        emit Rebalanced(n, trades.length, navBefore, navAfter, msg.sender);
    }

    /// @notice The exact bytes the curator signs to change target weights.
    function weightsMessage(uint16[] calldata weights, uint256 nonce, uint256 deadline)
        public
        view
        returns (bytes memory)
    {
        return abi.encodePacked(
            "DarwinBasket:weights:v1", block.chainid, address(this), nonce, deadline, keccak256(abi.encode(weights))
        );
    }

    function setTargetWeights(uint16[] calldata weights, uint256 deadline, bytes calldata signature) external {
        if (block.timestamp > deadline) revert Expired(deadline);
        uint256 len = componentList.length;
        if (weights.length != len) revert LengthMismatch();
        uint256 sum;
        for (uint256 i; i < len; ++i) {
            sum += weights[i];
        }
        if (sum != BPS) revert BadWeights();
        uint256 n = curatorNonce;
        PqcAuth.requireSigned(curator, weightsMessage(weights, n, deadline), signature);
        curatorNonce = n + 1;
        for (uint256 i; i < len; ++i) {
            targetWeightBps[componentList[i]] = weights[i];
        }
        emit TargetWeightsChanged(n, weights);
    }

    // ---------------------------------------------------------------------------------------------
    // Guardian and admin
    // ---------------------------------------------------------------------------------------------

    /// @notice The guardian may only stop new mints, a move that can never cost a holder anything.
    function pauseMint() external {
        if (msg.sender != guardian) revert NotGuardian();
        mintPaused = true;
        emit MintPaused(true, msg.sender);
    }

    function setMintPaused(bool paused, uint256 deadline, bytes calldata signature) external {
        _authorizeAdmin("setMintPaused", abi.encode(paused), deadline, signature);
        mintPaused = paused;
        emit MintPaused(paused, msg.sender);
    }

    function setCurator(address next, uint256 deadline, bytes calldata signature) external {
        if (next == address(0)) revert ZeroAddress();
        _authorizeAdmin("setCurator", abi.encode(next), deadline, signature);
        emit CuratorChanged(curator, next);
        curator = next;
    }

    function setGuardian(address next, uint256 deadline, bytes calldata signature) external {
        _authorizeAdmin("setGuardian", abi.encode(next), deadline, signature);
        guardian = next;
        emit GuardianChanged(next);
    }

    function setReserve(DarwinReserve next, uint256 deadline, bytes calldata signature) external {
        _authorizeAdmin("setReserve", abi.encode(address(next)), deadline, signature);
        reserve = next;
        emit ReserveChanged(address(next));
    }

    /// @notice Point the basket at another oracle (ML-DSA-87 admin signature), e.g. a fixed one.
    function setOracle(DarwinOracle next, uint256 deadline, bytes calldata signature) external {
        if (address(next) == address(0)) revert BadParams();
        _authorizeAdmin("setOracle", abi.encode(address(next)), deadline, signature);
        oracle = next;
        emit OracleChanged(address(next));
    }

    function setMaxRebalanceLoss(uint16 bps, uint256 deadline, bytes calldata signature) external {
        if (bps > 1_000) revert BadParams();
        _authorizeAdmin("setMaxRebalanceLoss", abi.encode(bps), deadline, signature);
        maxRebalanceLossBps = bps;
        emit MaxRebalanceLossChanged(bps);
    }
}

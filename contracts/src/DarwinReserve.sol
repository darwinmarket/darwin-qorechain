// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {PqcAdmin} from "./pqc/PqcAdmin.sol";
import {DarwinOracle} from "./DarwinOracle.sol";

/// @title DarwinReserve
/// @notice An inventory market maker priced by the post-quantum oracle. It quotes every listed
/// token against every other at the oracle's USD prices, minus a spread, so a basket can be bought
/// or sold with fUSD in one transaction and a rebalance trades at a known price with no slippage
/// curve. The QoreChain AMM lives on the native lane and cannot be called from the EVM; the reserve
/// is what the EVM side trades against, and the keeper refills it from the AMM.
/// @dev Inventory leaves only through swaps or an ML-DSA-87 signed admin withdrawal. Anyone may add
/// inventory with a plain transfer.
contract DarwinReserve is PqcAdmin, ReentrancyGuard {
    using SafeERC20 for IERC20;

    DarwinOracle public oracle;
    /// @notice Spread taken on every swap, in basis points, unless the trader is exempt.
    uint16 public spreadBps;
    uint16 public constant MAX_SPREAD_BPS = 500;

    mapping(address => bool) public listed;
    mapping(address => uint8) public decimalsOf;
    /// @notice Traders that swap without spread (Darwin's own baskets, for rebalancing).
    mapping(address => bool) public spreadExempt;
    address[] internal tokenList;

    error BadOracle();

    event Swap(
        address indexed trader,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        address to
    );
    event TokenListed(address indexed token, bool listed);
    event SpreadChanged(uint16 spreadBps);
    event SpreadExemptSet(address indexed trader, bool exempt);
    event Withdrawn(address indexed token, uint256 amount, address indexed to);
    event OracleChanged(address indexed oracle);

    error NotListed(address token);
    error SameToken();
    error ZeroAmount();
    error Slippage(uint256 amount, uint256 limit);
    error InsufficientInventory(address token, uint256 needed, uint256 available);
    error BadParams();

    constructor(address admin_, DarwinOracle oracle_, uint16 spreadBps_) PqcAdmin(admin_) {
        if (address(oracle_) == address(0)) revert ZeroAddress();
        if (spreadBps_ > MAX_SPREAD_BPS) revert BadParams();
        oracle = oracle_;
        spreadBps = spreadBps_;
        emit OracleChanged(address(oracle_));
        emit SpreadChanged(spreadBps_);
    }

    // ---------------------------------------------------------------------------------------------
    // Quotes
    // ---------------------------------------------------------------------------------------------

    function _spread(address trader) internal view returns (uint256) {
        return spreadExempt[trader] ? 0 : spreadBps;
    }

    /// @notice USD value (18 decimals) of `amount` base units of `token` at the oracle price.
    function valueOf(address token, uint256 amount) public view returns (uint256) {
        if (!listed[token]) revert NotListed(token);
        return Math.mulDiv(amount, oracle.priceOfToken(token), 10 ** decimalsOf[token]);
    }

    /// @notice How much `tokenOut` `trader` receives for exactly `amountIn` of `tokenIn`.
    function quoteExactIn(address trader, address tokenIn, address tokenOut, uint256 amountIn)
        public
        view
        returns (uint256 amountOut)
    {
        if (tokenIn == tokenOut) revert SameToken();
        if (!listed[tokenOut]) revert NotListed(tokenOut);
        uint256 usd = valueOf(tokenIn, amountIn);
        uint256 net = Math.mulDiv(usd, 10_000 - _spread(trader), 10_000);
        amountOut = Math.mulDiv(net, 10 ** decimalsOf[tokenOut], oracle.priceOfToken(tokenOut));
    }

    /// @notice How much `tokenIn` `trader` pays for exactly `amountOut` of `tokenOut` (rounded up).
    function quoteExactOut(address trader, address tokenIn, address tokenOut, uint256 amountOut)
        public
        view
        returns (uint256 amountIn)
    {
        if (tokenIn == tokenOut) revert SameToken();
        if (!listed[tokenIn]) revert NotListed(tokenIn);
        if (!listed[tokenOut]) revert NotListed(tokenOut);
        uint256 usdOut =
            Math.mulDiv(amountOut, oracle.priceOfToken(tokenOut), 10 ** decimalsOf[tokenOut], Math.Rounding.Ceil);
        uint256 gross = Math.mulDiv(usdOut, 10_000, 10_000 - _spread(trader), Math.Rounding.Ceil);
        amountIn = Math.mulDiv(gross, 10 ** decimalsOf[tokenIn], oracle.priceOfToken(tokenIn), Math.Rounding.Ceil);
    }

    // ---------------------------------------------------------------------------------------------
    // Swaps
    // ---------------------------------------------------------------------------------------------

    function swapExactIn(address tokenIn, address tokenOut, uint256 amountIn, uint256 minOut, address to)
        external
        nonReentrant
        returns (uint256 amountOut)
    {
        if (amountIn == 0) revert ZeroAmount();
        amountOut = quoteExactIn(msg.sender, tokenIn, tokenOut, amountIn);
        if (amountOut < minOut) revert Slippage(amountOut, minOut);
        _settle(tokenIn, tokenOut, amountIn, amountOut, to);
    }

    function swapExactOut(address tokenIn, address tokenOut, uint256 amountOut, uint256 maxIn, address to)
        external
        nonReentrant
        returns (uint256 amountIn)
    {
        if (amountOut == 0) revert ZeroAmount();
        amountIn = quoteExactOut(msg.sender, tokenIn, tokenOut, amountOut);
        if (amountIn > maxIn) revert Slippage(amountIn, maxIn);
        _settle(tokenIn, tokenOut, amountIn, amountOut, to);
    }

    function _settle(address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut, address to) internal {
        if (amountOut == 0) revert ZeroAmount();
        uint256 available = IERC20(tokenOut).balanceOf(address(this));
        if (available < amountOut) revert InsufficientInventory(tokenOut, amountOut, available);
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenOut).safeTransfer(to, amountOut);
        emit Swap(msg.sender, tokenIn, tokenOut, amountIn, amountOut, to);
    }

    // ---------------------------------------------------------------------------------------------
    // Views
    // ---------------------------------------------------------------------------------------------

    function tokens() external view returns (address[] memory) {
        return tokenList;
    }

    /// @notice Every listed token with its inventory.
    function inventory() external view returns (address[] memory list, uint256[] memory balances) {
        list = tokenList;
        balances = new uint256[](list.length);
        for (uint256 i; i < list.length; ++i) {
            balances[i] = IERC20(list[i]).balanceOf(address(this));
        }
    }

    // ---------------------------------------------------------------------------------------------
    // Admin (ML-DSA-87 signed)
    // ---------------------------------------------------------------------------------------------

    function listToken(address token, bool isListed, uint256 deadline, bytes calldata signature) external {
        if (token == address(0)) revert ZeroAddress();
        _authorizeAdmin("listToken", abi.encode(token, isListed), deadline, signature);
        if (isListed && decimalsOf[token] == 0 && !_known(token)) {
            decimalsOf[token] = IERC20Metadata(token).decimals();
            tokenList.push(token);
        }
        listed[token] = isListed;
        emit TokenListed(token, isListed);
    }

    function setSpread(uint16 spreadBps_, uint256 deadline, bytes calldata signature) external {
        if (spreadBps_ > MAX_SPREAD_BPS) revert BadParams();
        _authorizeAdmin("setSpread", abi.encode(spreadBps_), deadline, signature);
        spreadBps = spreadBps_;
        emit SpreadChanged(spreadBps_);
    }

    /// @notice Point the reserve at another oracle (ML-DSA-87 admin signature).
    function setOracle(DarwinOracle next, uint256 deadline, bytes calldata signature) external {
        if (address(next) == address(0)) revert BadOracle();
        _authorizeAdmin("setOracle", abi.encode(address(next)), deadline, signature);
        oracle = next;
        emit OracleChanged(address(next));
    }

    function setSpreadExempt(address trader, bool exempt, uint256 deadline, bytes calldata signature) external {
        _authorizeAdmin("setSpreadExempt", abi.encode(trader, exempt), deadline, signature);
        spreadExempt[trader] = exempt;
        emit SpreadExemptSet(trader, exempt);
    }

    function withdraw(address token, uint256 amount, address to, uint256 deadline, bytes calldata signature)
        external
        nonReentrant
    {
        if (to == address(0)) revert ZeroAddress();
        _authorizeAdmin("withdraw", abi.encode(token, amount, to), deadline, signature);
        IERC20(token).safeTransfer(to, amount);
        emit Withdrawn(token, amount, to);
    }

    function _known(address token) internal view returns (bool) {
        for (uint256 i; i < tokenList.length; ++i) {
            if (tokenList[i] == token) return true;
        }
        return false;
    }
}

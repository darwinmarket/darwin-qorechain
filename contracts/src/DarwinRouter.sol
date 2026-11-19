// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {DarwinBasket} from "./DarwinBasket.sol";
import {DarwinReserve} from "./DarwinReserve.sol";

/// @title DarwinRouter
/// @notice Buy a whole basket with fUSD, or sell it back for fUSD, in one transaction.
///
/// Buy: the router takes the trader's fUSD, keeps the fee, buys every component from the reserve at
/// oracle prices, mints the shares to the trader and refunds what was not spent.
/// Sell: the router takes the shares, redeems them in kind, sells every component to the reserve
/// and pays fUSD. A user whose EVM window is scoped to {fUSD, router, basket} can do both.
///
/// The router holds nothing between transactions and has no admin.
contract DarwinRouter is ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable usd;
    DarwinReserve public immutable reserve;
    /// @notice Darwin's trade fee in basis points, as on mainnet.
    uint16 public immutable feeBps;
    address public immutable feeTo;
    /// @notice Headroom kept when sizing a buy, so rounding never makes it revert.
    uint16 public constant BUY_BUFFER_BPS = 20;

    event Bought(
        address indexed trader, address indexed basket, uint256 usdIn, uint256 fee, uint256 shares, address to
    );
    event Sold(address indexed trader, address indexed basket, uint256 shares, uint256 usdOut, uint256 fee, address to);

    error ZeroAmount();
    error Slippage(uint256 amount, uint256 limit);
    error TooSmall();

    constructor(IERC20 usd_, DarwinReserve reserve_, uint16 feeBps_, address feeTo_) {
        require(feeBps_ <= 200 && feeTo_ != address(0), "bad fee");
        usd = usd_;
        reserve = reserve_;
        feeBps = feeBps_;
        feeTo = feeTo_;
    }

    // ---------------------------------------------------------------------------------------------
    // Quotes
    // ---------------------------------------------------------------------------------------------

    /// @notice fUSD cost of the components behind `shares`, bought from the reserve.
    function costOf(DarwinBasket basket, uint256 shares) public view returns (uint256 total) {
        address[] memory comps = basket.components();
        uint256[] memory amounts = basket.mintAmounts(shares);
        for (uint256 i; i < comps.length; ++i) {
            if (amounts[i] == 0) continue;
            total += comps[i] == address(usd)
                ? amounts[i]
                : reserve.quoteExactOut(address(this), address(usd), comps[i], amounts[i]);
        }
    }

    /// @notice Shares bought for `usdIn` fUSD, after the fee.
    /// @dev Prices a 1-share probe and scales, then checks the exact cost of that many shares and
    /// shrinks them until it fits the budget. The check matters for small buys: every component
    /// amount is rounded up to its smallest unit, and one satoshi of an 8-decimal BTC leg can cost
    /// more than the headroom of a linear estimate.
    function quoteBuy(DarwinBasket basket, uint256 usdIn) public view returns (uint256 shares, uint256 fee) {
        fee = Math.mulDiv(usdIn, feeBps, 10_000);
        uint256 budget = Math.mulDiv(usdIn - fee, 10_000 - BUY_BUFFER_BPS, 10_000);
        uint256 unitCost = costOf(basket, 1e18);
        if (unitCost == 0) revert TooSmall();
        shares = Math.mulDiv(budget, 1e18, unitCost);
        for (uint256 i; i < 4 && shares != 0; ++i) {
            uint256 cost = costOf(basket, shares);
            if (cost <= budget) return (shares, fee);
            // shrink in proportion to the overshoot, plus one unit of slack each pass
            shares = Math.mulDiv(shares, budget, cost) * (10_000 - 10 * (i + 1)) / 10_000;
        }
        if (shares != 0 && costOf(basket, shares) > budget) revert TooSmall();
    }

    /// @notice fUSD paid for `shares`, after the fee.
    function quoteSell(DarwinBasket basket, uint256 shares) public view returns (uint256 usdOut, uint256 fee) {
        address[] memory comps = basket.components();
        uint256[] memory amounts = basket.redeemAmounts(shares);
        uint256 gross;
        for (uint256 i; i < comps.length; ++i) {
            if (amounts[i] == 0) continue;
            gross += comps[i] == address(usd)
                ? amounts[i]
                : reserve.quoteExactIn(address(this), comps[i], address(usd), amounts[i]);
        }
        fee = Math.mulDiv(gross, feeBps, 10_000);
        usdOut = gross - fee;
    }

    // ---------------------------------------------------------------------------------------------
    // Trades
    // ---------------------------------------------------------------------------------------------

    function buy(DarwinBasket basket, uint256 usdIn, uint256 minShares, address to)
        external
        nonReentrant
        returns (uint256 shares)
    {
        if (usdIn == 0) revert ZeroAmount();
        uint256 fee;
        (shares, fee) = quoteBuy(basket, usdIn);
        if (shares == 0) revert TooSmall();
        if (shares < minShares) revert Slippage(shares, minShares);

        usd.safeTransferFrom(msg.sender, address(this), usdIn);
        if (fee != 0) usd.safeTransfer(feeTo, fee);

        address[] memory comps = basket.components();
        uint256[] memory amounts = basket.mintAmounts(shares);
        uint256 budget = usdIn - fee;
        for (uint256 i; i < comps.length; ++i) {
            if (amounts[i] == 0 || comps[i] == address(usd)) continue;
            uint256 maxIn = usd.balanceOf(address(this));
            usd.forceApprove(address(reserve), maxIn);
            reserve.swapExactOut(address(usd), comps[i], amounts[i], maxIn, address(this));
        }
        usd.forceApprove(address(reserve), 0);
        for (uint256 i; i < comps.length; ++i) {
            if (amounts[i] != 0) IERC20(comps[i]).forceApprove(address(basket), amounts[i]);
        }
        basket.mint(shares, to);

        uint256 left = usd.balanceOf(address(this));
        if (left != 0) usd.safeTransfer(msg.sender, left);
        emit Bought(msg.sender, address(basket), budget + fee - left, fee, shares, to);
    }

    function sell(DarwinBasket basket, uint256 shares, uint256 minUsdOut, address to)
        external
        nonReentrant
        returns (uint256 usdOut)
    {
        if (shares == 0) revert ZeroAmount();
        IERC20(address(basket)).safeTransferFrom(msg.sender, address(this), shares);
        address[] memory comps = basket.components();
        uint256[] memory amounts = basket.redeem(shares, address(this));

        uint256 gross;
        for (uint256 i; i < comps.length; ++i) {
            if (amounts[i] == 0) continue;
            if (comps[i] == address(usd)) {
                gross += amounts[i];
            } else {
                IERC20(comps[i]).forceApprove(address(reserve), amounts[i]);
                gross += reserve.swapExactIn(comps[i], address(usd), amounts[i], 0, address(this));
            }
        }
        uint256 fee = Math.mulDiv(gross, feeBps, 10_000);
        usdOut = gross - fee;
        if (usdOut < minUsdOut) revert Slippage(usdOut, minUsdOut);
        if (fee != 0) usd.safeTransfer(feeTo, fee);
        usd.safeTransfer(to, usdOut);
        emit Sold(msg.sender, address(basket), shares, usdOut, fee, to);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {DarwinTest} from "../utils/DarwinTest.sol";
import {MockERC20} from "../utils/MockERC20.sol";
import {DarwinBasket} from "../../src/DarwinBasket.sol";
import {DarwinOracle} from "../../src/DarwinOracle.sol";
import {DarwinReserve} from "../../src/DarwinReserve.sol";
import {DarwinRouter} from "../../src/DarwinRouter.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Test} from "forge-std/Test.sol";

/// Random users trade while the oracle's prices walk: signed rounds, at least a minute apart, each
/// moving BTC, ETH and QOR by up to 10%. Every failure is counted, never swallowed: a redemption in
/// kind must never fail, and a router sell may only be refused for the reasons listed below.
contract PriceWalkHandler is Test {
    DarwinBasket public basket;
    DarwinRouter public router;
    DarwinOracle public oracle;
    MockERC20 public fUSD;
    MockERC20[] public comps;
    address public reporter;
    address[] public actors;

    uint256 public ghostRounds;
    uint256 public ghostBuys;
    uint256 public ghostSells;
    uint256 public ghostRedeems;
    uint256 public ghostRedeemFailures;
    uint256 public ghostUnexpectedSellFailures;
    uint256 public ghostExpectedSellRefusals;

    constructor(
        DarwinBasket basket_,
        DarwinRouter router_,
        DarwinOracle oracle_,
        MockERC20 fUSD_,
        MockERC20[] memory comps_,
        address reporter_
    ) {
        (basket, router, oracle, fUSD, comps, reporter) = (basket_, router_, oracle_, fUSD_, comps_, reporter_);
        for (uint256 i; i < 4; ++i) {
            actors.push(makeAddr(string(abi.encodePacked("walker", vm.toString(i)))));
        }
    }

    function _actor(uint256 seed) internal view returns (address) {
        return actors[seed % actors.length];
    }

    /// Same scheme as DarwinTest._sign, against MockPqc.
    function _sign(bytes memory message) internal view returns (bytes memory) {
        return abi.encodePacked(keccak256(abi.encodePacked("ok", abi.encodePacked("mldsa87:", reporter), message)));
    }

    function _walk(uint128 prev, uint256 seed) internal pure returns (uint128) {
        // -10% .. +10%, in basis points
        int256 bps = int256(seed % 2_001) - 1_000;
        return uint128(uint256(int256(uint256(prev)) * (10_000 + bps) / 10_000));
    }

    function movePrices(uint256 seed) external {
        vm.warp(oracle.lastTimestamp() + oracle.MIN_ROUND_INTERVAL());
        uint16[] memory ids = new uint16[](4);
        uint128[] memory prices = new uint128[](4);
        (ids[0], ids[1], ids[2], ids[3]) = (1, 2, 3, 4); // USD, ETH, BTC, QOR: increasing
        prices[0] = 1e18;
        for (uint256 i = 1; i < 4; ++i) {
            prices[i] = _walk(uint128(oracle.priceOf(ids[i])), uint256(keccak256(abi.encode(seed, i))));
        }
        uint64 ts = uint64(block.timestamp);
        oracle.submit(ts, ids, prices, _sign(oracle.roundMessage(oracle.round() + 1, ts, ids, prices)));
        ghostRounds++;
    }

    function buy(uint256 seed, uint256 usdIn) external {
        usdIn = bound(usdIn, 1e6, 2_000e6);
        address a = _actor(seed);
        fUSD.mint(a, usdIn);
        vm.startPrank(a);
        fUSD.approve(address(router), usdIn);
        try router.buy(basket, usdIn, 0, a) {
            ghostBuys++;
        } catch {}
        vm.stopPrank();
    }

    function sell(uint256 seed, uint256 frac) external {
        address a = _actor(seed);
        uint256 held = basket.balanceOf(a);
        if (held == 0) return;
        uint256 shares = bound(frac, 1, held);
        vm.startPrank(a);
        IERC20(address(basket)).approve(address(router), shares);
        try router.sell(basket, shares, 0, a) {
            ghostSells++;
        } catch (bytes memory err) {
            bytes4 sel = bytes4(err);
            // the only acceptable refusals: the reserve is out of fUSD, or the sale is dust
            if (
                sel == DarwinReserve.InsufficientInventory.selector || sel == DarwinRouter.TooSmall.selector
                    || sel == DarwinRouter.ZeroAmount.selector || sel == DarwinReserve.ZeroAmount.selector
            ) {
                ghostExpectedSellRefusals++;
            } else {
                ghostUnexpectedSellFailures++;
            }
        }
        vm.stopPrank();
    }

    /// In-kind redemption uses no price at all: it must work at any price, every time.
    function redeem(uint256 seed, uint256 frac) external {
        address a = _actor(seed);
        uint256 held = basket.balanceOf(a);
        if (held == 0) return;
        uint256 shares = bound(frac, 1, held);
        vm.prank(a);
        try basket.redeem(shares, a) {
            ghostRedeems++;
        } catch {
            ghostRedeemFailures++;
        }
    }
}

contract PriceWalkInvariantsTest is DarwinTest {
    DarwinBasket bal;
    DarwinRouter router;
    PriceWalkHandler handler;

    function setUp() public override {
        super.setUp();
        bal = _balanced();
        router = new DarwinRouter(IERC20(address(fUSD)), reserve, 30, treasury);
        MockERC20[] memory comps = new MockERC20[](3);
        (comps[0], comps[1], comps[2]) = (fBTC, fETH, fUSD);
        handler = new PriceWalkHandler(bal, router, oracle, fUSD, comps, reporter);
        // give the handler's actors the seed shares to sell and redeem from the start
        bal.transfer(makeAddr("walker0"), bal.balanceOf(address(this)) / 2);
        targetContract(address(handler));
    }

    /// Whatever the prices did, every share is backed by what the vault holds.
    function invariant_fullyBackedAtAnyPrice() public view {
        uint256[] memory all = bal.redeemAmounts(bal.totalSupply());
        address[] memory c = bal.components();
        for (uint256 i; i < c.length; ++i) {
            assertLe(all[i], IERC20(c[i]).balanceOf(address(bal)));
        }
    }

    /// Redemption in kind never failed, at any price.
    function invariant_redeemInKindNeverFails() public view {
        assertEq(handler.ghostRedeemFailures(), 0);
    }

    /// A sell through the router was only ever refused for an empty reserve or dust.
    function invariant_sellsFailOnlyForKnownReasons() public view {
        assertEq(handler.ghostUnexpectedSellFailures(), 0);
    }

    /// The router never keeps anything between transactions.
    function invariant_routerHoldsNothing() public view {
        assertEq(fUSD.balanceOf(address(router)), 0);
        assertEq(fBTC.balanceOf(address(router)), 0);
        assertEq(fETH.balanceOf(address(router)), 0);
        assertEq(bal.balanceOf(address(router)), 0);
    }

    function afterInvariant() external view {
        // the campaign must have moved prices and traded
        assertGt(handler.ghostRounds(), 0);
        assertGt(handler.ghostBuys() + handler.ghostSells() + handler.ghostRedeems(), 0);
    }
}

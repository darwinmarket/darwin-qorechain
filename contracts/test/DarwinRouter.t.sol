// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {DarwinTest} from "./utils/DarwinTest.sol";
import {DarwinBasket} from "../src/DarwinBasket.sol";
import {DarwinRouter} from "../src/DarwinRouter.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract DarwinRouterTest is DarwinTest {
    DarwinBasket blue;
    DarwinBasket bal;
    DarwinRouter router;

    function setUp() public override {
        super.setUp();
        blue = _blueChip();
        bal = _balanced();
        router = new DarwinRouter(IERC20(address(fUSD)), reserve, 30, treasury);
        fUSD.mint(alice, 10_000e6);
        vm.prank(alice);
        fUSD.approve(address(router), type(uint256).max);
    }

    function test_buyBlueChipWithFusd() public {
        (uint256 quoted,) = router.quoteBuy(blue, 1_000e6);
        vm.prank(alice);
        uint256 shares = router.buy(blue, 1_000e6, quoted, alice);
        assertEq(shares, quoted);
        assertEq(blue.balanceOf(alice), shares);
        // ~1,000 USD at NAV 100, minus fee, spread and buffer: about 9.92 shares
        assertApproxEqRel(shares, 9.92e18, 0.005e18);
        assertEq(fUSD.balanceOf(treasury), 3e6); // 30 bps of 1,000
        assertEq(fUSD.balanceOf(address(router)), 0);
        assertGt(fUSD.balanceOf(alice), 9_000e6); // unspent budget refunded
    }

    function test_buyBalancedUsesTheUsdLegDirectly() public {
        vm.prank(alice);
        uint256 shares = router.buy(bal, 1_000e6, 0, alice);
        assertApproxEqRel(shares * bal.navPerShare() / 1e18, 990e18, 0.01e18);
    }

    function test_sellBackForFusd() public {
        vm.startPrank(alice);
        uint256 shares = router.buy(blue, 1_000e6, 0, alice);
        uint256 usdBefore = fUSD.balanceOf(alice);
        blue.approve(address(router), shares);
        (uint256 quoted,) = router.quoteSell(blue, shares);
        uint256 out = router.sell(blue, shares, quoted, alice);
        vm.stopPrank();
        assertEq(out, quoted);
        assertEq(fUSD.balanceOf(alice), usdBefore + out);
        assertEq(blue.balanceOf(alice), 0);
        // round trip costs fee + spread both ways, about 1.2%
        assertApproxEqRel(out, 980e6, 0.01e18);
    }

    function test_buyRespectsMinShares() public {
        (uint256 quoted,) = router.quoteBuy(blue, 1_000e6);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(DarwinRouter.Slippage.selector, quoted, quoted + 1));
        router.buy(blue, 1_000e6, quoted + 1, alice);
    }

    function test_sellRespectsMinOut() public {
        vm.startPrank(alice);
        uint256 shares = router.buy(blue, 1_000e6, 0, alice);
        blue.approve(address(router), shares);
        vm.expectRevert();
        router.sell(blue, shares, 2_000e6, alice);
        vm.stopPrank();
    }

    function test_buyFailsWhenPricesAreStale() public {
        vm.warp(block.timestamp + 2 hours);
        vm.prank(alice);
        vm.expectRevert();
        router.buy(blue, 1_000e6, 0, alice);
    }

    function test_routerKeepsNothing() public {
        vm.startPrank(alice);
        uint256 shares = router.buy(blue, 1_000e6, 0, alice);
        blue.approve(address(router), shares);
        router.sell(blue, shares, 0, alice);
        vm.stopPrank();
        assertEq(fUSD.balanceOf(address(router)), 0);
        assertEq(fBTC.balanceOf(address(router)), 0);
        assertEq(fETH.balanceOf(address(router)), 0);
        assertEq(blue.balanceOf(address(router)), 0);
    }

    function testFuzz_buyNeverOverchargesTheNav(uint256 usdIn) public {
        usdIn = bound(usdIn, 1e6, 10_000e6);
        vm.prank(alice);
        uint256 shares = router.buy(blue, usdIn, 0, alice);
        uint256 value = shares * blue.navPerShare() / 1e18; // 18 decimals
        assertLe(value, usdIn * 1e12);
    }
}

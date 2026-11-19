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

/// Regression: small buys of a basket with an 8-decimal leg (fBTC) used to revert, because rounding
/// one satoshi up costs more than the 0.2% headroom of a linear quote. Found by the testnet battery.
contract RouterRoundingTest is DarwinTest {
    DarwinRouter router;

    function setUp() public override {
        super.setUp();
        router = new DarwinRouter(IERC20(address(fUSD)), reserve, 30, treasury);
    }

    function _qore() internal returns (DarwinBasket qore) {
        address[] memory comps = new address[](3);
        uint16[] memory w = new uint16[](3);
        (comps[0], comps[1], comps[2]) = (address(wQOR), address(fETH), address(fBTC));
        (w[0], w[1], w[2]) = (4_000, 3_000, 3_000);
        qore = new DarwinBasket("Q", "QOREDW", "", oracle, reserve, admin, curator, guardian, comps, w);
        uint256[] memory a = new uint256[](3);
        // a tiny basket, like on the testnet: 1 USD of value for 0.1 shares
        (a[0], a[1], a[2]) = (8e18, 0.00015e18, 500);
        wQOR.mint(address(this), a[0]);
        fETH.mint(address(this), a[1]);
        fBTC.mint(address(this), a[2]);
        wQOR.approve(address(qore), a[0]);
        fETH.approve(address(qore), a[1]);
        fBTC.approve(address(qore), a[2]);
        qore.seed(a, 0.1e18, address(this));
    }

    function testFuzz_smallBuysNeverRevertOnRounding(uint256 usdIn) public {
        DarwinBasket qore = _qore();
        usdIn = bound(usdIn, 20_000, 2_000_000); // 0.02 to 2 fUSD
        fUSD.mint(alice, usdIn);
        vm.startPrank(alice);
        fUSD.approve(address(router), usdIn);
        (uint256 quoted,) = router.quoteBuy(qore, usdIn);
        uint256 shares = router.buy(qore, usdIn, quoted, alice);
        vm.stopPrank();
        assertEq(shares, quoted);
        assertLe(fUSD.balanceOf(alice), usdIn);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {DarwinTest} from "./utils/DarwinTest.sol";
import {DarwinBasket} from "../src/DarwinBasket.sol";
import {PqcAuth} from "../src/pqc/PqcAuth.sol";

contract DarwinBasketTest is DarwinTest {
    DarwinBasket blue;
    DarwinBasket bal;

    function setUp() public override {
        super.setUp();
        blue = _blueChip();
        bal = _balanced();
        uint256 d = block.timestamp + 1 hours;
        reserve.setSpreadExempt(
            address(bal), true, d, _adminSig(address(reserve), "setSpreadExempt", abi.encode(address(bal), true), d)
        );
    }

    function test_seedFixesNavAt100() public view {
        assertEq(blue.symbol(), "BLUEDW");
        assertEq(blue.totalSupply(), 100e18);
        assertApproxEqRel(blue.navPerShare(), 100e18, 1e14);
        assertApproxEqRel(bal.navPerShare(), 100e18, 1e14);
    }

    function test_onlyTheSeederSeedsOnce() public {
        uint256[] memory amounts = new uint256[](2);
        vm.prank(alice);
        vm.expectRevert(DarwinBasket.NotSeeder.selector);
        blue.seed(amounts, 1, alice);
        vm.expectRevert(DarwinBasket.AlreadySeeded.selector);
        blue.seed(amounts, 1, alice);
    }

    function test_mintInKindKeepsProportions() public {
        uint256[] memory need = blue.mintAmounts(10e18);
        fBTC.mint(alice, need[0]);
        fETH.mint(alice, need[1]);
        vm.startPrank(alice);
        fBTC.approve(address(blue), need[0]);
        fETH.approve(address(blue), need[1]);
        blue.mint(10e18, alice);
        vm.stopPrank();
        assertEq(blue.balanceOf(alice), 10e18);
        assertApproxEqRel(blue.navPerShare(), 100e18, 1e14);
    }

    function test_redeemInKindPaysProRata() public {
        uint256 btcBefore = fBTC.balanceOf(address(blue));
        blue.redeem(50e18, alice);
        assertEq(fBTC.balanceOf(alice), btcBefore / 2);
        assertEq(blue.totalSupply(), 50e18);
    }

    function test_redeemWorksWhenOracleIsDeadAndMintIsPaused() public {
        vm.prank(guardian);
        blue.pauseMint();
        vm.warp(block.timestamp + 30 days); // every price is stale
        blue.redeem(100e18, alice);
        assertGt(fBTC.balanceOf(alice), 0);
        assertGt(fETH.balanceOf(alice), 0);
        assertEq(blue.totalSupply(), 0);
    }

    function test_guardianCanOnlyPause() public {
        vm.prank(guardian);
        blue.pauseMint();
        vm.expectRevert(DarwinBasket.MintIsPaused.selector);
        blue.mint(1e18, alice);
        uint256 d = block.timestamp + 1 hours;
        blue.setMintPaused(false, d, _adminSig(address(blue), "setMintPaused", abi.encode(false), d));
        assertFalse(blue.mintPaused());
    }

    function test_navFollowsTheOracle() public {
        _pushPrices(1e18, 2_200e18, 66_000e18, 0.05e18); // BTC and ETH +10%
        assertApproxEqRel(blue.navPerShare(), 110e18, 1e14);
        assertApproxEqRel(bal.navPerShare(), 107e18, 1e14); // 70% risk assets
    }

    function _btcToUsdTrade(uint256 btcAmount) internal view returns (DarwinBasket.Trade[] memory t) {
        t = new DarwinBasket.Trade[](1);
        uint256 minOut = reserve.quoteExactIn(address(bal), address(fBTC), address(fUSD), btcAmount) * 999 / 1000;
        t[0] = DarwinBasket.Trade(address(fBTC), address(fUSD), btcAmount, minOut);
    }

    function test_rebalanceWithTheCuratorsPqcSignature() public {
        _pushPrices(1e18, 2_000e18, 72_000e18, 0.05e18); // BTC +20%: BTC now overweight
        (,,,, uint16[] memory before) = bal.composition();
        DarwinBasket.Trade[] memory t = _btcToUsdTrade(700_000); // sell 0.007 BTC
        uint256 d = block.timestamp + 10 minutes;
        bytes memory sig = _sign(curator, bal.rebalanceMessage(t, bal.curatorNonce(), d));
        vm.prank(makeAddr("anyRelayer"));
        bal.rebalance(t, d, sig);
        (,,,, uint16[] memory afterW) = bal.composition();
        assertLt(afterW[0], before[0]);
        assertGt(afterW[2], before[2]);
        assertEq(bal.curatorNonce(), 1);
    }

    function test_rebalanceRefusesAForgedSignature() public {
        DarwinBasket.Trade[] memory t = _btcToUsdTrade(700_000);
        uint256 d = block.timestamp + 10 minutes;
        bytes memory forged = _sign(reporter, bal.rebalanceMessage(t, 0, d));
        vm.expectRevert(abi.encodeWithSelector(PqcAuth.BadPqcSignature.selector, curator));
        bal.rebalance(t, d, forged);
    }

    function test_rebalanceSignatureIsBoundToItsTrades() public {
        DarwinBasket.Trade[] memory t = _btcToUsdTrade(700_000);
        uint256 d = block.timestamp + 10 minutes;
        bytes memory sig = _sign(curator, bal.rebalanceMessage(t, 0, d));
        t[0].amountIn = 5_000_000; // dump far more BTC with the same signature
        vm.expectRevert(abi.encodeWithSelector(PqcAuth.BadPqcSignature.selector, curator));
        bal.rebalance(t, d, sig);
    }

    function test_rebalanceCannotLeakValue() public {
        // Blue Chip is not spread-exempt: round-tripping half the NAV costs ~0.3% of NAV, above a 0.2% limit.
        uint256 d0 = block.timestamp + 1 hours;
        blue.setMaxRebalanceLoss(
            20, d0, _adminSig(address(blue), "setMaxRebalanceLoss", abi.encode(uint16(20)), d0)
        );
        uint256 btc = fBTC.balanceOf(address(blue));
        DarwinBasket.Trade[] memory t = new DarwinBasket.Trade[](2);
        uint256 eth = reserve.quoteExactIn(address(blue), address(fBTC), address(fETH), btc);
        t[0] = DarwinBasket.Trade(address(fBTC), address(fETH), btc, 0);
        t[1] = DarwinBasket.Trade(address(fETH), address(fBTC), eth, 0);
        uint256 d = block.timestamp + 10 minutes;
        bytes memory sig = _sign(curator, blue.rebalanceMessage(t, 0, d));
        vm.expectPartialRevert(DarwinBasket.RebalanceTooCostly.selector);
        blue.rebalance(t, d, sig);
    }

    function test_rebalanceOnlyTradesComponents() public {
        DarwinBasket.Trade[] memory t = new DarwinBasket.Trade[](1);
        t[0] = DarwinBasket.Trade(address(fBTC), address(wQOR), 1_000, 0);
        uint256 d = block.timestamp + 10 minutes;
        bytes memory sig = _sign(curator, blue.rebalanceMessage(t, 0, d));
        vm.expectRevert(abi.encodeWithSelector(DarwinBasket.NotComponent.selector, address(wQOR)));
        blue.rebalance(t, d, sig);
    }

    function test_curatorChangesTargetWeights() public {
        uint16[] memory w = new uint16[](3);
        (w[0], w[1], w[2]) = (4_000, 4_000, 2_000);
        uint256 d = block.timestamp + 10 minutes;
        bal.setTargetWeights(w, d, _sign(curator, bal.weightsMessage(w, 0, d)));
        assertEq(bal.targetWeightBps(address(fUSD)), 2_000);
    }

    function test_weightsRefuseASignatureFromAnotherKey() public {
        uint16[] memory w = new uint16[](3);
        (w[0], w[1], w[2]) = (4_000, 4_000, 2_000);
        uint256 d = block.timestamp + 10 minutes;
        // the reporter's key is registered and proven, but it is not the curator's
        bytes memory sig = _sign(reporter, bal.weightsMessage(w, 0, d));
        vm.expectRevert(abi.encodeWithSelector(PqcAuth.BadPqcSignature.selector, curator));
        bal.setTargetWeights(w, d, sig);
    }

    function test_weightsSignatureIsBoundToItsWeights() public {
        uint16[] memory signed = new uint16[](3);
        (signed[0], signed[1], signed[2]) = (4_000, 4_000, 2_000);
        uint16[] memory sent = new uint16[](3);
        (sent[0], sent[1], sent[2]) = (1_000, 1_000, 8_000);
        uint256 d = block.timestamp + 10 minutes;
        bytes memory sig = _sign(curator, bal.weightsMessage(signed, 0, d));
        vm.expectRevert(abi.encodeWithSelector(PqcAuth.BadPqcSignature.selector, curator));
        bal.setTargetWeights(sent, d, sig);
    }

    function test_weightsMustSumTo100Percent() public {
        uint16[] memory w = new uint16[](3);
        (w[0], w[1], w[2]) = (4_000, 4_000, 1_000);
        uint256 d = block.timestamp + 10 minutes;
        bytes memory sig = _sign(curator, bal.weightsMessage(w, 0, d));
        vm.expectRevert(DarwinBasket.BadWeights.selector);
        bal.setTargetWeights(w, d, sig);
    }

    function testFuzz_mintThenRedeemNeverProfits(uint256 shares) public {
        shares = bound(shares, 1, 1_000e18);
        uint256[] memory need = bal.mintAmounts(shares);
        fBTC.mint(alice, need[0]);
        fETH.mint(alice, need[1]);
        fUSD.mint(alice, need[2]);
        vm.startPrank(alice);
        fBTC.approve(address(bal), need[0]);
        fETH.approve(address(bal), need[1]);
        fUSD.approve(address(bal), need[2]);
        bal.mint(shares, alice);
        uint256[] memory got = bal.redeem(shares, alice);
        vm.stopPrank();
        for (uint256 i; i < 3; ++i) {
            assertLe(got[i], need[i]);
        }
    }
}

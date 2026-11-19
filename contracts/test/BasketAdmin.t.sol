// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {DarwinTest} from "./utils/DarwinTest.sol";
import {DarwinBasket} from "../src/DarwinBasket.sol";
import {DarwinReserve} from "../src/DarwinReserve.sol";
import {PqcAuth} from "../src/pqc/PqcAuth.sol";
import {PqcAdmin} from "../src/pqc/PqcAdmin.sol";

contract BasketAdminTest is DarwinTest {
    DarwinBasket blue;

    function setUp() public override {
        super.setUp();
        blue = _blueChip();
    }

    function _d() internal view returns (uint256) {
        return block.timestamp + 1 hours;
    }

    function test_setCuratorMovesRebalancePowers() public {
        address next = makeAddr("nextCurator");
        _setKey(next, true);
        uint256 d = _d();
        blue.setCurator(next, d, _adminSig(address(blue), "setCurator", abi.encode(next), d));
        assertEq(blue.curator(), next);

        uint16[] memory w = new uint16[](2);
        (w[0], w[1]) = (6_000, 4_000);
        uint256 n = blue.curatorNonce();
        bytes memory oldSig = _sign(curator, blue.weightsMessage(w, n, d));
        vm.expectRevert(abi.encodeWithSelector(PqcAuth.BadPqcSignature.selector, next));
        blue.setTargetWeights(w, d, oldSig);
        blue.setTargetWeights(w, d, _sign(next, blue.weightsMessage(w, n, d)));
        assertEq(blue.targetWeightBps(address(fBTC)), 6_000);
    }

    function test_setGuardian() public {
        address g = makeAddr("g2");
        uint256 d = _d();
        blue.setGuardian(g, d, _adminSig(address(blue), "setGuardian", abi.encode(g), d));
        vm.prank(guardian);
        vm.expectRevert(DarwinBasket.NotGuardian.selector);
        blue.pauseMint();
        vm.prank(g);
        blue.pauseMint();
        assertTrue(blue.mintPaused());
    }

    function test_setReserve() public {
        DarwinReserve r2 = new DarwinReserve(admin, oracle, 10);
        uint256 d = _d();
        blue.setReserve(r2, d, _adminSig(address(blue), "setReserve", abi.encode(address(r2)), d));
        assertEq(address(blue.reserve()), address(r2));
    }

    function test_maxRebalanceLossIsCapped() public {
        uint256 d = _d();
        vm.expectRevert(DarwinBasket.BadParams.selector);
        blue.setMaxRebalanceLoss(1_001, d, "");
    }

    function test_onlyTheGuardianPauses() public {
        vm.prank(alice);
        vm.expectRevert(DarwinBasket.NotGuardian.selector);
        blue.pauseMint();
    }

    function test_expiredRebalanceIsRefused() public {
        DarwinBasket.Trade[] memory t = new DarwinBasket.Trade[](1);
        t[0] = DarwinBasket.Trade(address(fBTC), address(fETH), 1_000, 0);
        uint256 d = block.timestamp - 1;
        bytes memory sig = _sign(curator, blue.rebalanceMessage(t, 0, d));
        vm.expectRevert(abi.encodeWithSelector(PqcAdmin.Expired.selector, d));
        blue.rebalance(t, d, sig);
    }

    function test_emptyRebalanceIsRefused() public {
        DarwinBasket.Trade[] memory t = new DarwinBasket.Trade[](0);
        vm.expectRevert(DarwinBasket.BadParams.selector);
        blue.rebalance(t, _d(), "");
    }

    function test_weightsLengthMustMatch() public {
        uint16[] memory w = new uint16[](3);
        vm.expectRevert(DarwinBasket.LengthMismatch.selector);
        blue.setTargetWeights(w, _d(), "");
    }

    function test_zeroSharesAndZeroRecipientAreRefused() public {
        vm.expectRevert(DarwinBasket.ZeroShares.selector);
        blue.mint(0, alice);
        vm.expectRevert(DarwinBasket.ZeroShares.selector);
        blue.redeem(0, alice);
        vm.expectRevert(PqcAdmin.ZeroAddress.selector);
        blue.redeem(1, address(0));
    }

    function test_badConstructionIsRefused() public {
        address[] memory comps = new address[](2);
        uint16[] memory w = new uint16[](2);
        (comps[0], comps[1]) = (address(fBTC), address(fBTC));
        (w[0], w[1]) = (5_000, 5_000);
        vm.expectRevert(DarwinBasket.BadComponents.selector);
        new DarwinBasket("x", "X", "", oracle, reserve, admin, curator, guardian, comps, w);
        comps[1] = address(fETH);
        w[1] = 4_000;
        vm.expectRevert(DarwinBasket.BadWeights.selector);
        new DarwinBasket("x", "X", "", oracle, reserve, admin, curator, guardian, comps, w);
    }

    function test_redeemOfAnEmptyBasketPaysNothing() public {
        blue.redeem(blue.totalSupply(), alice);
        assertEq(blue.navPerShare(), 0);
        uint256[] memory r = blue.redeemAmounts(1e18);
        assertEq(r[0] + r[1], 0);
        vm.expectRevert(DarwinBasket.NotSeeded.selector);
        blue.mintAmounts(1e18);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {DarwinTest} from "./utils/DarwinTest.sol";
import {DarwinOracle} from "../src/DarwinOracle.sol";
import {PqcAuth} from "../src/pqc/PqcAuth.sol";
import {PqcAdmin} from "../src/pqc/PqcAdmin.sol";

contract DarwinOracleTest is DarwinTest {
    function test_storesASignedRound() public view {
        assertEq(oracle.round(), 1);
        assertEq(oracle.priceOf(BTC), 60_000e18);
        assertEq(oracle.priceOfToken(address(fETH)), 2_000e18);
        assertEq(oracle.feedIds().length, 4);
    }

    function test_anyoneMayRelayASignedRound() public {
        vm.warp(block.timestamp + 10);
        (uint64 ts, uint16[] memory ids, uint128[] memory prices, bytes memory sig) =
            _round(1e18, 2_100e18, 61_000e18, 0.05e18);
        vm.prank(makeAddr("relayer"));
        oracle.submit(ts, ids, prices, sig);
        assertEq(oracle.priceOf(ETH), 2_100e18);
        assertEq(oracle.round(), 2);
    }

    function test_refusesARoundSignedByAnotherKey() public {
        vm.warp(block.timestamp + 10);
        (uint64 ts, uint16[] memory ids, uint128[] memory prices,) = _round(1e18, 2_100e18, 61_000e18, 0.05e18);
        bytes memory forged = _sign(curator, oracle.roundMessage(2, ts, ids, prices));
        vm.expectRevert(abi.encodeWithSelector(PqcAuth.BadPqcSignature.selector, reporter));
        oracle.submit(ts, ids, prices, forged);
    }

    function test_aSignatureIsBoundToItsPrices() public {
        vm.warp(block.timestamp + 10);
        (uint64 ts, uint16[] memory ids, uint128[] memory prices, bytes memory sig) =
            _round(1e18, 2_100e18, 61_000e18, 0.05e18);
        prices[2] = 1e18; // try to crash BTC with the same signature
        vm.expectRevert(abi.encodeWithSelector(PqcAuth.BadPqcSignature.selector, reporter));
        oracle.submit(ts, ids, prices, sig);
    }

    function test_aRoundCannotBeReplayed() public {
        vm.warp(block.timestamp + 10);
        (uint64 ts, uint16[] memory ids, uint128[] memory prices, bytes memory sig) =
            _round(1e18, 2_100e18, 61_000e18, 0.05e18);
        oracle.submit(ts, ids, prices, sig);
        vm.expectRevert(abi.encodeWithSelector(DarwinOracle.StaleRound.selector, ts, ts));
        oracle.submit(ts, ids, prices, sig);
    }

    function test_refusesFutureTimestamps() public {
        uint64 ts = uint64(block.timestamp + 1 hours);
        (, uint16[] memory ids, uint128[] memory prices,) = _round(1e18, 2_000e18, 60_000e18, 0.05e18);
        bytes memory sig = _sign(reporter, oracle.roundMessage(2, ts, ids, prices));
        vm.expectRevert(abi.encodeWithSelector(DarwinOracle.FutureRound.selector, ts));
        oracle.submit(ts, ids, prices, sig);
    }

    function test_circuitBreakerOnLargeMoves() public {
        vm.warp(block.timestamp + 10);
        (uint64 ts, uint16[] memory ids, uint128[] memory prices, bytes memory sig) =
            _round(1e18, 2_000e18, 30_000e18, 0.05e18); // BTC -50%
        vm.expectRevert(
            abi.encodeWithSelector(DarwinOracle.DeviationTooLarge.selector, BTC, 60_000e18, uint256(30_000e18))
        );
        oracle.submit(ts, ids, prices, sig);
    }

    function test_stalePricesAreRefused() public {
        vm.warp(block.timestamp + 2 hours);
        vm.expectRevert();
        oracle.priceOf(BTC);
        assertFalse(oracle.isFresh(BTC));
        (uint256 p,,) = oracle.latest(BTC);
        assertEq(p, 60_000e18);
    }

    function test_reporterWithoutProvenKeyIsRefused() public {
        _setKey(reporter, false);
        vm.warp(block.timestamp + 10);
        (uint64 ts, uint16[] memory ids, uint128[] memory prices, bytes memory sig) =
            _round(1e18, 2_000e18, 60_000e18, 0.05e18);
        vm.expectRevert(abi.encodeWithSelector(PqcAuth.PqcKeyNotProven.selector, reporter));
        oracle.submit(ts, ids, prices, sig);
    }

    function test_adminActionsNeedTheAdminsPqcSignature() public {
        address next = makeAddr("next");
        uint256 d = block.timestamp + 1 hours;
        uint256 nonce = oracle.adminNonce();
        bytes memory bad = _sign(reporter, oracle.adminMessage("setReporter", abi.encode(next), nonce, d));
        vm.expectRevert(abi.encodeWithSelector(PqcAuth.BadPqcSignature.selector, admin));
        oracle.setReporter(next, d, bad);

        oracle.setReporter(next, d, _adminSig(address(oracle), "setReporter", abi.encode(next), d));
        assertEq(oracle.reporter(), next);
    }

    function test_adminSignatureExpires() public {
        address next = makeAddr("next");
        uint256 d = block.timestamp - 1;
        bytes memory sig = _adminSig(address(oracle), "setReporter", abi.encode(next), d);
        vm.expectRevert(abi.encodeWithSelector(PqcAdmin.Expired.selector, d));
        oracle.setReporter(next, d, sig);
    }

    function test_adminSignatureWorksOnce() public {
        address next = makeAddr("next");
        uint256 d = block.timestamp + 1 hours;
        bytes memory sig = _adminSig(address(oracle), "setReporter", abi.encode(next), d);
        oracle.setReporter(next, d, sig);
        vm.expectRevert(abi.encodeWithSelector(PqcAuth.BadPqcSignature.selector, admin));
        oracle.setReporter(next, d, sig);
    }

    function testFuzz_pricesWithinTheBandAreAccepted(uint16 moveBps, bool up) public {
        moveBps = uint16(bound(moveBps, 0, 2_500));
        uint256 btc = 60_000e18;
        uint256 next = up ? btc + btc * moveBps / 10_000 : btc - btc * moveBps / 10_000;
        vm.warp(block.timestamp + 10);
        _pushPrices(1e18, 2_000e18, uint128(next), 0.05e18);
        assertEq(oracle.priceOf(BTC), next);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {DarwinTest} from "./utils/DarwinTest.sol";
import {WQOR} from "../src/WQOR.sol";
import {DarwinOracle} from "../src/DarwinOracle.sol";
import {DarwinReserve} from "../src/DarwinReserve.sol";
import {DarwinBasket} from "../src/DarwinBasket.sol";
import {DarwinRouter} from "../src/DarwinRouter.sol";
import {PqcAuth} from "../src/pqc/PqcAuth.sol";
import {PqcAdmin} from "../src/pqc/PqcAdmin.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract WQORTest is DarwinTest {
    WQOR w;

    function setUp() public override {
        super.setUp();
        w = new WQOR();
    }

    function test_depositAndWithdraw() public {
        vm.deal(alice, 5 ether);
        vm.startPrank(alice);
        w.deposit{value: 2 ether}();
        (bool ok,) = address(w).call{value: 1 ether}("");
        assertTrue(ok);
        assertEq(w.balanceOf(alice), 3 ether);
        w.withdraw(1.5 ether);
        vm.stopPrank();
        assertEq(alice.balance, 3.5 ether);
        assertEq(address(w).balance, 1.5 ether);
    }

    function test_cannotWithdrawMoreThanWrapped() public {
        vm.deal(alice, 1 ether);
        vm.startPrank(alice);
        w.deposit{value: 1 ether}();
        vm.expectRevert();
        w.withdraw(2 ether);
        vm.stopPrank();
    }

    function testFuzz_wrapUnwrapIsOneToOne(uint96 amount) public {
        vm.deal(bob, amount);
        vm.startPrank(bob);
        w.deposit{value: amount}();
        w.withdraw(amount);
        vm.stopPrank();
        assertEq(bob.balance, amount);
        assertEq(w.totalSupply(), 0);
    }
}

contract AdminHandoverTest is DarwinTest {
    function test_adminHandsOverWithItsPqcSignature() public {
        address next = makeAddr("nextAdmin");
        _setKey(next, true);
        uint256 d = block.timestamp + 1 hours;
        oracle.setAdmin(next, d, _adminSig(address(oracle), "setAdmin", abi.encode(next), d));
        assertEq(oracle.admin(), next);

        // the old admin's signature no longer works
        bytes memory params = abi.encode(uint32(600), uint16(1000));
        bytes memory oldSig = _sign(admin, oracle.adminMessage("setParams", params, oracle.adminNonce(), d));
        vm.expectRevert(abi.encodeWithSelector(PqcAuth.BadPqcSignature.selector, next));
        oracle.setParams(600, 1000, d, oldSig);

        // the new admin's does
        bytes memory newSig = _sign(next, oracle.adminMessage("setParams", params, oracle.adminNonce(), d));
        oracle.setParams(600, 1000, d, newSig);
        assertEq(oracle.maxAge(), 600);
        assertEq(oracle.maxDeviationBps(), 1000);
    }

    function test_cannotHandOverToZero() public {
        uint256 d = block.timestamp + 1 hours;
        vm.expectRevert(PqcAdmin.ZeroAddress.selector);
        oracle.setAdmin(address(0), d, "");
    }

    function test_adminWithoutRegisteredKeyCannotAct() public {
        address ghost = makeAddr("ghost");
        DarwinOracle o = new DarwinOracle(ghost, reporter, 1 hours, 1000);
        uint256 d = block.timestamp + 1 hours;
        bytes memory sig = _sign(ghost, o.adminMessage("addFeed", abi.encode(uint16(9), "X/USD"), 0, d));
        vm.expectRevert(abi.encodeWithSelector(PqcAuth.PqcKeyNotRegistered.selector, ghost));
        o.addFeed(9, "X/USD", d, sig);
    }

    function test_badConstructorParamsAreRefused() public {
        vm.expectRevert(DarwinOracle.BadParams.selector);
        new DarwinOracle(admin, reporter, 0, 1000);
        vm.expectRevert(DarwinOracle.BadParams.selector);
        new DarwinOracle(admin, reporter, 60, 10_001);
        vm.expectRevert(PqcAdmin.ZeroAddress.selector);
        new DarwinOracle(address(0), reporter, 60, 1000);
    }
}

contract OracleFeedsTest is DarwinTest {
    function test_cannotAddTheSameFeedTwice() public {
        uint256 d = block.timestamp + 1 hours;
        vm.expectRevert(DarwinOracle.BadParams.selector);
        oracle.addFeed(BTC, "BTC/USD", d, "");
    }

    function test_unknownFeedInARoundIsRefused() public {
        vm.warp(block.timestamp + 10);
        uint16[] memory ids = new uint16[](1);
        uint128[] memory prices = new uint128[](1);
        ids[0] = 77;
        prices[0] = 1e18;
        uint64 ts = uint64(block.timestamp);
        bytes memory sig = _sign(reporter, oracle.roundMessage(2, ts, ids, prices));
        vm.expectRevert(abi.encodeWithSelector(DarwinOracle.UnknownFeed.selector, uint16(77)));
        oracle.submit(ts, ids, prices, sig);
    }

    function test_zeroPriceIsRefused() public {
        vm.warp(block.timestamp + 10);
        (uint64 ts, uint16[] memory ids, uint128[] memory prices,) = _round(1e18, 2_000e18, 60_000e18, 0.05e18);
        prices[0] = 0;
        bytes memory sig = _sign(reporter, oracle.roundMessage(2, ts, ids, prices));
        vm.expectRevert(abi.encodeWithSelector(DarwinOracle.ZeroPrice.selector, USD));
        oracle.submit(ts, ids, prices, sig);
    }

    function test_partialRoundsUpdateOnlyTheirFeeds() public {
        vm.warp(block.timestamp + 10);
        uint16[] memory ids = new uint16[](1);
        uint128[] memory prices = new uint128[](1);
        ids[0] = ETH;
        prices[0] = 2_100e18;
        uint64 ts = uint64(block.timestamp);
        oracle.submit(ts, ids, prices, _sign(reporter, oracle.roundMessage(2, ts, ids, prices)));
        assertEq(oracle.priceOf(ETH), 2_100e18);
        (, uint64 btcAt,) = oracle.latest(BTC);
        assertLt(btcAt, ts);
    }

    function test_tokenWithoutFeedIsRefused() public {
        vm.expectRevert(abi.encodeWithSelector(DarwinOracle.NoFeed.selector, address(0xdead)));
        oracle.priceOfToken(address(0xdead));
    }
}

contract ReserveAdminTest is DarwinTest {
    function test_delistingStopsTrading() public {
        uint256 d = block.timestamp + 1 hours;
        reserve.listToken(address(fETH), false, d, _adminSig(address(reserve), "listToken", abi.encode(address(fETH), false), d));
        vm.expectRevert(abi.encodeWithSelector(DarwinReserve.NotListed.selector, address(fETH)));
        reserve.quoteExactIn(alice, address(fUSD), address(fETH), 1e6);
        // relisting keeps a single entry in the token list
        reserve.listToken(address(fETH), true, d, _adminSig(address(reserve), "listToken", abi.encode(address(fETH), true), d));
        assertEq(reserve.tokens().length, 4);
    }

    function test_spreadIsCapped() public {
        uint256 d = block.timestamp + 1 hours;
        vm.expectRevert(DarwinReserve.BadParams.selector);
        reserve.setSpread(501, d, "");
    }

    function test_sameTokenSwapIsRefused() public {
        vm.expectRevert(DarwinReserve.SameToken.selector);
        reserve.quoteExactIn(alice, address(fUSD), address(fUSD), 1e6);
    }
}

contract QoreBasketTest is DarwinTest {
    DarwinBasket qore;
    DarwinRouter router;

    function setUp() public override {
        super.setUp();
        address[] memory comps = new address[](3);
        uint16[] memory w = new uint16[](3);
        (comps[0], comps[1], comps[2]) = (address(wQOR), address(fETH), address(fBTC));
        (w[0], w[1], w[2]) = (4_000, 3_000, 3_000);
        qore = new DarwinBasket("Darwin Qore Ecosystem", "QOREDW", "40/30/30", oracle, reserve, admin, curator, guardian, comps, w);
        uint256[] memory amounts = new uint256[](3);
        // 1 USD per share x 10 shares: 4 USD of QOR at 0.05, 3 USD ETH, 3 USD BTC
        (amounts[0], amounts[1], amounts[2]) = (80e18, 0.0015e18, 5_000);
        wQOR.mint(address(this), amounts[0]);
        fETH.mint(address(this), amounts[1]);
        fBTC.mint(address(this), amounts[2]);
        wQOR.approve(address(qore), amounts[0]);
        fETH.approve(address(qore), amounts[1]);
        fBTC.approve(address(qore), amounts[2]);
        qore.seed(amounts, 10e18, address(this));
        router = new DarwinRouter(IERC20(address(fUSD)), reserve, 30, treasury);
    }

    function test_navWithAnEighteenDecimalNativeLeg() public view {
        assertApproxEqRel(qore.navPerShare(), 1e18, 1e15);
        (,,,, uint16[] memory weights) = qore.composition();
        assertApproxEqAbs(weights[0], 4_000, 2);
    }

    function test_buyAndSellThroughTheRouter() public {
        fUSD.mint(alice, 100e6);
        vm.startPrank(alice);
        fUSD.approve(address(router), 100e6);
        uint256 shares = router.buy(qore, 10e6, 0, alice);
        assertApproxEqRel(shares, 9.92e18, 0.01e18);
        IERC20(address(qore)).approve(address(router), shares);
        uint256 out = router.sell(qore, shares, 0, alice);
        vm.stopPrank();
        assertApproxEqRel(out, 9.8e6, 0.01e18);
    }

    function test_qorRallyMovesTheNav() public {
        _pushPrices(1e18, 2_000e18, 60_000e18, 0.06e18); // QOR +20%
        assertApproxEqRel(qore.navPerShare(), 1.08e18, 1e15);
    }
}

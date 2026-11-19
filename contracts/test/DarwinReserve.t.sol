// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {DarwinTest} from "./utils/DarwinTest.sol";
import {DarwinReserve} from "../src/DarwinReserve.sol";
import {PqcAuth} from "../src/pqc/PqcAuth.sol";

contract DarwinReserveTest is DarwinTest {
    function test_quotesAtOraclePriceMinusSpread() public view {
        // 2,000 fUSD -> 1 ETH before spread; 30 bps spread -> 0.997 ETH
        assertEq(reserve.quoteExactIn(alice, address(fUSD), address(fETH), 2_000e6), 0.997e18);
        // 1 BTC -> 60,000 fUSD minus 30 bps
        assertEq(reserve.quoteExactIn(alice, address(fBTC), address(fUSD), 1e8), 59_820e6);
    }

    function test_exactOutRoundsAgainstTheTrader() public view {
        uint256 inAmt = reserve.quoteExactOut(alice, address(fUSD), address(fETH), 1e18);
        uint256 back = reserve.quoteExactIn(alice, address(fUSD), address(fETH), inAmt);
        assertGe(back, 1e18);
    }

    function test_swapExactIn() public {
        fUSD.mint(alice, 2_000e6);
        vm.startPrank(alice);
        fUSD.approve(address(reserve), 2_000e6);
        uint256 out = reserve.swapExactIn(address(fUSD), address(fETH), 2_000e6, 0.99e18, alice);
        vm.stopPrank();
        assertEq(out, 0.997e18);
        assertEq(fETH.balanceOf(alice), 0.997e18);
    }

    function test_swapRespectsMinOut() public {
        fUSD.mint(alice, 2_000e6);
        vm.startPrank(alice);
        fUSD.approve(address(reserve), 2_000e6);
        vm.expectRevert(abi.encodeWithSelector(DarwinReserve.Slippage.selector, 0.997e18, 1e18));
        reserve.swapExactIn(address(fUSD), address(fETH), 2_000e6, 1e18, alice);
        vm.stopPrank();
    }

    function test_swapFailsBeyondInventory() public {
        fUSD.mint(alice, 10_000_000e6);
        vm.startPrank(alice);
        fUSD.approve(address(reserve), type(uint256).max);
        vm.expectRevert();
        reserve.swapExactIn(address(fUSD), address(fBTC), 10_000_000e6, 0, alice);
        vm.stopPrank();
    }

    function test_unlistedTokensAreRefused() public {
        vm.expectRevert(abi.encodeWithSelector(DarwinReserve.NotListed.selector, address(0xbeef)));
        reserve.quoteExactIn(alice, address(0xbeef), address(fUSD), 1);
    }

    function test_stalePricesStopTrading() public {
        vm.warp(block.timestamp + 2 hours);
        vm.expectRevert();
        reserve.quoteExactIn(alice, address(fUSD), address(fETH), 1e6);
    }

    function test_withdrawNeedsTheAdminsPqcSignature() public {
        uint256 d = block.timestamp + 1 hours;
        bytes memory params = abi.encode(address(fUSD), uint256(1e6), alice);
        bytes memory forged = _sign(curator, reserve.adminMessage("withdraw", params, reserve.adminNonce(), d));
        vm.expectRevert(abi.encodeWithSelector(PqcAuth.BadPqcSignature.selector, admin));
        reserve.withdraw(address(fUSD), 1e6, alice, d, forged);

        reserve.withdraw(address(fUSD), 1e6, alice, d, _adminSig(address(reserve), "withdraw", params, d));
        assertEq(fUSD.balanceOf(alice), 1e6);
    }

    function test_spreadExemptTradersPayNoSpread() public {
        uint256 d = block.timestamp + 1 hours;
        reserve.setSpreadExempt(alice, true, d, _adminSig(address(reserve), "setSpreadExempt", abi.encode(alice, true), d));
        assertEq(reserve.quoteExactIn(alice, address(fUSD), address(fETH), 2_000e6), 1e18);
        assertEq(reserve.quoteExactIn(bob, address(fUSD), address(fETH), 2_000e6), 0.997e18);
    }

    function test_inventoryListsEveryToken() public view {
        (address[] memory list, uint256[] memory bal) = reserve.inventory();
        assertEq(list.length, 4);
        assertEq(bal[0], 1_000_000e6);
    }

    function testFuzz_roundTripNeverProfits(uint256 amount) public {
        amount = bound(amount, 1e6, 100_000e6);
        fUSD.mint(alice, amount);
        vm.startPrank(alice);
        fUSD.approve(address(reserve), type(uint256).max);
        fBTC.approve(address(reserve), type(uint256).max);
        uint256 btc = reserve.swapExactIn(address(fUSD), address(fBTC), amount, 0, alice);
        if (btc > 0) reserve.swapExactIn(address(fBTC), address(fUSD), btc, 0, alice);
        vm.stopPrank();
        assertLe(fUSD.balanceOf(alice), amount);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {DarwinTest} from "./utils/DarwinTest.sol";
import {DarwinBasket} from "../src/DarwinBasket.sol";
import {DarwinRouter} from "../src/DarwinRouter.sol";
import {DarwinAccount} from "../src/account/DarwinAccount.sol";
import {DarwinAccountFactory} from "../src/account/DarwinAccountFactory.sol";
import {PqcAuth} from "../src/pqc/PqcAuth.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @notice A QoreX user who only ever signs messages: its DarwinAccount, controlled by its ML-DSA-87
/// key, buys and sells baskets and withdraws, while whoever submits the messages can change nothing.
contract DarwinAccountTest is DarwinTest {
    DarwinBasket blue;
    DarwinRouter router;
    DarwinAccountFactory factory;
    address dana = makeAddr("dana"); // a QoreX user: an ML-DSA-87 key, nothing else
    address relayer = makeAddr("relayer");
    address acc;

    function setUp() public override {
        super.setUp();
        blue = _blueChip();
        router = new DarwinRouter(IERC20(address(fUSD)), reserve, 30, treasury);
        address[] memory targets = new address[](3);
        (targets[0], targets[1], targets[2]) = (address(router), address(blue), address(fUSD));
        factory = new DarwinAccountFactory(admin, targets);
        _setKey(dana, true);
        acc = factory.accountOf(dana);
        fUSD.mint(acc, 1_000e6); // a deposit lands before the account exists
    }

    function _calls1(address target, bytes memory data) internal pure returns (DarwinAccount.Call[] memory c) {
        c = new DarwinAccount.Call[](1);
        c[0] = DarwinAccount.Call(target, data);
    }

    function _buyCalls(uint256 usd) internal view returns (DarwinAccount.Call[] memory c) {
        c = new DarwinAccount.Call[](2);
        c[0] = DarwinAccount.Call(address(fUSD), abi.encodeCall(IERC20.approve, (address(router), usd)));
        c[1] = DarwinAccount.Call(address(router), abi.encodeCall(DarwinRouter.buy, (blue, usd, 0, acc)));
    }

    /// @dev What QoreX's ML-DSA-87 half signs: the prefix, then the text the account rebuilds.
    function _text(DarwinAccount.Call[] memory calls, string memory summary, uint256 deadline, uint256 n)
        internal
        view
        returns (bytes memory)
    {
        return bytes(
            string.concat(
                "qorechain-msg-v1|qorechain-diana|",
                summary,
                "\n\nDarwin account ",
                vm.toLowercase(vm.toString(acc)),
                "\nnonce ",
                vm.toString(n),
                "\nvalid until ",
                vm.toString(deadline),
                "\ncalls ",
                vm.toString(keccak256(abi.encode(calls)))
            )
        );
    }

    function _run(DarwinAccount.Call[] memory calls, uint256 n) internal {
        uint256 deadline = block.timestamp + 300;
        bytes memory sig = _sign(dana, _text(calls, "Darwin", deadline, n));
        vm.prank(relayer);
        factory.execute(dana, calls, "Darwin", deadline, sig);
    }

    function test_theAddressIsKnownBeforehandAndTheFirstActionCreatesIt() public {
        assertEq(acc.code.length, 0);
        _run(_buyCalls(100e6), 0);
        assertGt(acc.code.length, 0);
        assertEq(DarwinAccount(acc).owner(), dana);
        assertEq(factory.ownerOf(acc), dana);
        assertGt(blue.balanceOf(acc), 0);
    }

    function test_buyThenSellBySignaturesOnly() public {
        _run(_buyCalls(500e6), 0);
        uint256 shares = blue.balanceOf(acc);
        DarwinAccount.Call[] memory c = new DarwinAccount.Call[](2);
        c[0] = DarwinAccount.Call(address(blue), abi.encodeCall(IERC20.approve, (address(router), shares)));
        c[1] = DarwinAccount.Call(address(router), abi.encodeCall(DarwinRouter.sell, (blue, shares, 0, acc)));
        uint256 before = fUSD.balanceOf(acc);
        _run(c, 1);
        assertEq(blue.balanceOf(acc), 0);
        assertGt(fUSD.balanceOf(acc), before + 480e6);
        assertEq(DarwinAccount(acc).nonce(), 2);
    }

    function test_withdrawIsASignedTransfer() public {
        _run(_calls1(address(fUSD), abi.encodeCall(IERC20.transfer, (dana, 250e6))), 0);
        assertEq(fUSD.balanceOf(dana), 250e6);
    }

    function test_aSignatureWorksOnce() public {
        DarwinAccount.Call[] memory c = _buyCalls(100e6);
        uint256 deadline = block.timestamp + 300;
        bytes memory sig = _sign(dana, _text(c, "Darwin", deadline, 0));
        factory.execute(dana, c, "Darwin", deadline, sig);
        vm.expectRevert(abi.encodeWithSelector(PqcAuth.BadPqcSignature.selector, dana));
        factory.execute(dana, c, "Darwin", deadline, sig);
    }

    function test_theSubmitterCannotChangeTheCalls() public {
        DarwinAccount.Call[] memory signed = _calls1(address(fUSD), abi.encodeCall(IERC20.transfer, (dana, 1e6)));
        DarwinAccount.Call[] memory forged = _calls1(address(fUSD), abi.encodeCall(IERC20.transfer, (relayer, 1_000e6)));
        uint256 deadline = block.timestamp + 300;
        bytes memory sig = _sign(dana, _text(signed, "Darwin", deadline, 0));
        vm.expectRevert(abi.encodeWithSelector(PqcAuth.BadPqcSignature.selector, dana));
        factory.execute(dana, forged, "Darwin", deadline, sig);
        // nor the summary the owner read
        vm.expectRevert(abi.encodeWithSelector(PqcAuth.BadPqcSignature.selector, dana));
        factory.execute(dana, signed, "Withdraw nothing", deadline, sig);
    }

    function test_anotherKeyCannotSign() public {
        DarwinAccount.Call[] memory c = _calls1(address(fUSD), abi.encodeCall(IERC20.transfer, (relayer, 1e6)));
        uint256 deadline = block.timestamp + 300;
        bytes memory sig = _sign(relayer, _text(c, "Darwin", deadline, 0));
        vm.expectRevert(abi.encodeWithSelector(PqcAuth.BadPqcSignature.selector, dana));
        factory.execute(dana, c, "Darwin", deadline, sig);
    }

    function test_expiredMessagesAreRefused() public {
        DarwinAccount.Call[] memory c = _buyCalls(1e6);
        uint256 deadline = block.timestamp + 300;
        bytes memory sig = _sign(dana, _text(c, "Darwin", deadline, 0));
        vm.warp(deadline + 1);
        vm.expectRevert(abi.encodeWithSelector(DarwinAccount.Expired.selector, deadline));
        factory.execute(dana, c, "Darwin", deadline, sig);
    }

    function test_onlyDarwinsContractsCanBeCalled() public {
        DarwinAccount.Call[] memory c = _calls1(address(fETH), abi.encodeCall(IERC20.transfer, (dana, 1)));
        uint256 deadline = block.timestamp + 300;
        factory.create(dana);
        bytes memory sig = _sign(dana, _text(c, "Darwin", deadline, 0));
        vm.expectRevert(abi.encodeWithSelector(DarwinAccount.TargetNotAllowed.selector, address(fETH)));
        factory.execute(dana, c, "Darwin", deadline, sig);
    }

    function test_noAccountForAnOwnerWithoutAProvenKey() public {
        address eve = makeAddr("eve");
        vm.expectRevert(abi.encodeWithSelector(DarwinAccountFactory.OwnerNotQuantumSafe.selector, eve));
        factory.create(eve);
        _setKey(eve, false);
        vm.expectRevert(abi.encodeWithSelector(DarwinAccountFactory.OwnerNotQuantumSafe.selector, eve));
        factory.create(eve);
    }

    function test_targetsChangeOnlyWithTheAdminsPqSignature() public {
        uint256 d = block.timestamp + 1 hours;
        bytes memory forged = _sign(curator, factory.adminMessage("setTarget", abi.encode(address(fETH), true), 0, d));
        vm.expectRevert(abi.encodeWithSelector(PqcAuth.BadPqcSignature.selector, admin));
        factory.setTarget(address(fETH), true, d, forged);
        factory.setTarget(address(fETH), true, d, _sign(admin, factory.adminMessage("setTarget", abi.encode(address(fETH), true), 0, d)));
        assertTrue(factory.allowedTarget(address(fETH)));
    }

    function test_createIsIdempotent() public {
        DarwinAccount a = factory.create(dana);
        assertEq(address(factory.create(dana)), address(a));
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {DarwinTest} from "./utils/DarwinTest.sol";
import {DarwinTestToken} from "../src/DarwinTestToken.sol";
import {PqcAuth} from "../src/pqc/PqcAuth.sol";

contract DarwinTestTokenTest is DarwinTest {
    DarwinTestToken fQOR;

    function setUp() public override {
        super.setUp();
        fQOR = new DarwinTestToken("Darwin test QOR", "fQOR", 18, "QOR", admin);
    }

    function _mintSig(address to, uint256 amount, uint256 d, address signer) internal view returns (bytes memory) {
        return _sign(signer, fQOR.adminMessage("mint", abi.encode(to, amount), fQOR.adminNonce(), d));
    }

    function test_metadata() public view {
        assertEq(fQOR.decimals(), 18);
        assertEq(fQOR.tracks(), "QOR");
        assertEq(fQOR.symbol(), "fQOR");
    }

    function test_mintNeedsTheAdminsPqcSignature() public {
        uint256 d = block.timestamp + 1 hours;
        fQOR.mint(alice, 1e24, d, _mintSig(alice, 1e24, d, admin));
        assertEq(fQOR.balanceOf(alice), 1e24);
    }

    function test_mintRefusesAnotherKey() public {
        uint256 d = block.timestamp + 1 hours;
        bytes memory forged = _mintSig(alice, 1e24, d, curator);
        vm.expectRevert(abi.encodeWithSelector(PqcAuth.BadPqcSignature.selector, admin));
        fQOR.mint(alice, 1e24, d, forged);
    }

    function test_aMintSignatureIsBoundToItsAmountAndWorksOnce() public {
        uint256 d = block.timestamp + 1 hours;
        bytes memory sig = _mintSig(alice, 1e18, d, admin);
        vm.expectRevert(abi.encodeWithSelector(PqcAuth.BadPqcSignature.selector, admin));
        fQOR.mint(alice, 1e30, d, sig);
        fQOR.mint(alice, 1e18, d, sig);
        vm.expectRevert(abi.encodeWithSelector(PqcAuth.BadPqcSignature.selector, admin));
        fQOR.mint(alice, 1e18, d, sig);
    }

    function test_theAdminsClassicalKeyAloneCannotMint() public {
        uint256 d = block.timestamp + 1 hours;
        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(PqcAuth.BadPqcSignature.selector, admin));
        fQOR.mint(admin, 1e24, d, hex"00");
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Stand-in for QoreChain's PQC precompiles on Foundry's local EVM, which has none.
/// Etched at 0x...0A01 and 0x...0A02. A signature is valid when it equals
/// keccak256("ok", pubkey, message): enough to test every path of the contracts. The real ML-DSA-87
/// check runs on the testnet (see ops/ and the README).
contract MockPqc {
    struct Key {
        bytes pubkey;
        bool proven;
    }

    mapping(address => Key) internal keys;

    function setKey(address account, bytes calldata pubkey, bool proven) external {
        keys[account] = Key(pubkey, proven);
    }

    function pqcVerify(bytes calldata pubkey, bytes calldata signature, bytes calldata message)
        external
        pure
        returns (bool)
    {
        return keccak256(signature) == keccak256(abi.encodePacked(keccak256(abi.encodePacked("ok", pubkey, message))));
    }

    function pqcKeyStatus(address account) external view returns (bool, uint8, bytes memory, bool) {
        Key memory k = keys[account];
        return (k.pubkey.length != 0, 1, k.pubkey, k.proven);
    }
}

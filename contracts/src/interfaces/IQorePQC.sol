// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title QoreChain post-quantum precompiles
/// @notice Active on the qorechain-diana testnet (governance proposal 21), not on mainnet yet.
///  - 0x...0A01 `pqcVerify`: ML-DSA-87 (FIPS 204) verification, 2592-byte key, 4627-byte signature.
///  - 0x...0A02 `pqcKeyStatus`: the ML-DSA-87 key an account registered on chain.
interface IQorePQC {
    function pqcVerify(bytes calldata pubkey, bytes calldata signature, bytes calldata message)
        external
        view
        returns (bool valid);

    function pqcKeyStatus(address account)
        external
        view
        returns (bool registered, uint8 algorithmId, bytes memory pubkey, bool possessionProven);
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IQorePQC} from "../interfaces/IQorePQC.sol";

/// @title PqcAuth
/// @notice Checks that `account` signed `message` with the ML-DSA-87 key it registered on chain.
/// The key is never stored by Darwin: it is read from QoreChain's key registry on every check, so a
/// key the account rotates on chain is picked up at once, and a key without proof of possession is
/// refused.
library PqcAuth {
    IQorePQC internal constant PQC_VERIFY = IQorePQC(0x0000000000000000000000000000000000000a01);
    IQorePQC internal constant PQC_KEYS = IQorePQC(0x0000000000000000000000000000000000000a02);

    error PqcKeyNotRegistered(address account);
    error PqcKeyNotProven(address account);
    error BadPqcSignature(address account);
    error NotMlDsa87(address account, uint8 algorithmId);

    /// @notice QoreChain's algorithm id for ML-DSA-87 (FIPS 204).
    uint8 internal constant ML_DSA_87 = 1;

    function requireSigned(address account, bytes memory message, bytes calldata signature) internal view {
        (bool registered, uint8 algorithmId, bytes memory pubkey, bool proven) = PQC_KEYS.pqcKeyStatus(account);
        if (!registered || pubkey.length == 0) revert PqcKeyNotRegistered(account);
        // enforced, not assumed: a key registered under another algorithm is refused
        if (algorithmId != ML_DSA_87) revert NotMlDsa87(account, algorithmId);
        if (!proven) revert PqcKeyNotProven(account);
        if (!PQC_VERIFY.pqcVerify(pubkey, signature, message)) revert BadPqcSignature(account);
    }
}

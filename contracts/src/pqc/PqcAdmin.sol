// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {PqcAuth} from "./PqcAuth.sol";

/// @title PqcAdmin
/// @notice Admin powers that only a post-quantum signature can use.
/// @dev The admin is a QoreChain account, not a msg.sender check: every admin action carries an
/// ML-DSA-87 signature of the admin over a domain-separated message (chain id, contract, action,
/// nonce, deadline, parameters). Anyone may relay it. A stolen secp256k1 key of the admin cannot
/// change anything here.
abstract contract PqcAdmin {
    /// @notice The account whose registered ML-DSA-87 key authorises admin actions.
    address public admin;
    /// @notice Increases with every admin action, so a signature works once.
    uint256 public adminNonce;

    event AdminAction(bytes32 indexed action, uint256 indexed nonce, address relayer);
    event AdminChanged(address indexed previousAdmin, address indexed newAdmin);

    error Expired(uint256 deadline);
    error ZeroAddress();

    constructor(address admin_) {
        if (admin_ == address(0)) revert ZeroAddress();
        admin = admin_;
        emit AdminChanged(address(0), admin_);
    }

    /// @notice The exact bytes the admin signs for `action` with `params`.
    function adminMessage(bytes32 action, bytes memory params, uint256 nonce, uint256 deadline)
        public
        view
        returns (bytes memory)
    {
        return abi.encodePacked(
            "Darwin:admin:v1", block.chainid, address(this), action, nonce, deadline, keccak256(params)
        );
    }

    function _authorizeAdmin(bytes32 action, bytes memory params, uint256 deadline, bytes calldata signature)
        internal
    {
        if (block.timestamp > deadline) revert Expired(deadline);
        uint256 n = adminNonce;
        PqcAuth.requireSigned(admin, adminMessage(action, params, n, deadline), signature);
        adminNonce = n + 1;
        emit AdminAction(action, n, msg.sender);
    }

    /// @notice Hand the admin role to another account. Signed by the current admin.
    function setAdmin(address newAdmin, uint256 deadline, bytes calldata signature) external {
        if (newAdmin == address(0)) revert ZeroAddress();
        _authorizeAdmin("setAdmin", abi.encode(newAdmin), deadline, signature);
        emit AdminChanged(admin, newAdmin);
        admin = newAdmin;
    }
}

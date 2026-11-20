// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Create2} from "@openzeppelin/contracts/utils/Create2.sol";
import {PqcAdmin} from "../pqc/PqcAdmin.sol";
import {PqcAuth} from "../pqc/PqcAuth.sol";
import {DarwinAccount} from "./DarwinAccount.sol";

/// @title DarwinAccountFactory
/// @notice Deploys each QoreX user's DarwinAccount at an address fixed by the owner alone (CREATE2),
/// so the app knows it before it exists, and creates it with the first action. It deploys one only
/// for an owner whose ML-DSA-87 key is registered with proof of possession. The list of contracts
/// an account may call changes only with the admin's ML-DSA-87 signature.
contract DarwinAccountFactory is PqcAdmin {
    mapping(address target => bool) public allowedTarget;
    mapping(address account => address owner) public ownerOf;

    event AccountCreated(address indexed owner, address indexed account);
    event TargetSet(address indexed target, bool allowed);

    error OwnerNotQuantumSafe(address owner);

    constructor(address admin_, address[] memory targets) PqcAdmin(admin_) {
        for (uint256 i; i < targets.length; ++i) {
            allowedTarget[targets[i]] = true;
            emit TargetSet(targets[i], true);
        }
    }

    function accountOf(address owner) public view returns (address) {
        return Create2.computeAddress(
            bytes32(uint256(uint160(owner))), keccak256(abi.encodePacked(type(DarwinAccount).creationCode, abi.encode(owner)))
        );
    }

    /// @notice The owner's account, deployed if it is not yet. Anyone may call it.
    function create(address owner) public returns (DarwinAccount account) {
        address a = accountOf(owner);
        if (a.code.length != 0) return DarwinAccount(a);
        if (!PqcAuth.isQuantumSafe(owner)) revert OwnerNotQuantumSafe(owner);
        account = new DarwinAccount{salt: bytes32(uint256(uint160(owner)))}(owner);
        ownerOf[address(account)] = owner;
        emit AccountCreated(owner, address(account));
    }

    /// @notice The owner's signed calls, creating the account on its first action. The relayer always
    /// comes through here, so its own EVM window can be scoped to this one contract.
    function execute(
        address owner,
        DarwinAccount.Call[] calldata calls,
        string calldata summary,
        uint256 deadline,
        bytes calldata pqSignature
    ) external {
        create(owner).execute(calls, summary, deadline, pqSignature);
    }

    /// @notice Allow or forbid a target. Signed by the admin's ML-DSA-87 key.
    function setTarget(address target, bool allowed, uint256 deadline, bytes calldata signature) external {
        _authorizeAdmin("setTarget", abi.encode(target, allowed), deadline, signature);
        allowedTarget[target] = allowed;
        emit TargetSet(target, allowed);
    }
}

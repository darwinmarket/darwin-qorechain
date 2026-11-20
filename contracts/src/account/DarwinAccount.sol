// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {PqcAuth} from "../pqc/PqcAuth.sol";

interface IDarwinAccountFactory {
    function allowedTarget(address target) external view returns (bool);
}

/// @title DarwinAccount
/// @notice A QoreX user's Darwin account, controlled by one thing only: the ML-DSA-87 key its owner
/// registered on QoreChain. The owner signs a plain-text message in QoreX (`signArbitrary`); anyone
/// may submit it, and this contract checks the signature on chain with `pqcVerify` against the
/// owner's key, read live from `pqcKeyStatus`, before it makes the calls. No EVM window, no authz
/// grant and no gas for the owner: the submitter pays, and can do nothing the owner did not sign.
/// @dev The signed bytes are exactly what QoreX's ML-DSA-87 half signs for
/// `signArbitrary("qorechain-diana", owner, text)`: "qorechain-msg-v1|qorechain-diana|" ‖ text, with
/// text = summary ‖ "\n\nDarwin account " ‖ this ‖ "\nnonce " ‖ nonce ‖ "\nvalid until " ‖ deadline
///        ‖ "\ncalls " ‖ keccak256(abi.encode(calls)).
/// The nonce makes each message single use, the account address and the chain id bind it to this
/// account on this chain, and the calls hash binds every target and every byte of calldata. Targets
/// are Darwin's router, baskets and fUSD only (the factory's list, changed by the PQ admin).
/// Same design as Agama's PqAccount (QoreChain fest, same team).
contract DarwinAccount {
    struct Call {
        address target;
        bytes data;
    }

    /// @notice The QoreChain account (its 0x form) whose ML-DSA-87 key controls this one.
    address public immutable owner;
    IDarwinAccountFactory public immutable factory;
    /// @notice QoreChain's message-signing domain and chain id, as QoreX prefixes them.
    string public constant PREFIX = "qorechain-msg-v1|qorechain-diana|";
    uint256 public nonce;

    event Executed(uint256 indexed nonce, bytes32 indexed callsHash, address indexed submitter, uint256 calls);

    error Expired(uint256 deadline);
    error TargetNotAllowed(address target);
    error CallFailed(uint256 index, bytes reason);
    error NoCalls();

    constructor(address owner_) {
        owner = owner_;
        factory = IDarwinAccountFactory(msg.sender);
    }

    /// @notice The exact text the owner signs for `calls` at the current nonce.
    function textFor(Call[] calldata calls, string calldata summary, uint256 deadline) public view returns (string memory) {
        return string.concat(
            summary,
            "\n\nDarwin account ",
            Strings.toHexString(address(this)),
            "\nnonce ",
            Strings.toString(nonce),
            "\nvalid until ",
            Strings.toString(deadline),
            "\ncalls ",
            Strings.toHexString(uint256(keccak256(abi.encode(calls))), 32)
        );
    }

    function execute(Call[] calldata calls, string calldata summary, uint256 deadline, bytes calldata pqSignature) external {
        if (calls.length == 0) revert NoCalls();
        if (block.timestamp > deadline) revert Expired(deadline);
        PqcAuth.requireSigned(owner, bytes(string.concat(PREFIX, textFor(calls, summary, deadline))), pqSignature);
        uint256 n = nonce++;
        for (uint256 i; i < calls.length; ++i) {
            if (!factory.allowedTarget(calls[i].target)) revert TargetNotAllowed(calls[i].target);
            (bool ok, bytes memory ret) = calls[i].target.call(calls[i].data);
            if (!ok) revert CallFailed(i, ret);
        }
        emit Executed(n, keccak256(abi.encode(calls)), msg.sender, calls.length);
    }
}

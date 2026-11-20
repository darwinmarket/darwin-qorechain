// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {PqcAdmin} from "./pqc/PqcAdmin.sol";

/// @title DarwinTestToken
/// @notice A testnet stand-in that tracks a real asset's price, as the fest's fBTC and fETH track
/// BTC and ETH: fQOR tracks QOR, fQWAKK tracks QWAKK. Darwin's oracle prices it with the real
/// asset's feed (QOR at its market price, QWAKK from its native AMM pool).
///
/// Why: at QOR's market price a faucet claim is worth about $0.33 and QWAKK's whole market about
/// $330, so baskets holding the real tokens could only take buys of tens of dollars (see
/// docs/PRICING.md). The stand-ins let the QOR baskets take real-size trades on the testnet.
///
/// Even here supply is post-quantum: only an ML-DSA-87 signature of the admin can mint.
contract DarwinTestToken is ERC20, PqcAdmin {
    uint8 private immutable _decimals;
    /// @notice The real asset this token stands in for, e.g. "QOR".
    string public tracks;

    event Minted(address indexed to, uint256 amount);

    constructor(string memory name_, string memory symbol_, uint8 decimals_, string memory tracks_, address admin_)
        ERC20(name_, symbol_)
        PqcAdmin(admin_)
    {
        _decimals = decimals_;
        tracks = tracks_;
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    /// @notice Mint `amount` to `to`, authorised by the admin's ML-DSA-87 signature.
    function mint(address to, uint256 amount, uint256 deadline, bytes calldata signature) external {
        if (to == address(0)) revert ZeroAddress();
        _authorizeAdmin("mint", abi.encode(to, amount), deadline, signature);
        _mint(to, amount);
        emit Minted(to, amount);
    }
}

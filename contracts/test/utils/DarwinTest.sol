// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {MockPqc} from "./MockPqc.sol";
import {MockERC20} from "./MockERC20.sol";
import {DarwinOracle} from "../../src/DarwinOracle.sol";
import {DarwinReserve} from "../../src/DarwinReserve.sol";
import {DarwinBasket} from "../../src/DarwinBasket.sol";
import {DarwinRouter} from "../../src/DarwinRouter.sol";

/// @notice Shared fixture: mock precompiles, Fest-like tokens, an oracle with BTC/ETH/USD/QOR,
/// a reserve with inventory and helpers that produce the mock post-quantum signatures.
abstract contract DarwinTest is Test {
    address constant PQC_VERIFY = 0x0000000000000000000000000000000000000a01;
    address constant PQC_KEYS = 0x0000000000000000000000000000000000000a02;

    uint16 constant USD = 1;
    uint16 constant ETH = 2;
    uint16 constant BTC = 3;
    uint16 constant QOR = 4;

    address admin = makeAddr("admin");
    address reporter = makeAddr("reporter");
    address curator = makeAddr("curator");
    address guardian = makeAddr("guardian");
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");
    address treasury = makeAddr("treasury");

    MockERC20 fUSD;
    MockERC20 fETH;
    MockERC20 fBTC;
    MockERC20 wQOR;
    DarwinOracle oracle;
    DarwinReserve reserve;

    function setUp() public virtual {
        vm.warp(1_800_000_000);
        MockPqc impl = new MockPqc();
        vm.etch(PQC_VERIFY, address(impl).code);
        vm.etch(PQC_KEYS, address(impl).code);
        _setKey(admin, true);
        _setKey(reporter, true);
        _setKey(curator, true);

        fUSD = new MockERC20("FestUSD", "fUSD", 6);
        fETH = new MockERC20("FestETH", "fETH", 18);
        fBTC = new MockERC20("FestBTC", "fBTC", 8);
        wQOR = new MockERC20("Wrapped QOR", "WQOR", 18);

        oracle = new DarwinOracle(admin, reporter, 1 hours, 2_500);
        _addFeed(USD, "USD/USD", address(fUSD));
        _addFeed(ETH, "ETH/USD", address(fETH));
        _addFeed(BTC, "BTC/USD", address(fBTC));
        _addFeed(QOR, "QOR/USD", address(wQOR));
        _pushPrices(1e18, 2_000e18, 60_000e18, 0.05e18);

        reserve = new DarwinReserve(admin, oracle, 30);
        _list(address(fUSD));
        _list(address(fETH));
        _list(address(fBTC));
        _list(address(wQOR));
        fUSD.mint(address(reserve), 1_000_000e6);
        fETH.mint(address(reserve), 500e18);
        fBTC.mint(address(reserve), 20e8);
        wQOR.mint(address(reserve), 20_000_000e18);
    }

    // ---- mock post-quantum keys and signatures ----

    function _key(address account) internal pure returns (bytes memory) {
        return abi.encodePacked("mldsa87:", account);
    }

    function _setKey(address account, bool proven) internal {
        MockPqc(PQC_KEYS).setKey(account, _key(account), proven);
    }

    function _sign(address account, bytes memory message) internal pure returns (bytes memory) {
        return abi.encodePacked(keccak256(abi.encodePacked("ok", _key(account), message)));
    }

    // ---- oracle helpers ----

    function _adminSig(address target, bytes32 action, bytes memory params, uint256 deadline)
        internal
        view
        returns (bytes memory)
    {
        uint256 nonce = DarwinOracle(target).adminNonce();
        return _sign(admin, DarwinOracle(target).adminMessage(action, params, nonce, deadline));
    }

    function _addFeed(uint16 id, string memory name, address token) internal {
        uint256 d = block.timestamp + 1 hours;
        oracle.addFeed(id, name, d, _adminSig(address(oracle), "addFeed", abi.encode(id, name), d));
        oracle.setTokenFeed(token, id, d, _adminSig(address(oracle), "setTokenFeed", abi.encode(token, id), d));
    }

    function _round(uint128 usd, uint128 eth, uint128 btc, uint128 qor)
        internal
        view
        returns (uint64 ts, uint16[] memory ids, uint128[] memory prices, bytes memory sig)
    {
        ts = uint64(block.timestamp);
        ids = new uint16[](4);
        prices = new uint128[](4);
        (ids[0], ids[1], ids[2], ids[3]) = (USD, ETH, BTC, QOR);
        (prices[0], prices[1], prices[2], prices[3]) = (usd, eth, btc, qor);
        sig = _sign(reporter, oracle.roundMessage(oracle.round() + 1, ts, ids, prices));
    }

    function _pushPrices(uint128 usd, uint128 eth, uint128 btc, uint128 qor) internal {
        // rounds are at least MIN_ROUND_INTERVAL apart
        if (oracle.lastTimestamp() + oracle.MIN_ROUND_INTERVAL() > block.timestamp) vm.warp(oracle.lastTimestamp() + oracle.MIN_ROUND_INTERVAL());
        (uint64 ts, uint16[] memory ids, uint128[] memory prices, bytes memory sig) = _round(usd, eth, btc, qor);
        oracle.submit(ts, ids, prices, sig);
    }

    function _list(address token) internal {
        uint256 d = block.timestamp + 1 hours;
        reserve.listToken(token, true, d, _adminSig(address(reserve), "listToken", abi.encode(token, true), d));
    }

    // ---- basket helpers ----

    function _blueChip() internal returns (DarwinBasket basket) {
        address[] memory comps = new address[](2);
        uint16[] memory w = new uint16[](2);
        (comps[0], comps[1]) = (address(fBTC), address(fETH));
        (w[0], w[1]) = (5_000, 5_000);
        basket = new DarwinBasket(
            "Darwin Blue Chip", "BLUEDW", "50% BTC, 50% ETH", oracle, reserve, admin, curator, guardian, comps, w
        );
        // Seed at NAV 100 USD per share: 1 share = 0.000833.. BTC (50 USD) + 0.025 ETH (50 USD).
        uint256[] memory amounts = new uint256[](2);
        (amounts[0], amounts[1]) = (8_333_334, 2.5e18); // 0.08333334 BTC + 2.5 ETH for 100 shares
        fBTC.mint(address(this), amounts[0]);
        fETH.mint(address(this), amounts[1]);
        fBTC.approve(address(basket), amounts[0]);
        fETH.approve(address(basket), amounts[1]);
        basket.seed(amounts, 100e18, address(this));
    }

    function _balanced() internal returns (DarwinBasket basket) {
        address[] memory comps = new address[](3);
        uint16[] memory w = new uint16[](3);
        (comps[0], comps[1], comps[2]) = (address(fBTC), address(fETH), address(fUSD));
        (w[0], w[1], w[2]) = (3_500, 3_500, 3_000);
        basket = new DarwinBasket(
            "Darwin Balanced", "BALDW", "35% BTC, 35% ETH, 30% USD", oracle, reserve, admin, curator, guardian, comps, w
        );
        uint256[] memory amounts = new uint256[](3);
        (amounts[0], amounts[1], amounts[2]) = (5_833_334, 1.75e18, 3_000e6); // 3,500 + 3,500 + 3,000 USD
        fBTC.mint(address(this), amounts[0]);
        fETH.mint(address(this), amounts[1]);
        fUSD.mint(address(this), amounts[2]);
        fBTC.approve(address(basket), amounts[0]);
        fETH.approve(address(basket), amounts[1]);
        fUSD.approve(address(basket), amounts[2]);
        basket.seed(amounts, 100e18, address(this));
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {PqcAuth} from "./pqc/PqcAuth.sol";
import {PqcAdmin} from "./pqc/PqcAdmin.sol";

/// @title DarwinOracle
/// @notice USD prices for Darwin's basket components. Every price round is signed with the
/// reporter's ML-DSA-87 key and verified on chain by the pqcVerify precompile before a single price
/// is stored. Anyone may relay a signed round; what authorises it is the post-quantum signature,
/// never the sender.
/// @dev Prices are USD with 18 decimals. A round must be the next round number, carry a timestamp
/// newer than the last round and not in the future, and move no price by more than
/// `maxDeviationBps` (a circuit breaker against a compromised or broken reporter).
contract DarwinOracle is PqcAdmin {
    struct Feed {
        uint128 price; // USD, 18 decimals
        uint64 updatedAt; // the round's timestamp
        uint64 round;
    }

    /// @notice The account whose registered ML-DSA-87 key signs price rounds.
    address public reporter;
    /// @notice The last accepted round number (0 before the first round).
    uint64 public round;
    /// @notice The timestamp carried by the last accepted round.
    uint64 public lastTimestamp;
    /// @notice A price older than this is refused by `priceOf` and `priceOfToken`.
    uint32 public maxAge;
    /// @notice The largest move of one price between two rounds, in basis points.
    uint16 public maxDeviationBps;
    /// @notice How far ahead of the block a round's timestamp may be.
    uint32 public constant MAX_FUTURE_SKEW = 120;
    /// @notice Rounds are at least this far apart, so the per-round circuit breaker bounds how fast
    /// a price can move over time, not only within one round.
    uint32 public constant MIN_ROUND_INTERVAL = 60;

    mapping(uint16 => Feed) internal feeds;
    /// @notice The feed that prices a token (0 = none).
    mapping(address => uint16) public feedOfToken;
    /// @notice The human name of a feed, e.g. "BTC/USD".
    mapping(uint16 => string) public feedName;
    uint16[] internal feedList;

    event RoundSubmitted(uint64 indexed round, uint64 timestamp, uint256 feeds, address relayer);
    event PriceUpdated(uint16 indexed feedId, uint256 price, uint64 indexed round);
    event FeedAdded(uint16 indexed feedId, string name);
    event TokenFeedSet(address indexed token, uint16 indexed feedId);
    event ReporterChanged(address indexed previous, address indexed next);
    event ParamsChanged(uint32 maxAge, uint16 maxDeviationBps);

    error LengthMismatch();
    error EmptyRound();
    error TooSoon(uint64 timestamp, uint64 earliest);
    error FeedsNotSorted(uint16 feedId);
    error StaleRound(uint64 timestamp, uint64 lastTimestamp);
    error FutureRound(uint64 timestamp);
    error UnknownFeed(uint16 feedId);
    error ZeroPrice(uint16 feedId);
    error DeviationTooLarge(uint16 feedId, uint256 previous, uint256 next);
    error PriceStale(uint16 feedId, uint64 updatedAt);
    error NoFeed(address token);
    error BadParams();

    constructor(address admin_, address reporter_, uint32 maxAge_, uint16 maxDeviationBps_) PqcAdmin(admin_) {
        if (reporter_ == address(0)) revert ZeroAddress();
        if (maxAge_ == 0 || maxDeviationBps_ == 0 || maxDeviationBps_ > 10_000) revert BadParams();
        reporter = reporter_;
        maxAge = maxAge_;
        maxDeviationBps = maxDeviationBps_;
        emit ReporterChanged(address(0), reporter_);
        emit ParamsChanged(maxAge_, maxDeviationBps_);
    }

    // ---------------------------------------------------------------------------------------------
    // Rounds
    // ---------------------------------------------------------------------------------------------

    /// @notice The exact bytes the reporter signs for a round.
    function roundMessage(uint64 round_, uint64 timestamp, uint16[] calldata ids, uint128[] calldata prices)
        public
        view
        returns (bytes memory)
    {
        return abi.encodePacked(
            "DarwinOracle:round:v1",
            block.chainid,
            address(this),
            keccak256(abi.encode(round_, timestamp, ids, prices))
        );
    }

    /// @notice Store a round of prices signed by the reporter's ML-DSA-87 key.
    function submit(uint64 timestamp, uint16[] calldata ids, uint128[] calldata prices, bytes calldata signature)
        external
    {
        uint256 n = ids.length;
        if (n == 0) revert EmptyRound();
        if (n != prices.length) revert LengthMismatch();
        if (timestamp <= lastTimestamp) revert StaleRound(timestamp, lastTimestamp);
        if (lastTimestamp != 0 && timestamp < lastTimestamp + MIN_ROUND_INTERVAL) {
            revert TooSoon(timestamp, lastTimestamp + MIN_ROUND_INTERVAL);
        }
        if (timestamp > block.timestamp + MAX_FUTURE_SKEW) revert FutureRound(timestamp);

        uint64 r = round + 1;
        PqcAuth.requireSigned(reporter, roundMessage(r, timestamp, ids, prices), signature);

        uint16 maxDev = maxDeviationBps;
        for (uint256 i; i < n; ++i) {
            uint16 id = ids[i];
            // strictly increasing ids: a feed appears at most once per round, so the breaker cannot
            // be chained within a round (ids [BTC, BTC, ...] each +15%)
            if (i != 0 && id <= ids[i - 1]) revert FeedsNotSorted(id);
            uint128 p = prices[i];
            if (bytes(feedName[id]).length == 0) revert UnknownFeed(id);
            if (p == 0) revert ZeroPrice(id);
            Feed storage f = feeds[id];
            uint256 prev = f.price;
            if (prev != 0) {
                uint256 diff = p > prev ? p - prev : prev - p;
                if (diff * 10_000 > prev * maxDev) revert DeviationTooLarge(id, prev, p);
            }
            f.price = p;
            f.updatedAt = timestamp;
            f.round = r;
            emit PriceUpdated(id, p, r);
        }
        round = r;
        lastTimestamp = timestamp;
        emit RoundSubmitted(r, timestamp, n, msg.sender);
    }

    // ---------------------------------------------------------------------------------------------
    // Reads
    // ---------------------------------------------------------------------------------------------

    /// @notice The fresh price of a feed (USD, 18 decimals). Reverts if missing or stale.
    function priceOf(uint16 feedId) public view returns (uint256) {
        Feed memory f = feeds[feedId];
        if (f.price == 0) revert UnknownFeed(feedId);
        if (block.timestamp > uint256(f.updatedAt) + maxAge) revert PriceStale(feedId, f.updatedAt);
        return f.price;
    }

    /// @notice The fresh USD price (18 decimals) of one whole unit of `token`.
    function priceOfToken(address token) external view returns (uint256) {
        uint16 id = feedOfToken[token];
        if (id == 0) revert NoFeed(token);
        return priceOf(id);
    }

    /// @notice A feed's last value without the freshness check, for display.
    function latest(uint16 feedId) external view returns (uint256 price, uint64 updatedAt, uint64 round_) {
        Feed memory f = feeds[feedId];
        return (f.price, f.updatedAt, f.round);
    }

    function feedIds() external view returns (uint16[] memory) {
        return feedList;
    }

    function isFresh(uint16 feedId) external view returns (bool) {
        Feed memory f = feeds[feedId];
        return f.price != 0 && block.timestamp <= uint256(f.updatedAt) + maxAge;
    }

    // ---------------------------------------------------------------------------------------------
    // Admin (ML-DSA-87 signed)
    // ---------------------------------------------------------------------------------------------

    function addFeed(uint16 feedId, string calldata name, uint256 deadline, bytes calldata signature) external {
        if (feedId == 0 || bytes(name).length == 0 || bytes(feedName[feedId]).length != 0) revert BadParams();
        _authorizeAdmin("addFeed", abi.encode(feedId, name), deadline, signature);
        feedName[feedId] = name;
        feedList.push(feedId);
        emit FeedAdded(feedId, name);
    }

    function setTokenFeed(address token, uint16 feedId, uint256 deadline, bytes calldata signature) external {
        if (token == address(0)) revert ZeroAddress();
        if (feedId != 0 && bytes(feedName[feedId]).length == 0) revert UnknownFeed(feedId);
        _authorizeAdmin("setTokenFeed", abi.encode(token, feedId), deadline, signature);
        feedOfToken[token] = feedId;
        emit TokenFeedSet(token, feedId);
    }

    function setReporter(address next, uint256 deadline, bytes calldata signature) external {
        if (next == address(0)) revert ZeroAddress();
        _authorizeAdmin("setReporter", abi.encode(next), deadline, signature);
        emit ReporterChanged(reporter, next);
        reporter = next;
    }

    function setParams(uint32 maxAge_, uint16 maxDeviationBps_, uint256 deadline, bytes calldata signature)
        external
    {
        if (maxAge_ == 0 || maxDeviationBps_ == 0 || maxDeviationBps_ > 10_000) revert BadParams();
        _authorizeAdmin("setParams", abi.encode(maxAge_, maxDeviationBps_), deadline, signature);
        maxAge = maxAge_;
        maxDeviationBps = maxDeviationBps_;
        emit ParamsChanged(maxAge_, maxDeviationBps_);
    }
}

import { parseAbi } from "viem";

export const erc20Abi = parseAbi([
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function totalSupply() view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
]);

export const basketAbi = parseAbi([
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function description() view returns (string)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function nav() view returns (uint256)",
  "function navPerShare() view returns (uint256)",
  "function mintPaused() view returns (bool)",
  "function curator() view returns (address)",
  "function curatorNonce() view returns (uint256)",
  "function maxRebalanceLossBps() view returns (uint16)",
  "function composition() view returns (address[] tokens, uint16[] targets, uint256[] balances, uint256[] values, uint16[] weights)",
  "function redeemAmounts(uint256 shares) view returns (uint256[])",
  "function mintAmounts(uint256 shares) view returns (uint256[])",
  "function redeem(uint256 shares, address to) returns (uint256[])",
  "event Rebalanced(uint256 indexed nonce, uint256 trades, uint256 navBefore, uint256 navAfter, address relayer)",
  "event TargetWeightsChanged(uint256 indexed nonce, uint16[] weights)",
  "event Minted(address indexed caller, address indexed to, uint256 shares, uint256[] amounts)",
  "event Redeemed(address indexed owner, address indexed to, uint256 shares, uint256[] amounts)",
]);

export const oracleAbi = parseAbi([
  "function round() view returns (uint64)",
  "function lastTimestamp() view returns (uint64)",
  "function reporter() view returns (address)",
  "function maxAge() view returns (uint32)",
  "function maxDeviationBps() view returns (uint16)",
  "function latest(uint16 feedId) view returns (uint256 price, uint64 updatedAt, uint64 round)",
  "event RoundSubmitted(uint64 indexed round, uint64 timestamp, uint256 feeds, address relayer)",
]);

export const routerAbi = parseAbi([
  "function quoteBuy(address basket, uint256 usdIn) view returns (uint256 shares, uint256 fee)",
  "function quoteSell(address basket, uint256 shares) view returns (uint256 usdOut, uint256 fee)",
  "function buy(address basket, uint256 usdIn, uint256 minShares, address to) returns (uint256)",
  "function sell(address basket, uint256 shares, uint256 minUsdOut, address to) returns (uint256)",
  "function feeBps() view returns (uint16)",
  "event Bought(address indexed trader, address indexed basket, uint256 usdIn, uint256 fee, uint256 shares, address to)",
  "event Sold(address indexed trader, address indexed basket, uint256 shares, uint256 usdOut, uint256 fee, address to)",
]);

export const reserveAbi = parseAbi([
  "function inventory() view returns (address[] list, uint256[] balances)",
  "function spreadBps() view returns (uint16)",
  "function valueOf(address token, uint256 amount) view returns (uint256)",
]);

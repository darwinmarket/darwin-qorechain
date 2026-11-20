// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {DarwinTest} from "../utils/DarwinTest.sol";
import {MockERC20} from "../utils/MockERC20.sol";
import {DarwinBasket} from "../../src/DarwinBasket.sol";
import {DarwinRouter} from "../../src/DarwinRouter.sol";
import {DarwinReserve} from "../../src/DarwinReserve.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Test} from "forge-std/Test.sol";

/// Random users mint in kind, redeem in kind, buy and sell through the router, at fixed prices.
contract BasketHandler is Test {
    DarwinBasket public basket;
    DarwinRouter public router;
    MockERC20 public fUSD;
    MockERC20[] public comps;
    address[] public actors;

    uint256 public ghostMints;
    uint256 public ghostRedeems;
    uint256 public ghostBuys;
    uint256 public ghostSells;
    uint256 public ghostUnexpectedSellFailures;

    constructor(DarwinBasket basket_, DarwinRouter router_, MockERC20 fUSD_, MockERC20[] memory comps_) {
        basket = basket_;
        router = router_;
        fUSD = fUSD_;
        comps = comps_;
        for (uint256 i; i < 4; ++i) {
            actors.push(makeAddr(string(abi.encodePacked("actor", vm.toString(i)))));
        }
    }

    function _actor(uint256 seed) internal view returns (address) {
        return actors[seed % actors.length];
    }

    function mint(uint256 seed, uint256 shares) external {
        shares = bound(shares, 1, 50e18);
        address a = _actor(seed);
        uint256[] memory need = basket.mintAmounts(shares);
        vm.startPrank(a);
        for (uint256 i; i < comps.length; ++i) {
            comps[i].mint(a, need[i]);
            comps[i].approve(address(basket), need[i]);
        }
        basket.mint(shares, a);
        vm.stopPrank();
        ghostMints++;
    }

    function redeem(uint256 seed, uint256 frac) external {
        address a = _actor(seed);
        uint256 held = basket.balanceOf(a);
        if (held == 0) return;
        uint256 shares = bound(frac, 1, held);
        vm.prank(a);
        basket.redeem(shares, a);
        ghostRedeems++;
    }

    function buy(uint256 seed, uint256 usdIn) external {
        usdIn = bound(usdIn, 1e6, 2_000e6);
        address a = _actor(seed);
        fUSD.mint(a, usdIn);
        vm.startPrank(a);
        fUSD.approve(address(router), usdIn);
        router.buy(basket, usdIn, 0, a);
        vm.stopPrank();
        ghostBuys++;
    }

    function sell(uint256 seed, uint256 frac) external {
        address a = _actor(seed);
        uint256 held = basket.balanceOf(a);
        if (held == 0) return;
        uint256 shares = bound(frac, 1, held);
        vm.startPrank(a);
        IERC20(address(basket)).approve(address(router), shares);
        try router.sell(basket, shares, 0, a) {
            ghostSells++;
        } catch (bytes memory err) {
            bytes4 sel = bytes4(err);
            // counted, not swallowed: only an empty reserve or a dust sale may refuse a sell
            if (
                sel != DarwinReserve.InsufficientInventory.selector && sel != DarwinRouter.TooSmall.selector
                    && sel != DarwinRouter.ZeroAmount.selector && sel != DarwinReserve.ZeroAmount.selector
            ) ghostUnexpectedSellFailures++;
        }
        vm.stopPrank();
    }

    function actorCount() external view returns (uint256) {
        return actors.length;
    }
}

contract BasketInvariantsTest is DarwinTest {
    DarwinBasket bal;
    DarwinRouter router;
    BasketHandler handler;
    uint256 navAtStart;

    function setUp() public override {
        super.setUp();
        bal = _balanced();
        router = new DarwinRouter(IERC20(address(fUSD)), reserve, 30, treasury);
        MockERC20[] memory comps = new MockERC20[](3);
        (comps[0], comps[1], comps[2]) = (fBTC, fETH, fUSD);
        handler = new BasketHandler(bal, router, fUSD, comps);
        navAtStart = bal.navPerShare();
        targetContract(address(handler));
    }

    /// Shares are always fully backed: redeeming every share pays out at most what the vault holds.
    function invariant_fullyBacked() public view {
        uint256[] memory all = bal.redeemAmounts(bal.totalSupply());
        address[] memory c = bal.components();
        for (uint256 i; i < c.length; ++i) {
            assertLe(all[i], IERC20(c[i]).balanceOf(address(bal)));
        }
    }

    /// Rounding always favours the vault: at fixed prices, NAV per share never drops.
    function invariant_navPerShareNeverDrops() public view {
        if (bal.totalSupply() == 0) return;
        assertGe(bal.navPerShare() + 1, navAtStart);
    }

    /// A sell through the router was only ever refused for an empty reserve or dust.
    function invariant_sellsFailOnlyForKnownReasons() public view {
        assertEq(handler.ghostUnexpectedSellFailures(), 0);
    }

    /// The router never keeps anything between transactions.
    function invariant_routerHoldsNothing() public view {
        assertEq(fUSD.balanceOf(address(router)), 0);
        assertEq(fBTC.balanceOf(address(router)), 0);
        assertEq(fETH.balanceOf(address(router)), 0);
        assertEq(bal.balanceOf(address(router)), 0);
    }

    /// Weights reported by composition() always sum to (about) 100%.
    function invariant_weightsSumTo100() public view {
        (,,,, uint16[] memory w) = bal.composition();
        uint256 sum;
        for (uint256 i; i < w.length; ++i) {
            sum += w[i];
        }
        assertApproxEqAbs(sum, 10_000, w.length);
    }

    function afterInvariant() external view {
        // the handler must actually have exercised the paths
        assertGt(handler.ghostMints() + handler.ghostBuys(), 0);
    }
}

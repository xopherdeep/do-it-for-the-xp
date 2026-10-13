import { createMemoryHistory, createRouter } from "vue-router";
import type { RouteRecordRaw } from "vue-router";
import { parentOf, WORLD_PAGES, worldPageOf } from "@/router/parentOf";
import { GameMasterRoutes } from "@/router/Admin";
import { HometownRoutes, MyHomeRoutes, MyPortalRoutes, UserHudRoutes } from "@/router/Console";
import { ProRoutes, SettingsRoutes, SideMenuRoutes, SupportRoutes } from "@/router/SideMenu";
import DevRoutes from "@/router/Dev/dev.routes";
import { WORLD_REGIONS } from "@/app/Console/BattleField/battle/battleContext";
import { SHOP_METADATA } from "@/lib/engine/core/shopRegistry";
import { TEMPLE_METADATA } from "@/lib/engine/temples/templeRegistry";
import { MERCHANT_WORLDS, merchantWorldOn } from "@/lib/services/shops/travelingMerchant";

// The user store (and everything it reaches) is not what these specs are about: the route table only needs
// it to exist when my-portal's guard is declared.
jest.mock("@/lib/store/stores/user", () => ({ useUserStore: jest.fn() }));

const HERO = "hero-1";
const route = (name: string, path: string, params: Record<string, string> = {}) => ({ name, path, params });

describe("parentOf: heroes' pages", () => {
  it("sends a shop to the world it stands in", () => {
    const shop = (merchant: string) => parentOf(route("shop", `/shop/${merchant}/${HERO}`, { merchant, userId: HERO }));
    expect(shop("wrecked-ship")).toBe(`/my-portal/${HERO}/islands`);
    expect(shop("pegasus-ranch")).toBe(`/my-portal/${HERO}/plains`);
    expect(shop("pond-of-life")).toBe(`/my-portal/${HERO}/sands`);
    expect(shop("snow-shack")).toBe(`/my-portal/${HERO}/world-ice`);
    expect(shop("theia-city")).toBe(`/my-portal/${HERO}/the-moon`);
  });

  it("sends the Hometown market, and a shop nobody has heard of, to Home Town", () => {
    expect(parentOf(route("shop", "/shop/hometown-market", { merchant: "hometown-market", userId: HERO }))).toBe(
      `/my-portal/${HERO}/home-town`,
    );
    expect(parentOf(route("shop", "/shop/gms-new-shop", { merchant: "gms-new-shop", userId: HERO }))).toBe(
      `/my-portal/${HERO}/home-town`,
    );
  });

  it("follows the traveling merchant to the world he is in today", () => {
    const parent = parentOf(route("shop", "/shop/traveling-merchant", { merchant: "traveling-merchant", userId: HERO }));
    expect(parent).toBe(worldPageOf(HERO, merchantWorldOn()));
    expect(parent).not.toBe(`/my-portal/${HERO}/home-town`);
  });

  it("lets the page name the world when it knows better than the registry", () => {
    const here = route("shop", "/shop/hermits-tent", { merchant: "hermits-tent", userId: HERO });
    expect(parentOf(here)).toBe(`/my-portal/${HERO}/forest`);
    expect(parentOf(here, { shopWorld: "swamps" })).toBe(`/my-portal/${HERO}/swamps`);
  });

  it("sends the town buildings to Home Town", () => {
    ["bank", "hospital", "hotel", "town-hall", "view-stats"].forEach((name) => {
      expect(parentOf(route(name, `/${name}/${HERO}`, { userId: HERO }))).toBe(`/my-portal/${HERO}/home-town`);
    });
  });

  it("sends Family Chat, opened from the Town Hall, back to the Town Hall", () => {
    expect(parentOf(route("town-hall-chat", `/town-hall/${HERO}/chat`, { userId: HERO }))).toBe(`/town-hall/${HERO}`);
  });

  it("sends a temple to the region it stands in, and an unknown temple to the world map", () => {
    expect(parentOf(route("temple", "/temple/water-temple/hero-1", { temple: "water-temple", userId: HERO }))).toBe(
      `/my-portal/${HERO}/islands`,
    );
    expect(parentOf(route("temple", "/temple/light-temple/hero-1", { temple: "light-temple", userId: HERO }))).toBe(
      `/my-portal/${HERO}/sands`,
    );
    expect(parentOf(route("temple", "/temple/nowhere/hero-1", { temple: "nowhere", userId: HERO }))).toBe(
      `/my-portal/${HERO}/world-map`,
    );
  });

  it("sends My Home's pages to My Home and the hero's own screens to the portal home", () => {
    ["cook-food", "craft-item", "storage", "calendar", "my-tasks", "my-abilities", "my-gold-points", "my-inventory", "my-profile"].forEach(
      (name) => expect(parentOf(route(name, `/${name}/${HERO}`, { userId: HERO }))).toBe(`/my-portal/${HERO}/my-home`),
    );
    expect(parentOf(route("my-party", `/my-portal/${HERO}/my-party`, { userId: HERO }))).toBe("/xp-profile");
  });

  it("sends a quest's page to the quest log", () => {
    expect(parentOf({ path: `/my-tasks/${HERO}/task/quest-7/`, params: { userId: HERO, taskId: "quest-7" } })).toBe(
      `/my-tasks/${HERO}`,
    );
  });

  it("sends every region to the world map, and the world map and Home Town to the portal home", () => {
    Object.values(WORLD_PAGES).forEach((page) => {
      expect(parentOf(route(page.name, `/my-portal/${HERO}/${page.segment}`, { userId: HERO }))).toBe(`/my-portal/${HERO}/world-map`);
    });
    expect(parentOf(route("world-map", `/my-portal/${HERO}/world-map`, { userId: HERO }))).toBe(`/my-portal/${HERO}/my-home`);
    expect(parentOf(route("home-town", `/my-portal/${HERO}/home-town`, { userId: HERO }))).toBe(`/my-portal/${HERO}/my-home`);
  });

  it("leaves the portal home, the profile chooser and the battle with no 'up'", () => {
    expect(parentOf(route("my-home", `/my-portal/${HERO}/my-home`, { userId: HERO }))).toBeNull();
    expect(parentOf(route("xp-profile", "/xp-profile"))).toBeNull();
    expect(parentOf(route("battle-quest", `/battle/${HERO}/quest/q1`, { userId: HERO }))).toBeNull();
  });

  it("uses the signed-in hero when the address carries none", () => {
    expect(parentOf(route("bank", "/bank"), { heroId: "hero-9" })).toBe("/my-portal/hero-9/home-town");
    expect(parentOf(route("shop", "/shop/wrecked-ship", { merchant: "wrecked-ship" }), { heroId: "hero-9" })).toBe(
      "/my-portal/hero-9/islands",
    );
    // the address wins over whoever is signed in
    expect(parentOf(route("bank", "/bank/hero-2", { userId: "hero-2" }), { heroId: "hero-9" })).toBe("/my-portal/hero-2/home-town");
  });

  it("falls back to the profile chooser when there is no hero at all", () => {
    expect(parentOf(route("bank", "/bank"))).toBe("/xp-profile");
    expect(parentOf(route("shop", "/shop/wrecked-ship", { merchant: "wrecked-ship" }))).toBe("/xp-profile");
  });

  it("ignores a query string and a trailing slash in the path", () => {
    expect(parentOf({ path: "/xp-settings/sound/?x=1" })).toBe("/xp-settings");
  });
});

describe("parentOf: the side menu", () => {
  it("sends each Settings page to the Settings index, and the index to the hero's home", () => {
    ["general", "family", "sound", "notifications", "reward", "party", "theme", "pro", "chore"].forEach((page) => {
      expect(parentOf({ name: `xp-settings-${page}`, path: `/xp-settings/${page}` }, { heroId: HERO })).toBe("/xp-settings");
    });
    expect(parentOf({ name: "xp-settings-home", path: "/xp-settings" }, { heroId: HERO })).toBe(`/my-portal/${HERO}/my-home`);
  });

  it("sends Support's pages to Support and About's pages to About", () => {
    ["faq", "help-videos", "user-manual", "feature-request", "contact", "dev-tools"].forEach((page) => {
      expect(parentOf({ path: `/support/${page}` })).toBe("/xp-support");
    });
    expect(parentOf({ name: "about-xp-gp", path: "/about-xp/gp" })).toBe("/about-xp");
    expect(parentOf({ path: "/about-xp" }, { heroId: HERO })).toBe(`/my-portal/${HERO}/my-home`);
    expect(parentOf({ path: "/xp-support" }, { heroId: HERO })).toBe(`/my-portal/${HERO}/my-home`);
  });

  it("sends the Pro return to the Pro settings and the developer pages to /dev", () => {
    expect(parentOf({ name: "xp-pro-return", path: "/pro/return" })).toBe("/xp-settings/pro");
    expect(parentOf({ path: "/dev/soundfx" })).toBe("/dev");
  });

  it("sends anything else to the hero's home", () => {
    expect(parentOf({ name: "xp-pro", path: "/pro" }, { heroId: HERO })).toBe(`/my-portal/${HERO}/my-home`);
    expect(parentOf({ path: "/xp-membership" }, { heroId: HERO })).toBe(`/my-portal/${HERO}/my-home`);
  });
});

describe("parentOf: the Game Master's console", () => {
  const gm = (path: string) => parentOf({ path });

  it("leaves the three tabs with no 'up'", () => {
    expect(gm("/game-master/dashboard")).toBeNull();
    expect(gm("/game-master/chat")).toBeNull();
    expect(gm("/game-master/compendium/dashboard")).toBeNull();
  });

  it("sends a Compendium section's list to the Compendium", () => {
    ["achievements", "bestiary", "abilities", "temples"].forEach((section) => {
      expect(gm(`/game-master/compendium/${section}`)).toBe("/game-master/compendium/dashboard");
    });
    ["dashboard", "shops", "items", "key-items"].forEach((tab) => {
      expect(gm(`/game-master/compendium/economy/${tab}`)).toBe("/game-master/compendium/dashboard");
    });
  });

  it("sends a form or detail page to its section's list", () => {
    expect(gm("/game-master/compendium/achievements/config/q1/points")).toBe("/game-master/compendium/achievements");
    expect(gm("/game-master/compendium/bestiary/select")).toBe("/game-master/compendium/bestiary");
    expect(gm("/game-master/compendium/bestiary/create-update/b1")).toBe("/game-master/compendium/bestiary");
    expect(gm("/game-master/compendium/abilities/create-update")).toBe("/game-master/compendium/abilities");
    expect(gm("/game-master/add-beast/b1")).toBe("/game-master/compendium/bestiary");
    expect(gm("/game-master/add-ability")).toBe("/game-master/compendium/abilities");
    expect(gm("/game-master/discover-achievements")).toBe("/game-master/compendium/achievements");
  });

  it("walks the economy: shop tabs to the shop list, the item form to the item list", () => {
    expect(gm("/game-master/compendium/economy/shops/shop-1/items")).toBe("/game-master/compendium/economy/shops");
    expect(gm("/game-master/compendium/economy/shops/shop-1")).toBe("/game-master/compendium/economy/shops");
    expect(gm("/game-master/compendium/economy/create-shop/shop-1")).toBe("/game-master/compendium/economy/shops");
    expect(gm("/game-master/compendium/economy/create-update/item-1")).toBe("/game-master/compendium/economy/items");
    expect(gm("/game-master/compendium/economy/global")).toBe("/game-master/compendium/economy/dashboard");
  });

  it("walks the temples: a temple's tabs to the temple list, the room editor to the temple's rooms", () => {
    expect(gm("/game-master/compendium/temples/t1/layout")).toBe("/game-master/compendium/temples");
    expect(gm("/game-master/compendium/temples/t1/attributes/general")).toBe("/game-master/compendium/temples");
    expect(gm("/game-master/compendium/temples/creator/t1/rooms/2/3")).toBe("/game-master/compendium/temples/t1/rooms");
    expect(gm("/game-master/compendium/temples/t1/rooms/2/3")).toBe("/game-master/compendium/temples/t1/rooms");
    expect(gm("/game-master/compendium/temples/t1/rooms")).toBe("/game-master/compendium/temples");
  });

  it("sends the other Game Master pages to the Game Master's dashboard", () => {
    expect(gm("/game-master/approvals")).toBe("/game-master/dashboard");
    expect(gm("/game-master/do-this-not-that/d1")).toBe("/game-master/dashboard");
    expect(gm("/game-master/something-new")).toBe("/game-master/dashboard");
  });
});

describe("parentOf: the route table", () => {
  const routes: RouteRecordRaw[] = [
    ...GameMasterRoutes,
    ...HometownRoutes,
    ...MyHomeRoutes,
    ...MyPortalRoutes,
    ...UserHudRoutes,
    ...SettingsRoutes,
    ...ProRoutes,
    ...SideMenuRoutes,
    ...SupportRoutes,
    ...DevRoutes,
  ] as RouteRecordRaw[];
  const router = createRouter({ history: createMemoryHistory(), routes });

  /** Fills a route's pattern with plausible values so the router can resolve it like a real visit. */
  const SAMPLE: Record<string, string> = {
    userId: HERO,
    merchant: "wrecked-ship",
    temple: "water-temple",
    templeId: "water-temple",
    row: "1",
    col: "1",
  };
  const concrete = (pattern: string): string =>
    pattern.replace(/\/:([A-Za-z]+)(\([^)]*\))?\??/g, (_, key: string) => `/${SAMPLE[key] ?? "x1"}`).replace(/\/+$/, "") || "/";

  // A redirect (/game-master, /my-portal/:userId) is never the page on screen, so it has no back button to feed
  const pages = router
    .getRoutes()
    .filter((record) => !record.redirect && record.components)
    .map((record) => router.resolve(concrete(record.path)))
    .filter((page) => !page.matched[page.matched.length - 1].redirect);

  it("covers a good share of the app", () => {
    expect(pages.length).toBeGreaterThan(60);
  });

  it("gives every page a parent that is a real page, and the chain of parents reaches a top", () => {
    pages.forEach((page) => {
      const seen: string[] = [page.path];
      let at = parentOf({ name: page.name, path: page.path, params: page.params }, { heroId: HERO });
      while (at) {
        const next = router.resolve(at);
        expect(next.matched.length).toBeGreaterThan(0);
        expect(seen).not.toContain(next.path);
        seen.push(next.path);
        expect(seen.length).toBeLessThan(8);
        at = parentOf({ name: next.name, path: next.path, params: next.params }, { heroId: HERO });
      }
    });
  });

  it("opens Family Chat at /town-hall/:userId/chat, not the Town Hall", () => {
    const chat = router.resolve(`/town-hall/${HERO}/chat`);
    expect(chat.name).toBe("town-hall-chat");
    expect(chat.params.userId).toBe(HERO);
    expect(router.resolve(`/town-hall/${HERO}`).name).toBe("town-hall");
  });

  it("leaves only the tops of stacks without a parent", () => {
    const tops = pages
      .filter((page) => parentOf({ name: page.name, path: page.path, params: page.params }, { heroId: HERO }) === null)
      .map((page) => String(page.name || page.path))
      .sort();
    expect(tops).toEqual(
      ["my-home", "xp-chat", "xp-compendium-dashboard", "xp-dashboard", "xp-profile", "log-out"].sort(),
    );
  });
});

describe("parentOf: the registries agree with the route table", () => {
  const routes = MyPortalRoutes[0].children as RouteRecordRaw[];
  const region = (name: string) => routes.find((record) => record.name === name);

  it("has a page for every region the battle knows", () => {
    Object.entries(WORLD_REGIONS).forEach(([world, { routeName }]) => {
      expect(WORLD_PAGES[world]?.name).toBe(routeName);
      expect(region(routeName)?.path).toBe(WORLD_PAGES[world].segment);
    });
    expect(Object.keys(WORLD_PAGES).sort()).toEqual(Object.keys(WORLD_REGIONS).sort());
  });

  it("puts every shop in a world that has a page, or in Home Town, or follows the traveling merchant", () => {
    Object.values(SHOP_METADATA).forEach((shop) => {
      const isElsewhere = ["hometown", "traveling"].includes(shop.world);
      expect(isElsewhere || WORLD_PAGES[shop.world]).toBeTruthy();
    });
    MERCHANT_WORLDS.forEach((world) => expect(WORLD_PAGES[world]).toBeDefined());
  });

  it("puts every temple in a world that has a page", () => {
    Object.values(TEMPLE_METADATA).forEach((temple) => expect(WORLD_PAGES[temple.world]).toBeDefined());
  });
});

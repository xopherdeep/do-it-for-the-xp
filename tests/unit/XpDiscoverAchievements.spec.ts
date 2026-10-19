import { readFileSync } from "fs";
import { resolve } from "path";
import { mount } from "@vue/test-utils";
import XpDiscoverAchievements from "@/app/Admin/XpCompendium/views/XpAchievements/XpDiscoverAchievements/XpDiscoverAchievements.vue";
import GameMasterRoutes from "@/router/Admin/game-master.routes";

/**
 * GitHub issue 138: Discover Quests listed ready-made quests from the old WordPress feed, which no longer answers.
 * The route stays (the Compendium's quest list still opens it), and the page shows the game's Coming soon card.
 */

jest.mock("@/assets/fx", () => ({ __esModule: true, play$fx: jest.fn() }));

const folder = resolve(__dirname, "../../src/app/Admin/XpCompendium/views/XpAchievements/XpDiscoverAchievements");

describe("Discover Quests", () => {
  it("shows the Coming soon card in the Compendium's words, with nothing to search or scroll", () => {
    const wrapper = mount(XpDiscoverAchievements);

    expect(wrapper.find('[data-cy="coming-soon"]').exists()).toBe(true);
    expect(wrapper.find(".xp-coming-soon__badge").text()).toBe("Coming soon");
    expect(wrapper.findAll(".xp-coming-soon__item h2").map((title) => title.text())).toEqual(["Ready-made quests"]);
    expect(wrapper.text()).toContain("Discover Achievements");
    expect(wrapper.find("ion-searchbar").exists()).toBe(false);
    expect(wrapper.find("ion-infinite-scroll").exists()).toBe(false);
  });

  it("does not call the old WordPress feed any more", () => {
    const source = ["XpDiscoverAchievements.ts", "XpDiscoverAchievements.vue"]
      .map((file) => readFileSync(resolve(folder, file), "utf8"))
      .join("\n");

    expect(source).not.toMatch(/doit\.forthexp\.com\.api|useInfiniteQuests|fetchWPItems/);
  });

  it("is gone with its detail modal: nothing is left that only the feed's quests could open", () => {
    expect(() => readFileSync(resolve(folder, "XpAchievementDetails.vue"), "utf8")).toThrow();
  });

  it("keeps its route, so the quest list's Discover entry never lands on a missing page", () => {
    const routes = GameMasterRoutes.flatMap((route) => [route, ...(route.children ?? [])]);

    expect(routes.map((route) => route.name)).toContain("xp-discover-achievements");
  });
});

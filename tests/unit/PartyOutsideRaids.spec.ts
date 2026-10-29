import { reactive } from "vue";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import PartyRaidsTab from "@/app/Console/MyPortal/party/PartyRaidsTab.vue";
import { rosterOf } from "@/lib/services/party/partyFeedView";
import { usePartyStore } from "@/lib/store/stores/party";
import { useUserStore } from "@/lib/store/stores/user";
import type { WireParty, WireRaid } from "@/lib/services/party/partyWire";

/**
 * The Raids tab for a party with other families: the leader's family starts a raid on a library beast, everyone sees the
 * beast and each hero's damage, and each family claims the loot of its own heroes, paid to the hero here.
 */

jest.mock("@/app.config", () => ({ __esModule: true, default: { $getUserAvatar: () => "avatar.png" } }));
jest.mock("@/assets/fx", () => ({ play$fx: jest.fn() }));
jest.mock("@/lib/databases/PartyDb", () => ({
  __esModule: true,
  getPartyDb: () => ({ getState: async () => null, saveState: async () => undefined }),
}));
jest.mock("@/lib/databases/BestiaryDb", () => ({
  __esModule: true,
  beastStorage: {},
  BestiaryDb: class {
    getBeasts = async () => [{ id: "home-beast", name: "Home Beast", avatar: 1, checklist: [] }];
  },
}));
jest.mock("@/lib/services/core/beastLibrary", () => ({
  __esModule: true,
  BEAST_LIBRARY: [
    { id: "beast-fluffalo", name: "Fluffalo", avatar: 95, variantAvatar: 195, checklist: [] },
    { id: "beast-dust-bunny-king", name: "Dust Bunny King", avatar: 94, checklist: [] },
  ],
}));
jest.mock("@/app/Admin/XpCompendium/views/XpTemples/components/XpTempleCreator/components/beastPortrait", () => ({
  beastPortraitUrl: (avatar?: number | null) => (avatar ? `portrait-${avatar}.webp` : null),
}));

const mockApplyQuestRewards = jest.fn().mockReturnValue(null);
jest.mock("@/lib/services/quests/QuestCompletionService", () => ({
  applyQuestRewards: (...args: unknown[]) => mockApplyQuestRewards(...args),
  paidQuestRewards: (_heroId: string, rewards: unknown) => rewards,
}));

const mockStartRaid = jest.fn();
jest.mock("@/hooks/usePartyRaids", () => ({ usePartyRaids: () => ({ startRaid: (...args: unknown[]) => mockStartRaid(...args) }) }));

const mockPro = reactive({ familyId: "fam-1", isPro: true });
jest.mock("@/lib/store/stores/pro", () => ({ __esModule: true, useProStore: () => mockPro }));

const card = (heroId: string, nickname: string) => ({ heroId, nickname, level: 3, jobClass: "knight", look: null });
const DAY = 86_400_000;

const raid = (id: string, over: Partial<WireRaid> = {}): WireRaid => ({
  id,
  beastId: "beast-fluffalo",
  window: "quick",
  maxHp: 120,
  memberCount: 2,
  startedAt: new Date(Date.now() - 60_000).toISOString(),
  endsAt: new Date(Date.now() + 3 * DAY).toISOString(),
  hp: 120,
  status: "active",
  top: null,
  last: null,
  strikes: [],
  ...over,
});

/** Strikes that take a 120 health beast down: 60 each on two days */
const felling = (): WireRaid["strikes"] => {
  const strike = (key: string, familyId: string, heroId: string, damage: number, ago: number) => ({
    key,
    familyId,
    heroId,
    damage,
    day: "2026-10-28",
    at: new Date(Date.now() - ago).toISOString(),
  });
  return [strike("a", "fam-1", "ana", 60, 3000), strike("b", "fam-2", "ben", 60, 2000)];
};

const party = (over: Partial<WireParty> = {}): WireParty => ({
  id: "p1",
  name: "Raiders",
  emblem: "dragon",
  inviteRule: "leader",
  leader: { familyId: "fam-1", heroId: "ana" },
  members: [
    { familyId: "fam-1", heroId: "ana", card: card("ana", "Ana"), role: "leader", joinedAt: "" },
    { familyId: "fam-2", heroId: "ben", card: card("ben", "Ben"), role: "member", joinedAt: "" },
  ],
  raid: null,
  seq: 1,
  ...over,
});

let wrapper: VueWrapper | null = null;

beforeEach(() => {
  setActivePinia(createPinia());
  // A Game Master of the family is signed in: starting a raid, in a party with other families too, is theirs to do
  const users = useUserStore();
  Object.assign(users.users, { gm: { id: "gm", isAdult: true, name: { nick: "Dad" } } });
  users.currentUser.id = "gm";
  mockPro.familyId = "fam-1";
  mockStartRaid.mockReset();
  mockApplyQuestRewards.mockClear();
});
afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
});

const open = async (p: WireParty, extra: Partial<WireParty>[] = []): Promise<VueWrapper> => {
  const store = usePartyStore();
  await store.load();
  store.applyServer({ parties: [p, ...extra.map((e) => party(e))], incoming: [], outgoing: [] });
  wrapper = mount(PartyRaidsTab, { props: { members: rosterOf(p), partyId: p.id } });
  await flushPromises();
  return wrapper;
};

describe("Party Raids tab: a party with other families", () => {
  it("lets the leader's family start a raid on a library beast, and tells the site", async () => {
    mockStartRaid.mockResolvedValue({ ok: true, value: raid("r1") });
    const tab = await open(party());
    await tab.find('[data-cy="party-start-raid"]').trigger("click");
    expect(tab.findAll('[data-cy^="raid-beast-"]').map((tile) => tile.attributes("data-cy"))).toEqual([
      "raid-beast-beast-fluffalo",
      "raid-beast-beast-dust-bunny-king",
    ]);
    await tab.find('[data-cy="raid-beast-beast-fluffalo"]').trigger("click");
    await tab.find('[data-cy="raid-window-quick"]').trigger("click");
    await tab.find('[data-cy="raid-begin"]').trigger("click");
    await flushPromises();
    expect(mockStartRaid).toHaveBeenCalledWith("p1", "beast-fluffalo", "quick");
    expect(tab.find('[data-cy="raid-start"]').exists()).toBe(false);
  });

  it("says why when the site would not start it, and keeps the panel open", async () => {
    mockStartRaid.mockResolvedValue({ ok: false, problem: "too-small" });
    const tab = await open(party());
    await tab.find('[data-cy="party-start-raid"]').trigger("click");
    await tab.find('[data-cy="raid-beast-beast-fluffalo"]').trigger("click");
    await tab.find('[data-cy="raid-begin"]').trigger("click");
    await flushPromises();
    expect(tab.find('[data-cy="raid-start-error"]').text()).toContain("at least two heroes");
    expect(tab.find('[data-cy="raid-start"]').exists()).toBe(true);
  });

  it("makes a member of another family wait for the leader, with no start button", async () => {
    const tab = await open(party({ leader: { familyId: "fam-2", heroId: "ben" } }));
    expect(tab.find('[data-cy="party-raids-waiting"]').text()).toContain("leader");
    expect(tab.find('[data-cy="party-start-raid"]').exists()).toBe(false);
  });

  it("shows the beast and each hero's damage by nickname, from the site's copy of the raid", async () => {
    const tab = await open(party({ raid: raid("r1", { hp: 60, strikes: felling().slice(0, 1) }) }));
    expect(tab.text()).toContain("Fluffalo");
    expect(tab.find('[data-cy="raid-hp"]').text()).toContain("60 / 120");
    const rows = tab.findAll('[data-cy="raid-ledger-row"]').map((row) => row.text());
    expect(rows[0]).toContain("Ana");
    expect(rows[1]).toContain("Ben");
    expect(tab.find('img[alt="Fluffalo"]').attributes("src")).toBe("portrait-195.webp");
  });

  it("offers loot only to this family's heroes, and pays it to the hero here, once", async () => {
    const tab = await open(party({ raid: raid("r1", { hp: 0, status: "defeated", strikes: felling() }) }));
    expect(tab.find('[data-cy="raid-claim-fam-1|ana"]').exists()).toBe(true);
    expect(tab.find('[data-cy="raid-claim-fam-2|ben"]').exists()).toBe(false);
    await tab.find('[data-cy="raid-claim-fam-1|ana"]').trigger("click");
    expect(mockApplyQuestRewards).toHaveBeenCalledTimes(1);
    expect(mockApplyQuestRewards).toHaveBeenCalledWith("ana", { xp: 300, ap: 5, gp: 20 }, "raid:r1", undefined, "Raid: Fluffalo");
    expect(usePartyStore().paid).toEqual(["raid:r1:fam-1|ana"]);
    expect(tab.find('[data-cy="raid-claim-fam-1|ana"]').exists()).toBe(false);
  });

  it("keeps the same hero id of another family from being paid", async () => {
    mockPro.familyId = "fam-2";
    const tab = await open(party({ raid: raid("r1", { hp: 0, status: "defeated", strikes: felling() }) }));
    await tab.find('[data-cy="raid-claim-fam-2|ben"]').trigger("click");
    expect(mockApplyQuestRewards).toHaveBeenCalledWith("ben", expect.anything(), "raid:r1", undefined, "Raid: Fluffalo");
    expect(tab.find('[data-cy="raid-claim-fam-1|ana"]').exists()).toBe(false);
  });

  it("shows an older fallen beast whose loot is waiting before the party's newer raid", async () => {
    const store = usePartyStore();
    await store.load();
    store.applyServer({ parties: [party({ raid: raid("old", { hp: 0, status: "defeated", strikes: felling(), startedAt: new Date(Date.now() - 5 * DAY).toISOString() }) })], incoming: [], outgoing: [] });
    const next = party({ raid: raid("new") });
    store.applyServer({ parties: [next], incoming: [], outgoing: [] });
    wrapper = mount(PartyRaidsTab, { props: { members: rosterOf(next), partyId: "p1" } });
    await flushPromises();
    expect(wrapper.find('[data-cy="raid-claim-fam-1|ana"]').exists()).toBe(true);
    expect(wrapper.find('[data-cy="raid-status"]').text()).toContain("Defeated");
  });

  it("does not offer the household's own beasts for a raid with other families", async () => {
    const tab = await open(party());
    await tab.find('[data-cy="party-start-raid"]').trigger("click");
    expect(tab.find('[data-cy="raid-beast-home-beast"]').exists()).toBe(false);
  });
});

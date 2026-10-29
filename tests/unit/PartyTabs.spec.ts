import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import PartyRaidsTab from "@/app/Console/MyPortal/party/PartyRaidsTab.vue";
import PartySwitcher from "@/app/Console/MyPortal/party/PartySwitcher.vue";
import PartySynergiesTab from "@/app/Console/MyPortal/party/PartySynergiesTab.vue";
import PartyRosterTab from "@/app/Console/MyPortal/party/PartyRosterTab.vue";
import { play$fx } from "@/assets/fx";
import type { PartyMember } from "@/lib/services/party/partyStats";
import { usePartyStore } from "@/lib/store/stores/party";

/**
 * My Party's tabs. Raids: start a raid on a bestiary beast, watch its health and each hero's damage, claim the loot once
 * when it falls, see it flee when the window closes. Synergies: today's strike buff. The switcher picks the party. Roster
 * drops the Party Roles legend, which described roles nothing in the game uses.
 */

jest.mock("@/app.config", () => ({ __esModule: true, default: { $getUserAvatar: () => "avatar.png" } }));
jest.mock("@/assets/fx", () => ({ play$fx: jest.fn() }));

const mockSaveState = jest.fn().mockResolvedValue(undefined);
jest.mock("@/lib/databases/PartyDb", () => ({
  __esModule: true,
  getPartyDb: () => ({
    getState: async () => null,
    saveState: (...args: unknown[]) => mockSaveState(...args),
  }),
}));

const mockBeasts = [
  { id: "b1", name: "Dust Bunny King", avatar: 94, variantAvatar: 194, checklist: [] },
  { id: "b2", name: "Fluffalo", avatar: 95, checklist: [] },
];
jest.mock("@/lib/databases/BestiaryDb", () => ({
  __esModule: true,
  beastStorage: {},
  BestiaryDb: class {
    getBeasts = async () => mockBeasts;
  },
}));

const mockApplyQuestRewards = jest.fn().mockReturnValue(null);
jest.mock("@/lib/services/quests/QuestCompletionService", () => ({
  applyQuestRewards: (...args: unknown[]) => mockApplyQuestRewards(...args),
  paidQuestRewards: (_heroId: string, rewards: unknown) => rewards,
}));

jest.mock("@/app/Admin/XpCompendium/views/XpTemples/components/XpTempleCreator/components/beastPortrait", () => ({
  beastPortraitUrl: (avatar?: number | null) => (avatar ? `portrait-${avatar}.webp` : null),
}));

const MEMBERS: PartyMember[] = [
  { id: "m1", name: { nick: "Ash" }, jobClass: "Knight", role: "leader", stats: { level: 4 } },
  { id: "m2", name: { full: "Birch Tree" }, race: "Elf" },
];

const HEROES: PartyMember[] = [
  { id: "ana", name: { nick: "Ana" } },
  { id: "ben", name: { nick: "Ben" } },
];

const DAY_MS = 24 * 60 * 60 * 1000;
const inDays = (days: number): string => new Date(Date.now() + days * DAY_MS).toISOString();

let pinia: ReturnType<typeof createPinia>;
let wrapper: VueWrapper | null = null;

beforeEach(() => {
  pinia = createPinia();
  setActivePinia(pinia);
  mockApplyQuestRewards.mockClear();
  (play$fx as jest.Mock).mockClear();
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
});

const mountRaids = async (): Promise<VueWrapper> => {
  wrapper = mount(PartyRaidsTab, { props: { members: HEROES }, global: { plugins: [pinia] } });
  await flushPromises();
  return wrapper;
};

/** A quick raid for Ana and Ben on the first beast, started on a store that has already read its record */
const startedRaid = async () => {
  const store = usePartyStore();
  await store.load();
  const raid = store.startHomeRaid({ beastId: "b1", window: "quick", memberIds: ["ana", "ben"] });
  return { store, raid };
};

describe("Party Raids tab", () => {
  it("offers to start a raid when none has begun", async () => {
    const tab = await mountRaids();
    expect(tab.find('[data-cy="party-raids-empty"]').exists()).toBe(true);
    expect(tab.find('[data-cy="party-start-raid"]').exists()).toBe(true);
    expect(tab.find('[data-cy="raid-card"]').exists()).toBe(false);
  });

  it("starts a raid on the chosen beast and window, for every hero in the party", async () => {
    const tab = await mountRaids();
    await tab.find('[data-cy="party-start-raid"]').trigger("click");
    expect(tab.find('[data-cy="raid-start"]').exists()).toBe(true);
    expect(tab.findAll('[data-cy^="raid-beast-"]')).toHaveLength(2);
    expect(tab.find('[data-cy="raid-begin"]').attributes("disabled")).toBeDefined();

    await tab.find('[data-cy="raid-beast-b2"]').trigger("click");
    await tab.find('[data-cy="raid-window-quick"]').trigger("click");
    expect(tab.find('[data-cy="raid-begin"]').attributes("disabled")).toBeUndefined();
    await tab.find('[data-cy="raid-begin"]').trigger("click");

    const store = usePartyStore();
    expect(store.raids).toHaveLength(1);
    expect(store.raids[0]).toMatchObject({ beastId: "b2", window: "quick", memberIds: ["ana", "ben"] });
    expect(tab.find('[data-cy="raid-start"]').exists()).toBe(false);
    expect(tab.find('[data-cy="raid-card"]').exists()).toBe(true);
  });

  it("can back out of starting a raid", async () => {
    const tab = await mountRaids();
    await tab.find('[data-cy="party-start-raid"]').trigger("click");
    await tab.find('[data-cy="raid-cancel"]').trigger("click");
    expect(tab.find('[data-cy="raid-start"]').exists()).toBe(false);
    expect(usePartyStore().raids).toEqual([]);
  });

  it("says so when the bestiary has no beasts to raid", async () => {
    const kept = mockBeasts.splice(0, mockBeasts.length);
    try {
      const tab = await mountRaids();
      await tab.find('[data-cy="party-start-raid"]').trigger("click");
      expect(tab.text()).toContain("Add beasts in the Compendium");
      expect(tab.find('[data-cy="raid-begin"]').attributes("disabled")).toBeDefined();
    } finally {
      mockBeasts.push(...kept);
    }
  });

  it("shows the beast's health and each hero's damage", async () => {
    const { store, raid } = await startedRaid();
    store.strike(raid.id, { key: "k1", heroId: "ana", damage: 60, at: inDays(0) });
    store.strike(raid.id, { key: "k2", heroId: "ben", damage: 30, at: inDays(0) });
    const tab = await mountRaids();
    expect(tab.text()).toContain("Dust Bunny King");
    expect(tab.find('[data-cy="raid-hp"]').text()).toContain("90 / 180");
    const rows = tab.findAll('[data-cy="raid-ledger-row"]');
    expect(rows.map((row) => row.text())).toEqual([expect.stringContaining("Ana"), expect.stringContaining("Ben")]);
    expect(rows[0].text()).toContain("60");
    expect(tab.find('[data-cy="raid-status"]').text()).toContain("left");
    expect(tab.find('img[alt="Dust Bunny King"]').attributes("src")).toBe("portrait-194.webp");
  });

  it("lets each striker claim the loot once when the beast falls", async () => {
    const { store, raid } = await startedRaid();
    store.strike(raid.id, { key: "k1", heroId: "ana", damage: 60, at: inDays(0) });
    store.strike(raid.id, { key: "k2", heroId: "ben", damage: 60, at: inDays(0) });
    store.strike(raid.id, { key: "k3", heroId: "ana", damage: 60, at: inDays(1) });
    const tab = await mountRaids();
    expect(tab.find('[data-cy="raid-status"]').text()).toContain("Defeated");
    expect(tab.find('[data-cy="raid-claim-ben"]').exists()).toBe(true);

    await tab.find('[data-cy="raid-claim-ana"]').trigger("click");
    expect(mockApplyQuestRewards).toHaveBeenCalledTimes(1);
    expect(mockApplyQuestRewards).toHaveBeenCalledWith(
      "ana",
      { xp: 300, ap: 5, gp: 20 },
      `raid:${raid.id}`,
      undefined,
      "Raid: Dust Bunny King"
    );
    expect(play$fx).toHaveBeenCalledWith("openChest");
    expect(tab.find('[data-cy="raid-claim-ana"]').exists()).toBe(false);
    expect(tab.find('[data-cy="raid-claimed-ana"]').text()).toContain("+300 XP");
    expect(tab.find('[data-cy="raid-claim-ben"]').exists()).toBe(true);
    expect(store.paid).toEqual([`raid:${raid.id}:ana`]);
  });

  it("keeps the next raid back until every striker has claimed", async () => {
    const { store, raid } = await startedRaid();
    store.strike(raid.id, { key: "k1", heroId: "ana", damage: 60, at: inDays(0) });
    store.strike(raid.id, { key: "k2", heroId: "ben", damage: 60, at: inDays(0) });
    store.strike(raid.id, { key: "k3", heroId: "ana", damage: 60, at: inDays(1) });
    const tab = await mountRaids();
    expect(tab.find('[data-cy="raid-again"]').exists()).toBe(false);
    await tab.find('[data-cy="raid-claim-ana"]').trigger("click");
    await tab.find('[data-cy="raid-claim-ben"]').trigger("click");
    expect(tab.find('[data-cy="raid-again"]').exists()).toBe(true);
  });

  it("shows the beast fled when the window closes, and offers another try", async () => {
    const store = usePartyStore();
    await store.load();
    store.raids = [
      {
        id: "old",
        partyId: "home",
        beastId: "b1",
        window: "quick",
        startedAt: inDays(-5),
        maxHp: 180,
        memberIds: ["ana", "ben"],
        strikes: [],
      },
    ];
    const tab = await mountRaids();
    expect(tab.find('[data-cy="raid-status"]').text().toLowerCase()).toContain("fled");
    await tab.find('[data-cy="raid-again"]').trigger("click");
    expect(tab.find('[data-cy="raid-start"]').exists()).toBe(true);
  });
});

describe("Party Synergies tab", () => {
  const mountSynergies = (heroIdsToday: string[]) => {
    wrapper = mount(PartySynergiesTab, { props: { members: HEROES, heroIdsToday } });
    return wrapper;
  };

  it("shows no buff while fewer than two heroes have finished a chore today", () => {
    expect(mountSynergies([]).find('[data-cy="party-synergy-buff"]').text()).toContain("x1");
    expect(wrapper!.text()).toContain("Two heroes finishing chores today make strikes x1.1");
  });

  it("shows x1.1 for two heroes and points at the next step", () => {
    const tab = mountSynergies(["ana", "ben"]);
    expect(tab.find('[data-cy="party-synergy-buff"]').text()).toContain("x1.1");
    expect(tab.text()).toContain("One more hero today makes strikes x1.2");
  });

  it("shows x1.2 for three heroes at full party power", () => {
    const tab = mountSynergies(["ana", "ben", "cam"]);
    expect(tab.find('[data-cy="party-synergy-buff"]').text()).toContain("x1.2");
    expect(tab.text()).toContain("Full party power");
  });

  it("marks which heroes have finished a chore today", () => {
    const tab = mountSynergies(["ben"]);
    expect(tab.find('[data-cy="party-synergy-hero-ben"]').classes()).toContain("is-done");
    expect(tab.find('[data-cy="party-synergy-hero-ana"]').classes()).not.toContain("is-done");
  });
});

describe("Party switcher", () => {
  const PARTIES = [
    { id: "home", name: "Home" },
    { id: "p2", name: "Raiders" },
  ];

  it("lists the parties with the active one pressed", () => {
    wrapper = mount(PartySwitcher, { props: { parties: PARTIES, active: "home" } });
    const chips = wrapper.findAll('[data-cy^="party-chip-"]');
    expect(chips.map((chip) => chip.text())).toEqual(["Home", "Raiders"]);
    expect(chips[0].attributes("aria-pressed")).toBe("true");
    expect(chips[1].attributes("aria-pressed")).toBe("false");
  });

  it("tells which party was picked", async () => {
    wrapper = mount(PartySwitcher, { props: { parties: PARTIES, active: "home" } });
    await wrapper.find('[data-cy="party-chip-p2"]').trigger("click");
    expect(wrapper.emitted("select")?.[0]).toEqual(["p2"]);
  });
});

describe("Party Roster tab", () => {
  const mountRoster = () => mount(PartyRosterTab, { props: { members: MEMBERS } });

  it("no longer lists Party Roles", () => {
    const rosterTab = mountRoster();

    expect(rosterTab.text()).not.toContain("Party Roles");
    expect(rosterTab.text()).not.toMatch(/Champion|Scout|Support/);
  });

  it("still lists every member and the Add Hero row", () => {
    const rosterTab = mountRoster();

    const rows = rosterTab.findAll('[data-cy="party-member-item"]');
    expect(rows).toHaveLength(2);
    expect(rows[0].text()).toContain("Ash");
    expect(rows[0].text()).toContain("Knight");
    expect(rows[0].text()).toContain("Lv.4");
    expect(rows[1].text()).toContain("Birch Tree");
    expect(rosterTab.find('[data-cy="party-add-member"]').exists()).toBe(true);
  });

  it("still opens a member's profile and the invite flow", async () => {
    const rosterTab = mountRoster();

    await rosterTab.findAll('[data-cy="party-member-item"]')[1].trigger("click");
    await rosterTab.find('[data-cy="party-add-member"]').trigger("click");

    expect(rosterTab.emitted("openProfile")?.[0]).toEqual([MEMBERS[1]]);
    expect(rosterTab.emitted("inviteMember")).toHaveLength(1);
  });
});

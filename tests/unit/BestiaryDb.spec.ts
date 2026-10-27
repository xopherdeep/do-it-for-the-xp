/**
 * BestiaryDb.setBeast: a save merges into the stored record. The Game Master's form (and the beast wizard) sends only
 * the fields it owns; before this, setBeast replaced the record with defaults plus those fields, so an edit dropped the
 * quests a beast is attached to (achievementIds), its art element, its temple theme and its second look (variantAvatar).
 * Only the browser's storage is faked (in memory).
 */
import BestiaryDb, { beastStorage } from "@/lib/databases/BestiaryDb";
import type { Beast } from "@/lib/databases/BestiaryDb";
import { beastPatch, draftFromBeast } from "@/app/Admin/XpCompendium/views/XpBestiary/beastWizard";

jest.mock("@ionic/storage", () => {
  const rows = new Map<string, Map<string, unknown>>();
  class FakeStorage {
    private readonly mine: Map<string, unknown>;
    constructor(config: { name: string }) {
      if (!rows.has(config.name)) rows.set(config.name, new Map());
      this.mine = rows.get(config.name) as Map<string, unknown>;
    }
    async create() {
      return this;
    }
    async get(key: string) {
      return this.mine.has(key) ? JSON.parse(JSON.stringify(this.mine.get(key))) : null;
    }
    async set(key: string, value: unknown) {
      this.mine.set(key, JSON.parse(JSON.stringify(value)));
    }
    async remove(key: string) {
      this.mine.delete(key);
    }
    async clear() {
      this.mine.clear();
    }
    async keys() {
      return Array.from(this.mine.keys());
    }
  }
  return { Drivers: { IndexedDB: "indexeddb", LocalStorage: "localstorage" }, Storage: FakeStorage };
});

const bestiaryDb = new BestiaryDb(beastStorage);

/** A beast the family has grown: attached to two quests, with an element, a temple theme and a second look */
const grownBeast = (): Beast => ({
  id: "beast-dish-goblin",
  name: "Dish Goblin",
  checklist: ["Load the dishwasher"],
  avatar: 3,
  variantAvatar: 41,
  achievementIds: ["quest-1", "quest-2"],
  element: "forest",
  theme: "shadow",
  bg1: 10,
  bg2: 20,
  aspectRatio: 48,
});

const stored = async (id: string) => (await bestiaryDb.getAll()).find((beast) => beast.id === id) as Beast;

beforeEach(async () => {
  await bestiaryDb.clear();
});

describe("setBeast on a new beast", () => {
  it("gives it an id and the defaults: no quests attached, a random backdrop, the medium letterbox", async () => {
    await bestiaryDb.setBeast({ name: "Gobbo", checklist: ["Sweep"], avatar: 5 });
    const [beast] = await bestiaryDb.getAll();
    expect(beast.id).toEqual(expect.any(String));
    expect(beast.id).not.toBe("");
    expect(beast).toMatchObject({ name: "Gobbo", checklist: ["Sweep"], avatar: 5, achievementIds: [], aspectRatio: 48 });
    expect(typeof beast.bg1).toBe("number");
    expect(typeof beast.bg2).toBe("number");
  });

  it("keeps the id it was given when nothing is stored under it yet", async () => {
    await bestiaryDb.setBeast({ id: "beast-new", name: "Newbie", checklist: [], avatar: 2 });
    expect(await stored("beast-new")).toMatchObject({ id: "beast-new", name: "Newbie", achievementIds: [] });
  });
});

describe("setBeast on a beast that is stored", () => {
  it("keeps the quests, element, theme and second look when only the form's fields come in", async () => {
    await bestiaryDb.setBeast(grownBeast());
    await bestiaryDb.setBeast({
      id: "beast-dish-goblin",
      name: "Dish Gobbo",
      checklist: ["Load the dishwasher", "Wipe the counters"],
      avatar: 4,
      bg1: 11,
      bg2: 21,
      aspectRatio: 64,
    });
    expect(await stored("beast-dish-goblin")).toEqual({
      id: "beast-dish-goblin",
      name: "Dish Gobbo",
      checklist: ["Load the dishwasher", "Wipe the counters"],
      avatar: 4,
      variantAvatar: 41,
      achievementIds: ["quest-1", "quest-2"],
      element: "forest",
      theme: "shadow",
      bg1: 11,
      bg2: 21,
      aspectRatio: 64,
    });
  });

  it("lets the fields that come in win, including a new list of attached quests", async () => {
    await bestiaryDb.setBeast(grownBeast());
    await bestiaryDb.setBeast({ ...grownBeast(), achievementIds: ["quest-3"], theme: "fire" });
    expect(await stored("beast-dish-goblin")).toMatchObject({ achievementIds: ["quest-3"], theme: "fire", element: "forest" });
  });

  it("lets a quest be taken off: an empty list of attached quests is a list, not a missing field", async () => {
    await bestiaryDb.setBeast(grownBeast());
    await bestiaryDb.setBeast({ ...grownBeast(), achievementIds: [] });
    expect((await stored("beast-dish-goblin")).achievementIds).toEqual([]);
  });

  it("saves one record per beast: an edit never adds a second", async () => {
    await bestiaryDb.setBeast(grownBeast());
    await bestiaryDb.setBeast({ id: "beast-dish-goblin", name: "Renamed", checklist: ["Sweep"], avatar: 3 });
    expect(await bestiaryDb.getAll()).toHaveLength(1);
  });

  it("leaves the other beasts alone", async () => {
    await bestiaryDb.setBeast(grownBeast());
    await bestiaryDb.setBeast({ id: "beast-other", name: "Other", checklist: ["Dust"], avatar: 9, achievementIds: ["quest-9"] });
    await bestiaryDb.setBeast({ id: "beast-dish-goblin", name: "Renamed", checklist: ["Sweep"], avatar: 3 });
    expect(await stored("beast-other")).toMatchObject({ name: "Other", achievementIds: ["quest-9"] });
  });
});

describe("an edit through the beast wizard", () => {
  it("keeps the achievementIds, element, theme and variantAvatar the form never shows", async () => {
    await bestiaryDb.setBeast(grownBeast());

    // The wizard opens the stored beast as a draft, the parent renames it and adds a chore, the summary saves the patch
    const draft = draftFromBeast(await stored("beast-dish-goblin"));
    draft.name = "  Dish Gobbo  ";
    draft.checklist.push("Wipe the counters");
    await bestiaryDb.setBeast(beastPatch(draft));

    const after = await stored("beast-dish-goblin");
    expect(after.name).toBe("Dish Gobbo");
    expect(after.checklist).toEqual(["Load the dishwasher", "Wipe the counters"]);
    expect(after.achievementIds).toEqual(["quest-1", "quest-2"]);
    expect(after.element).toBe("forest");
    expect(after.theme).toBe("shadow");
    expect(after.variantAvatar).toBe(41);
    expect(await bestiaryDb.getAll()).toHaveLength(1);
  });

  it("makes a brand new beast from a new draft's patch", async () => {
    await bestiaryDb.setBeast(
      beastPatch({ id: "", name: "Kitchen Dragon", checklist: ["Wipe the counters"], avatar: 12, bg1: 40, bg2: 7, aspectRatio: 64 })
    );
    const [beast] = await bestiaryDb.getAll();
    expect(beast).toMatchObject({ name: "Kitchen Dragon", avatar: 12, bg1: 40, bg2: 7, aspectRatio: 64, achievementIds: [] });
    expect(beast.id).toEqual(expect.any(String));
  });
});

describe("getLiveBeasts", () => {
  const proposal = (state: "proposed" | "returned" | "approved") => ({ by: "ronan", on: "2026-10-27T10:00:00.000Z", state });

  it("leaves out a proposed beast and keeps an approved one", async () => {
    await bestiaryDb.setBeast({ id: "beast-old", name: "Old Timer", checklist: [], avatar: 1 });
    await bestiaryDb.setBeast({ id: "beast-proposed", name: "Proposed Pal", checklist: [], avatar: 2, madeBy: "ronan", proposal: proposal("proposed") });
    await bestiaryDb.setBeast({ id: "beast-returned", name: "Sent Back", checklist: [], avatar: 3, madeBy: "ronan", proposal: proposal("returned") });
    await bestiaryDb.setBeast({ id: "beast-approved", name: "Approved Pal", checklist: [], avatar: 4, madeBy: "ronan", proposal: proposal("approved") });

    const live = await bestiaryDb.getLiveBeasts();
    expect(live.map((beast) => beast.id).sort()).toEqual(["beast-approved", "beast-old"]);
    expect(live.find((beast) => beast.id === "beast-approved")).toMatchObject({ madeBy: "ronan", proposal: { state: "approved" } });
  });

  it("leaves getBeasts alone: the Game Master's Bestiary still sees every record", async () => {
    await bestiaryDb.setBeast({ id: "beast-proposed", name: "Proposed Pal", checklist: [], avatar: 2, proposal: proposal("proposed") });
    expect(await bestiaryDb.getBeasts()).toHaveLength(1);
    expect(await bestiaryDb.getLiveBeasts()).toEqual([]);
  });

  it("keeps the proposal when a save only sends the fields the form owns", async () => {
    await bestiaryDb.setBeast({ id: "beast-proposed", name: "Proposed Pal", checklist: [], avatar: 2, madeBy: "ronan", proposal: proposal("proposed") });
    await bestiaryDb.setBeast({ id: "beast-proposed", name: "Proposed Pally", checklist: ["Sweep"], avatar: 2 });
    expect(await stored("beast-proposed")).toMatchObject({ name: "Proposed Pally", madeBy: "ronan", proposal: { state: "proposed" } });
    expect(await bestiaryDb.getLiveBeasts()).toEqual([]);
  });
});

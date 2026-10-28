/**
 * The kid's own list of creations (myCreations.ts): which records are theirs and the state each is in, newest first;
 * the chip's words in each voice; Send again and Fix it's send (only for a creation that is still sent back); Delete
 * (never for one in the game, and the quest sent with a beast goes with it); and a profile that is deleted taking its
 * waiting creations back to the Game Master as "maker gone". The stores are plain objects over maps; Pinia is real with
 * the disks faked.
 */
import { createPinia, setActivePinia } from "pinia";
import { newBeastDraft } from "@/app/Admin/XpCompendium/views/XpBestiary/beastWizard";
import type { BeastDraft } from "@/app/Admin/XpCompendium/views/XpBestiary/beastWizard";
import type { Achievement } from "@/lib/databases/AchievementDb";
import type { Beast } from "@/lib/databases/BestiaryDb";
import type { Proposal } from "@/lib/services/creations/creations";
import {
  deleteCreation,
  loadMyCreations,
  myCreationRows,
  orphanCreations,
  resendCreation,
  resentBeast,
  sendFixedBeast,
  stateChip,
} from "@/lib/services/creations/myCreations";
import type { DeleteStores, MyCreationRow } from "@/lib/services/creations/myCreations";
import { creationWaitingNotification } from "@/lib/services/notifications/Notifications";
import { useNotificationsStore } from "@/lib/store/stores/notifications";
import { useUserStore } from "@/lib/store/stores/user";

jest.mock("@/lib/databases/ProfileDb", () => {
  class MockProfileDb {
    setProfile = jest.fn();
    getAll = jest.fn().mockResolvedValue([]);
  }
  return { __esModule: true, ProfileDb: MockProfileDb, default: MockProfileDb };
});
jest.mock("@/lib/services/core/StorageService", () => ({
  __esModule: true,
  default: { saveUsers: jest.fn().mockResolvedValue(undefined) },
}));
jest.mock("@/lib/databases/NotificationsDb", () => ({
  __esModule: true,
  getNotificationsDb: () => ({
    getForHero: jest.fn().mockResolvedValue([]),
    saveForHero: jest.fn().mockResolvedValue(undefined),
  }),
}));
jest.mock("@/lib/services/compendium/deleteContent", () => ({ __esModule: true, deleteQuest: jest.fn() }));
jest.mock("@/app/Admin/XpCompendium/views/XpTemples/components/XpTempleCreator/components/beastPortrait", () => ({
  __esModule: true,
  beastPortraitUrl: (avatar?: number | null) => (avatar ? `beast-${avatar}.webp` : null),
}));

const MON = "2026-10-26T08:00:00.000Z";
const TUE = "2026-10-27T08:00:00.000Z";
const WED = "2026-10-28T08:00:00.000Z";
const NOW = new Date("2026-10-29T10:00:00.000Z");
const DRAWING = "data:image/jpeg;base64,AAAA";

const proposal = (state: Proposal["state"], on: string, patch: Partial<Proposal> = {}): Proposal => ({ by: "ronan", on, state, ...patch });

const beastOf = (id: string, state: Proposal["state"], on: string, patch: Partial<Beast> = {}): Beast => ({
  id,
  name: `Beast ${id}`,
  checklist: ["Sort the socks"],
  avatar: 12,
  madeBy: "ronan",
  proposal: proposal(state, on),
  ...patch,
});

const questOf = (id: string, state: Proposal["state"], on: string, patch: Partial<Achievement> = {}): Achievement =>
  ({
    id,
    achievementName: `Quest ${id}`,
    assignee: ["mia"],
    draft: state !== "approved",
    createdBy: "ronan",
    proposal: proposal(state, on),
    ...patch,
  }) as Achievement;

/** Plain stores over maps: what the service writes is what the next read hands back */
const fakeStores = (beasts: Array<Beast | null>, quests: Array<Achievement | null>) => {
  const beastRows = new Map(beasts.filter(Boolean).map((beast) => [String(beast?.id), beast as Beast]));
  const questRows = new Map(quests.filter(Boolean).map((quest) => [String(quest?.id), quest as Achievement]));
  const removed: string[] = [];
  const stores: DeleteStores = {
    bestiaryDb: {
      getBeasts: async () => [...beasts.filter((beast) => beast === null), ...beastRows.values()],
      setBeast: async (beast: Beast) => {
        beastRows.set(String(beast.id), { ...beastRows.get(String(beast.id)), ...beast });
      },
      deleteBeast: async (beast: Beast) => {
        beastRows.delete(String(beast.id));
        return [...beastRows.values()];
      },
    },
    achievementDb: {
      getTasks: async () => [...quests.filter((quest) => quest === null), ...questRows.values()] as Achievement[],
      setTask: async (quest: Achievement) => {
        questRows.set(String(quest.id), quest);
      },
    },
    removeQuest: async (quest) => {
      removed.push(String(quest.id));
      questRows.delete(String(quest.id));
    },
  };
  return { stores, beast: (id: string) => beastRows.get(id), quest: (id: string) => questRows.get(id), removed };
};

const rowOf = (rows: MyCreationRow[], key: string): MyCreationRow => rows.find((row) => row.key === key) as MyCreationRow;

const addProfile = (id: string, isAdult = false) => useUserStore().addUser({ id, name: { nick: id }, isAdult });

beforeEach(() => {
  setActivePinia(createPinia());
  addProfile("ronan");
  addProfile("mom", true);
  useUserStore().loginUser(useUserStore().users.mom);
});

describe("myCreationRows", () => {
  it("lists what the hero made with a proposal, newest first, each in its state", () => {
    const beasts = [beastOf("b1", "proposed", MON), beastOf("b2", "approved", WED), beastOf("b3", "returned", TUE, { proposal: proposal("returned", TUE, { note: "Add a chore" }) })];
    const quests = [questOf("q1", "proposed", MON)];

    const rows = myCreationRows(beasts, quests, "ronan");

    expect(rows.map((row) => [row.key, row.state])).toEqual([
      ["beast:b2", "inGame"],
      ["beast:b3", "back"],
      ["beast:b1", "waiting"],
      ["quest:q1", "waiting"],
    ]);
    expect(rows[0]).toMatchObject({ kind: "beast", id: "b2", name: "Beast b2", on: WED });
  });

  it("leaves out other heroes' creations, records with no proposal and the holes storage can leave", () => {
    const beasts = [
      beastOf("b1", "proposed", MON, { madeBy: "mia", proposal: proposal("proposed", MON, { by: "mia" }) }),
      beastOf("b2", "proposed", MON, { proposal: undefined, madeBy: undefined }),
      null as unknown as Beast,
    ];
    const quests = [questOf("q1", "proposed", MON, { createdBy: "mia", proposal: proposal("proposed", MON, { by: "mia" }) }), questOf("q2", "approved", MON, { proposal: undefined })];

    expect(myCreationRows(beasts, quests, "ronan")).toEqual([]);
  });

  it("shows the note only on a row that came back", () => {
    const beasts = [beastOf("b1", "returned", TUE, { proposal: proposal("returned", TUE, { note: "Needs a name" }) }), beastOf("b2", "proposed", MON)];

    const rows = myCreationRows(beasts, [], "ronan");

    expect(rowOf(rows, "beast:b1").note).toBe("Needs a name");
    expect(rowOf(rows, "beast:b2").note).toBeUndefined();
  });

  it("draws a beast's own picture first, else its library portrait; a quest wears its picture", () => {
    const beasts = [beastOf("b1", "proposed", MON, { localImage: DRAWING }), beastOf("b2", "proposed", TUE), beastOf("b3", "proposed", WED, { avatar: 0 })];
    const quests = [questOf("q1", "proposed", MON, { imageUrl: "quest.webp" })];

    const rows = myCreationRows(beasts, quests, "ronan");

    expect(rowOf(rows, "beast:b1").portrait).toBe(DRAWING);
    expect(rowOf(rows, "beast:b2").portrait).toBe("beast-12.webp");
    expect(rowOf(rows, "beast:b3").portrait).toBeUndefined();
    expect(rowOf(rows, "quest:q1").portrait).toBe("quest.webp");
  });

  it("gives an approved beast the live quest to open its card on: the one sent with it, else one that fights it", () => {
    const sentWith = beastOf("b1", "approved", MON, { proposal: proposal("approved", MON, { questId: "q1" }) });
    const fought = beastOf("b2", "approved", TUE);
    const alone = beastOf("b3", "approved", WED);
    const quests = [
      questOf("q1", "approved", MON, { beastId: "b1" }),
      questOf("q9", "approved", MON, { beastId: "b2", proposal: undefined, createdBy: "mom" }),
      questOf("q8", "proposed", MON, { beastId: "b3" }),
    ];

    const rows = myCreationRows([sentWith, fought, alone], quests, "ronan");

    expect(rowOf(rows, "beast:b1").card?.id).toBe("q1");
    expect(rowOf(rows, "beast:b2").card?.id).toBe("q9");
    expect(rowOf(rows, "beast:b3").card).toBeUndefined();
  });

  it("opens no card for a beast that is not in the game yet, nor for a quest", () => {
    const rows = myCreationRows([beastOf("b1", "proposed", MON)], [questOf("q1", "approved", MON, { beastId: "b1" })], "ronan");

    expect(rowOf(rows, "beast:b1").card).toBeUndefined();
    expect(rowOf(rows, "quest:q1").card).toBeUndefined();
  });
});

describe("stateChip", () => {
  it("says Waiting, Came back and In the game in the adventure voice", () => {
    expect(stateChip("waiting", "adventure")).toBe("Waiting");
    expect(stateChip("back", "adventure")).toBe("Came back");
    expect(stateChip("inGame", "adventure")).toBe("In the game");
  });

  it("follows the voice, and the simple voice keeps to short words", () => {
    expect(stateChip("back", "simple")).toBe("Came back");
    expect(stateChip("inGame", "classic")).toBe("Approved");
  });
});

describe("loadMyCreations", () => {
  it("reads both stores for the hero's rows, and says when the cap is reached", async () => {
    const { stores } = fakeStores([beastOf("b1", "proposed", MON), null], [questOf("q1", "returned", TUE)]);

    const mine = await loadMyCreations("ronan", stores);

    expect(mine.rows.map((row) => row.key)).toEqual(["quest:q1", "beast:b1"]);
    expect(mine.isFull).toBe(false);
  });

  it("is full at ten creations waiting or sent back, beasts and quests together", async () => {
    const beasts = Array.from({ length: 6 }, (_, at) => beastOf(`b${at}`, "proposed", MON));
    const quests = Array.from({ length: 4 }, (_, at) => questOf(`q${at}`, "returned", TUE));
    const { stores } = fakeStores(beasts, quests);

    expect((await loadMyCreations("ronan", stores)).isFull).toBe(true);
  });
});

describe("resendCreation", () => {
  it("sends a returned beast again: waiting, dated now, the Game Master's note cleared", async () => {
    const { stores, beast } = fakeStores([beastOf("b1", "returned", TUE, { proposal: proposal("returned", TUE, { note: "Add a chore", reviewedBy: "mom" }) })], []);
    const [row] = myCreationRows([beast("b1") as Beast], [], "ronan");

    expect(await resendCreation(row, NOW, stores)).toEqual({ ok: true });

    expect(beast("b1")?.proposal).toEqual({ by: "ronan", on: NOW.toISOString(), state: "proposed", reviewedBy: "mom" });
  });

  it("sends a returned quest again", async () => {
    const { stores, quest } = fakeStores([], [questOf("q1", "returned", TUE, { proposal: proposal("returned", TUE, { note: "Which day?" }) })]);
    const [row] = myCreationRows([], [quest("q1") as Achievement], "ronan");

    expect(await resendCreation(row, NOW, stores)).toEqual({ ok: true });

    expect(quest("q1")?.proposal).toMatchObject({ state: "proposed", on: NOW.toISOString() });
    expect(quest("q1")?.proposal?.note).toBeUndefined();
  });

  it("does nothing when the Game Master has settled it meanwhile (read fresh, not from the row)", async () => {
    const { stores, beast } = fakeStores([beastOf("b1", "approved", WED)], []);
    const stale = myCreationRows([beastOf("b1", "returned", TUE)], [], "ronan")[0];

    expect(await resendCreation(stale, NOW, stores)).toEqual({ ok: false });

    expect(beast("b1")?.proposal?.state).toBe("approved");
  });
});

describe("resentBeast and sendFixedBeast (Fix it, then Send)", () => {
  const returned = beastOf("b1", "returned", TUE, {
    localImage: DRAWING,
    proposal: proposal("returned", TUE, { note: "Add a chore", questId: "q1", reviewedBy: "mom" }),
  });
  const fixed = (): BeastDraft => ({
    ...newBeastDraft(),
    id: "b1",
    name: "  Sock Goblin ",
    checklist: ["Sort the socks", "Roll them", " "],
    localImage: DRAWING,
    avatar: 12,
    bg1: 5,
    bg2: 6,
  });

  it("is the fixed draft over the returned beast, sent again: its maker, id and quest kept, the note gone", () => {
    const sent = resentBeast(returned, fixed(), NOW);

    expect(sent).toMatchObject({ id: "b1", name: "Sock Goblin", checklist: ["Sort the socks", "Roll them"], madeBy: "ronan", bg1: 5, bg2: 6 });
    expect(sent.proposal).toEqual({ by: "ronan", on: NOW.toISOString(), state: "proposed", questId: "q1", reviewedBy: "mom" });
  });

  it("writes it over the stored beast, and answers the beast that was sent", async () => {
    const { stores, beast } = fakeStores([returned], []);

    const sent = await sendFixedBeast(fixed(), NOW, stores);

    expect(sent?.name).toBe("Sock Goblin");
    expect(beast("b1")).toMatchObject({ name: "Sock Goblin", proposal: { state: "proposed" } });
  });

  it("writes nothing when the beast is no longer sent back (approved, waiting, or gone)", async () => {
    const approved = fakeStores([beastOf("b1", "approved", WED)], []);
    expect(await sendFixedBeast(fixed(), NOW, approved.stores)).toBeNull();
    expect(approved.beast("b1")?.name).toBe("Beast b1");

    const gone = fakeStores([], []);
    expect(await sendFixedBeast(fixed(), NOW, gone.stores)).toBeNull();
    expect(gone.beast("b1")).toBeUndefined();
  });
});

describe("deleteCreation", () => {
  it("deletes a waiting beast, and the quest sent with it while that quest is not in the game", async () => {
    const waitingBeast = beastOf("b1", "proposed", MON, { proposal: proposal("proposed", MON, { questId: "q1" }) });
    const { stores, beast, quest, removed } = fakeStores([waitingBeast], [questOf("q1", "proposed", MON, { beastId: "b1" })]);
    const row = rowOf(myCreationRows([waitingBeast], [], "ronan"), "beast:b1");

    expect(await deleteCreation(row, stores)).toEqual({ ok: true });

    expect(beast("b1")).toBeUndefined();
    expect(removed).toEqual(["q1"]);
    expect(quest("q1")).toBeUndefined();
  });

  it("deletes a returned beast and its returned quest too", async () => {
    const sentBack = beastOf("b1", "returned", TUE, { proposal: proposal("returned", TUE, { questId: "q1" }) });
    const { stores, beast, removed } = fakeStores([sentBack], [questOf("q1", "returned", TUE)]);

    expect(await deleteCreation(rowOf(myCreationRows([sentBack], [], "ronan"), "beast:b1"), stores)).toEqual({ ok: true });

    expect(beast("b1")).toBeUndefined();
    expect(removed).toEqual(["q1"]);
  });

  it("keeps a quest sent with the beast once the Game Master has approved that quest", async () => {
    const waitingBeast = beastOf("b1", "proposed", MON, { proposal: proposal("proposed", MON, { questId: "q1" }) });
    const { stores, beast, quest, removed } = fakeStores([waitingBeast], [questOf("q1", "approved", MON)]);

    expect(await deleteCreation(rowOf(myCreationRows([waitingBeast], [], "ronan"), "beast:b1"), stores)).toEqual({ ok: true });

    expect(beast("b1")).toBeUndefined();
    expect(removed).toEqual([]);
    expect(quest("q1")).toBeDefined();
  });

  it("deletes a quest of its own through the Compendium's delete, so nothing is left pointing at it", async () => {
    const { stores, removed } = fakeStores([], [questOf("q1", "proposed", MON)]);

    expect(await deleteCreation(rowOf(myCreationRows([], [questOf("q1", "proposed", MON)], "ronan"), "quest:q1"), stores)).toEqual({ ok: true });

    expect(removed).toEqual(["q1"]);
  });

  it("will not delete what is in the game, read fresh: the row may be stale", async () => {
    const { stores, beast } = fakeStores([beastOf("b1", "approved", WED)], []);
    const stale = rowOf(myCreationRows([beastOf("b1", "proposed", MON)], [], "ronan"), "beast:b1");

    expect(await deleteCreation(stale, stores)).toEqual({ ok: false });

    expect(beast("b1")).toBeDefined();
  });

  it("settles the Game Master's 'a creation awaits' notice about it", async () => {
    const waitingBeast = beastOf("b1", "proposed", MON);
    const { stores } = fakeStores([waitingBeast], []);
    useNotificationsStore().push(creationWaitingNotification("mom", { key: "beast:b1", name: "Beast b1", kind: "beast" }, "Ronan"));

    await deleteCreation(rowOf(myCreationRows([waitingBeast], [], "ronan"), "beast:b1"), stores);

    expect(useNotificationsStore().forHero("mom")[0].readAt).toBeTruthy();
  });
});

describe("orphanCreations", () => {
  it("returns every waiting creation of a deleted hero as 'maker gone', from the signed-in Game Master, and counts them", async () => {
    const waitingBeast = beastOf("b1", "proposed", MON, { proposal: proposal("proposed", MON, { questId: "q1" }) });
    const { stores, beast, quest } = fakeStores([waitingBeast], [questOf("q1", "proposed", MON), questOf("q2", "proposed", TUE)]);

    expect(await orphanCreations("ronan", NOW, stores)).toBe(3);

    const expected = { by: "ronan", state: "returned", note: "maker gone", reviewedBy: "mom", reviewedOn: NOW.toISOString() };
    expect(beast("b1")?.proposal).toMatchObject(expected);
    expect(quest("q1")?.proposal).toMatchObject(expected);
    expect(quest("q2")?.proposal).toMatchObject(expected);
  });

  it("leaves the others alone: another hero's, ones already sent back, and ones in the game", async () => {
    const { stores, beast, quest } = fakeStores(
      [
        beastOf("b1", "returned", TUE, { proposal: proposal("returned", TUE, { note: "Add a chore" }) }),
        beastOf("b2", "approved", WED),
        beastOf("b3", "proposed", MON, { madeBy: "mia", proposal: proposal("proposed", MON, { by: "mia" }) }),
      ],
      [questOf("q1", "proposed", MON, { createdBy: "mia", proposal: proposal("proposed", MON, { by: "mia" }) }), questOf("q2", "approved", MON, { proposal: undefined })]
    );

    expect(await orphanCreations("ronan", NOW, stores)).toBe(0);

    expect(beast("b1")?.proposal?.note).toBe("Add a chore");
    expect(beast("b2")?.proposal?.state).toBe("approved");
    expect(beast("b3")?.proposal?.state).toBe("proposed");
    expect(quest("q1")?.proposal?.state).toBe("proposed");
    expect(quest("q2")?.proposal).toBeUndefined();
  });

  it("settles the Game Master's notices about the ones it returns", async () => {
    const { stores } = fakeStores([beastOf("b1", "proposed", MON)], []);
    useNotificationsStore().push(creationWaitingNotification("mom", { key: "beast:b1", name: "Beast b1", kind: "beast" }, "Ronan"));

    await orphanCreations("ronan", NOW, stores);

    expect(useNotificationsStore().forHero("mom")[0].readAt).toBeTruthy();
  });

  it("skips the holes storage can leave", async () => {
    const { stores } = fakeStores([null, beastOf("b1", "proposed", MON)], [null]);

    expect(await orphanCreations("ronan", NOW, stores)).toBe(1);
  });
});

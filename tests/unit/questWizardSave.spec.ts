import { BEAST_LIBRARY } from "@/lib/services/core/beastLibrary";
import { chooseFamilyBeast, newDraft, pickChore } from "@/lib/services/quests/questWizard";
import type { WizardDraft } from "@/lib/services/quests/questWizard";
import { saveWizardQuest } from "@/lib/services/quests/questWizardSave";

/**
 * Saving a maker's quest: the stores are plain objects, so the order of the writes is what is asserted. A beast the kid
 * made and sent is pointed at the quest first, then the quest is written, so a Game Master who opens either one finds the
 * other.
 */

// Wed 14 Oct 2026, local noon
const TODAY = new Date(2026, 9, 14, 12, 0);
const SENT = "2026-10-20T08:00:00.000Z";
const maker = { isGm: false, isMaker: true, creatorId: "kid-1", questId: "q1", today: TODAY };

const sockMonster = (state: "proposed" | "returned" | "approved") => ({
  id: "beast-sock",
  name: "Sock Monster",
  checklist: ["Find the pair", "Roll them"],
  localImage: "data:image/webp;base64,AAAA",
  madeBy: "kid-1",
  proposal: { by: "kid-1", on: SENT, state },
});

const stores = (beasts: unknown[] = []) => {
  const calls: string[] = [];
  const written: { beasts: any[]; quests: any[] } = { beasts: [], quests: [] };
  return {
    calls,
    written,
    stores: {
      categoryDb: {
        getAll: jest.fn(async () => [{ id: "cat-hero-quests" }]),
        setCategory: jest.fn(async (category: { id: string }) => void calls.push(`category:${category.id}`)),
      },
      bestiaryDb: {
        getBeasts: jest.fn(async () => beasts),
        setBeast: jest.fn(async (beast: { id: string }) => {
          written.beasts.push(beast);
          calls.push(`beast:${beast.id}`);
        }),
      },
      achievementDb: {
        setTask: jest.fn(async (quest: { id: string }) => {
          written.quests.push(quest);
          calls.push(`quest:${quest.id}`);
        }),
      },
    },
  };
};

const forFamilyBeast = (state: "proposed" | "returned" | "approved", over: Partial<WizardDraft> = {}): WizardDraft => ({
  ...chooseFamilyBeast(newDraft({ isGm: false, isMaker: true, heroId: "kid-1", today: TODAY }), sockMonster(state)),
  ...over,
});

const libraryDraft = (over: Partial<WizardDraft> = {}): WizardDraft => {
  const entry = BEAST_LIBRARY.find((beast) => beast.slug === "bed-basilisk");
  if (!entry) throw new Error("no library beast bed-basilisk");
  return { ...pickChore(newDraft({ isGm: false, isMaker: true, heroId: "kid-1", today: TODAY }), entry), ...over };
};

describe("saving a maker's quest", () => {
  it("writes the beast that waits on the quest before the quest, with the quest's id on it", async () => {
    const { calls, written, stores: fake } = stores([sockMonster("proposed")]);
    const quest = await saveWizardQuest(forFamilyBeast("proposed"), maker, fake as never);
    expect(calls).toEqual(["beast:beast-sock", "quest:q1"]);
    expect(quest).toMatchObject({ id: "q1", beastId: "beast-sock", draft: true });
    expect(quest.proposal).toMatchObject({ state: "proposed", by: "kid-1" });
    // only the proposal changes on the beast: its picture, steps and credit stay as the kid made them
    expect(written.beasts[0]).toEqual({ ...sockMonster("proposed"), proposal: { ...sockMonster("proposed").proposal, questId: "q1" } });
    expect(written.quests[0]).toBe(quest);
  });

  it("writes a quest for a sibling as a proposal, with the library beast adopted before it", async () => {
    const { calls, written, stores: fake } = stores();
    await saveWizardQuest(libraryDraft({ heroIds: ["kid-1", "kid-2"] }), maker, fake as never);
    expect(calls).toEqual(["beast:beast-bed-basilisk", "quest:q1"]);
    expect(written.quests[0]).toMatchObject({ draft: true, assignee: ["kid-1", "kid-2"] });
    expect(written.quests[0].proposal.state).toBe("proposed");
    // the library beast is the library's own: it goes in as it always did, with no proposal on it
    expect(written.beasts[0].proposal).toBeUndefined();
  });

  it("writes a quest for themself on a library beast live, as it always did (D5)", async () => {
    const { calls, written, stores: fake } = stores();
    await saveWizardQuest(libraryDraft(), maker, fake as never);
    expect(calls).toEqual(["beast:beast-bed-basilisk", "quest:q1"]);
    expect(written.quests[0].draft).toBe(false);
    expect(written.quests[0].proposal).toBeUndefined();
  });

  it("leaves an approved family beast alone and writes the quest live", async () => {
    const { calls, written, stores: fake } = stores([sockMonster("approved")]);
    await saveWizardQuest(forFamilyBeast("approved"), maker, fake as never);
    expect(calls).toEqual(["quest:q1"]);
    expect(written.quests[0]).toMatchObject({ beastId: "beast-sock", draft: false });
  });

  it("writes nothing when the quest has no name", async () => {
    const { calls, stores: fake } = stores([sockMonster("proposed")]);
    const blank = newDraft({ isGm: false, isMaker: true, heroId: "kid-1", today: TODAY });
    await expect(saveWizardQuest({ ...blank, beastId: "beast-sock" }, maker, fake as never)).rejects.toThrow(/name/);
    expect(calls).toEqual([]);
  });
});

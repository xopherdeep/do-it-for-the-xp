/**
 * What the Quick Start screen says about the Howling Spire (catalog/quickStart.ts, quickStartSpireNote.ts): the count of
 * tonight's quests that wait there is read off the quest plan, so the line is true in every voice (on the Eagle layout
 * two of the three get a room; the third stays on the quest board).
 */
import { copyFor } from "@/lib/services/copy/copy";
import { VOICES } from "@/lib/services/copy/voices";
import shippedWind from "@/lib/engine/temples/wind-temple";
import { QUICK_START_QUEST_IDS, quickStartTemplePlan } from "@/lib/services/temples/quickStartPlan";
import { quickStartSpireCount, quickStartSpireKey, quickStartSpireNote } from "@/lib/services/temples/quickStartSpireNote";
import type { PlayedLayout } from "@/lib/services/temples/wakeOnEntry";

const KEYS = ["quickStart.spireAll", "quickStart.spireSome", "quickStart.spireOne"];

/** A fresh copy of the Wind Temple as shipped, so no spec can change it */
const eagle = (): PlayedLayout => JSON.parse(JSON.stringify({ entrance: shippedWind.entrance, maze: shippedWind.maze, rooms: shippedWind.rooms }));

describe("quickStartSpireCount", () => {
  it("is the number of tonight's quests the plan puts in a room of the shipped Wind Temple", () => {
    const plan = quickStartTemplePlan(eagle(), QUICK_START_QUEST_IDS, [], new Date());
    expect(quickStartSpireCount()).toBe(plan.placed.length);
  });

  it("is two of the three on the Eagle layout: the third quest stays on the quest board only", () => {
    expect(QUICK_START_QUEST_IDS).toHaveLength(3);
    expect(quickStartSpireCount()).toBe(2);
  });
});

describe("quickStartSpireKey", () => {
  it("says all of them only when every quest got a room", () => {
    expect(quickStartSpireKey(3, 3)).toBe("quickStart.spireAll");
    expect(quickStartSpireKey(2, 3)).toBe("quickStart.spireSome");
  });

  it("reads a single quest as one, and says nothing when no room took one", () => {
    expect(quickStartSpireKey(1, 3)).toBe("quickStart.spireOne");
    expect(quickStartSpireKey(0, 3)).toBeNull();
  });
});

describe("quickStartSpireNote", () => {
  it("names the count in every voice when only some of tonight's quests wait in the Spire", () => {
    expect(quickStartSpireNote("simple", 2, 3)).toBe("2 of tonight's quests are in the Howling Spire too.");
    expect(quickStartSpireNote("adventure", 2, 3)).toBe("2 of tonight's quests also wait in the Howling Spire, the temple out on the Plains.");
    expect(quickStartSpireNote("classic", 2, 3)).toBe("2 of tonight's quests are also in the Howling Spire, the temple on the Plains.");
  });

  it("does not say that all of tonight's quests wait there while one stays on the board", () => {
    const shipped = quickStartSpireCount();
    expect(shipped).toBeLessThan(QUICK_START_QUEST_IDS.length);
    for (const voice of VOICES) {
      const note = quickStartSpireNote(voice);
      expect(note).not.toBeNull();
      expect(note).not.toBe(copyFor("quickStart.spireAll", voice));
      expect(note).toContain(String(shipped));
    }
  });

  it("says that all of them wait there when every quest got a room, and nothing when none did", () => {
    for (const voice of VOICES) {
      expect(quickStartSpireNote(voice, 3, 3)).toBe(copyFor("quickStart.spireAll", voice));
      expect(quickStartSpireNote(voice, 0, 3)).toBeNull();
    }
  });

  it("leaves no placeholder unfilled and no em dash in any line of any voice", () => {
    for (const voice of VOICES) {
      for (const key of KEYS) {
        const line = copyFor(key, voice, { count: 2 });
        expect(line).not.toMatch(/[{}]/);
        expect(line).not.toMatch(/—/);
      }
    }
  });
});

import type { Achievement } from "@/lib/databases/AchievementDb";
import type { Beast } from "@/lib/databases/BestiaryDb";
import type { QuestLogEntry } from "@/lib/databases/QuestLogDb";
import { filterTamed, tamedBeastsOf } from "../tamedBeasts";

const quest = (id: string, beastId: string | undefined, name = "clean the kitchen"): Achievement =>
  ({ id, achievementName: name, beastId, noBeast: !beastId }) as Achievement;

const entry = (questId: string, overrides: Partial<QuestLogEntry> = {}): QuestLogEntry => ({
  id: `${questId}-${overrides.completedAt ?? "x"}`,
  questId,
  questName: questId,
  userId: "hero-1",
  completedAt: "2026-10-10T12:00:00.000Z",
  dayKey: "2026-10-10",
  status: "approved",
  source: "claim",
  rewards: { xp: 10, gp: 1, ap: 1 },
  rewardsApplied: true,
  ...overrides,
});

const beasts = [{ id: "b-sock", name: "Socktopus", avatar: 7 } as Beast, { id: "b-dish", name: "Dish Goblin" } as Beast];
const context = {
  quests: [quest("q1", "b-sock"), quest("q2", "b-dish"), quest("q3", "b-sock"), quest("q4", undefined)],
  beasts,
  portraitUrl: (avatar?: number | null) => (avatar ? `/beasts/${avatar}.webp` : null),
};

describe("tamedBeastsOf", () => {
  it("shows each beast once, counting every approved taming by this hero, newest first", () => {
    const tamed = tamedBeastsOf(
      [
        entry("q1", { completedAt: "2026-10-01T09:00:00.000Z" }),
        entry("q3", { completedAt: "2026-10-05T09:00:00.000Z" }),
        entry("q2", { completedAt: "2026-10-03T09:00:00.000Z" }),
      ],
      "hero-1",
      context,
    );
    expect(tamed.map(({ name, count }) => [name, count])).toEqual([
      ["Socktopus", 2],
      ["Dish Goblin", 1],
    ]);
    expect(tamed[0].image).toBe("/beasts/7.webp");
    expect(tamed[1].image).toBe("");
  });

  it("shows the kid's own picture of a beast over a library portrait it also has", () => {
    const drawn = { id: "b-sock", name: "Socktopus", avatar: 7, localImage: "data:image/jpeg;base64,CCC" } as Beast;
    const tamed = tamedBeastsOf([entry("q1")], "hero-1", { ...context, beasts: [drawn] });

    expect(tamed[0].image).toBe("data:image/jpeg;base64,CCC");
  });

  it("leaves out held or voided claims, other heroes, deleted quests and quests with no beast", () => {
    const tamed = tamedBeastsOf(
      [
        entry("q1", { status: "pending" }),
        entry("q1", { status: "rejected" }),
        entry("q2", { userId: "hero-2" }),
        entry("gone"),
        entry("q4"),
      ],
      "hero-1",
      context,
    );
    expect(tamed).toEqual([]);
  });
});

describe("filterTamed", () => {
  it("keeps the beasts whose name has the words typed", () => {
    const tamed = tamedBeastsOf([entry("q1"), entry("q2")], "hero-1", context);
    expect(filterTamed(tamed, " gob ").map((beast) => beast.name)).toEqual(["Dish Goblin"]);
    expect(filterTamed(tamed, "")).toHaveLength(2);
  });
});

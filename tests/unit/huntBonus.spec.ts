import type { QuestRewards } from "@/lib/databases/QuestLogDb";
import { HUNT_BONUS_XP, huntBonusLabel, huntBonusXpOn, withHuntBonus } from "@/lib/services/quests/huntBonus";

const rewards: QuestRewards = { xp: 120, gp: 30, ap: 2 };

describe("huntBonus", () => {
  it("is +25% XP, one shared number", () => {
    expect(HUNT_BONUS_XP).toBe(0.25);
    expect(huntBonusLabel()).toBe("Hunt bonus +25% XP");
    expect(huntBonusLabel(0.5)).toBe("Hunt bonus +50% XP");
  });

  it("is a whole-XP share of the quest's XP, none for a quest that pays no XP", () => {
    expect(huntBonusXpOn(120)).toBe(30);
    expect(huntBonusXpOn(30)).toBe(8);
    expect(huntBonusXpOn(1)).toBe(0);
    expect(huntBonusXpOn(0)).toBe(0);
    expect(huntBonusXpOn(-5)).toBe(0);
  });

  it("adds a held entry's bonus to its XP only", () => {
    expect(withHuntBonus({ rewards, huntBonusXp: 30 })).toEqual({ xp: 150, gp: 30, ap: 2 });
  });

  it("leaves an entry with no usable bonus at the quest's rate", () => {
    expect(withHuntBonus({ rewards })).toBe(rewards);
    expect(withHuntBonus({ rewards, huntBonusXp: 0 })).toBe(rewards);
    expect(withHuntBonus({ rewards, huntBonusXp: -4 })).toBe(rewards);
    expect(withHuntBonus({ rewards, huntBonusXp: Number.NaN })).toBe(rewards);
  });
});

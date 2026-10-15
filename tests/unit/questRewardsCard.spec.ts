import { questRewardsCard } from "@/lib/services/quests/questRewardsCard";

const levelUp = { didLevelUp: true, oldLevel: 3, newLevel: 4, levelsGained: 1, hpGained: 5, mpGained: 2, newMaxHp: 40, newMaxMp: 12 };

describe("questRewardsCard", () => {
  it("is the battle's YOU WON card without the fight's chores-in-time line", () => {
    const card = questRewardsCard({ nick: "Xopher", questName: "Brush Your Teeth", rewards: { xp: 100, gp: 10, ap: 1 }, held: false, levelUp });
    expect(card).toEqual({
      title: "YOU WON!",
      subtitle: "Xopher did it!",
      rewards: { xp: 100, gp: 10, ap: 1 },
      questName: "Brush Your Teeth",
      held: false,
      levelUp: { from: 3, to: 4 },
    });
    expect(card.choresDone).toBeUndefined();
  });

  it("locks the tiles and skips the level-up line while the Game Master still has to approve", () => {
    const card = questRewardsCard({ nick: " ", questName: "Card Master's Duel", rewards: { xp: 220, gp: 60, ap: 4 }, held: true, levelUp });
    expect(card.title).toBe("WELL DONE!");
    expect(card.subtitle).toBe("The hero sent it to the Game Master");
    expect(card.held).toBe(true);
    expect(card.levelUp).toBeUndefined();
  });
});

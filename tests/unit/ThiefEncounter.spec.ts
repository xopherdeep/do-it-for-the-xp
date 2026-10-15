import {
  THIEF_BEAST_ID,
  THIEF_ENCOUNTER_RATE,
  calculateStolenGp,
  createThiefEnemy,
  isPotionOrEther,
  isThiefRoll,
  stealFromHero,
  type UserStoreLike,
} from "@/lib/services/battle/thiefEncounter";

describe("ThiefEncounter service", () => {
  describe("isThiefRoll", () => {
    it("returns true when roll is below encounter rate", () => {
      expect(isThiefRoll(0.05, THIEF_ENCOUNTER_RATE)).toBe(true);
      expect(isThiefRoll(0.19, THIEF_ENCOUNTER_RATE)).toBe(true);
    });

    it("returns false when roll meets or exceeds encounter rate", () => {
      expect(isThiefRoll(0.2, THIEF_ENCOUNTER_RATE)).toBe(false);
      expect(isThiefRoll(0.85, THIEF_ENCOUNTER_RATE)).toBe(false);
    });
  });

  describe("createThiefEnemy", () => {
    it("creates thief enemy with id, empty task list, and thief properties", () => {
      const enemy = createThiefEnemy();
      expect(enemy.id).toBe(THIEF_BEAST_ID);
      expect(enemy.name).toBe("Thief Beast");
      expect(enemy.tasks).toEqual([]);
      expect(enemy.speed).toBeGreaterThan(15);
      expect(enemy.isBoss).toBe(false);
    });
  });

  describe("isPotionOrEther", () => {
    it("identifies various health potions and mana potions", () => {
      expect(isPotionOrEther({ name: "Health Potion" })).toBe(true);
      expect(isPotionOrEther({ name: "Mana Potion" })).toBe(true);
      expect(isPotionOrEther({ name: "Hi-Potion" })).toBe(true);
      expect(isPotionOrEther({ name: "Potion" })).toBe(true);
    });

    it("identifies ethers and elixirs", () => {
      expect(isPotionOrEther({ name: "Ether" })).toBe(true);
      expect(isPotionOrEther({ name: "Elixir" })).toBe(true);
    });

    it("returns false for non-consumable items and empty names", () => {
      expect(isPotionOrEther({ name: "Rusty Key" })).toBe(false);
      expect(isPotionOrEther({ name: "Iron Sword" })).toBe(false);
      expect(isPotionOrEther(undefined)).toBe(false);
      expect(isPotionOrEther({ name: "" })).toBe(false);
    });
  });

  describe("calculateStolenGp", () => {
    it("returns 0 when wallet is zero or negative", () => {
      expect(calculateStolenGp(0)).toBe(0);
      expect(calculateStolenGp(-10)).toBe(0);
    });

    it("steals full wallet if wallet is smaller than minimum cut", () => {
      expect(calculateStolenGp(3, 0.5)).toBe(3);
    });

    it("scales with wallet amount and caps at maximum threshold", () => {
      const smallWalletSteal = calculateStolenGp(20, 0); // ~10% -> 5 min
      expect(smallWalletSteal).toBe(5);

      const midWalletSteal = calculateStolenGp(100, 0); // 10% of 100 = 10
      expect(midWalletSteal).toBe(10);

      const hugeWalletSteal = calculateStolenGp(1000, 1.0); // 25% capped at 50
      expect(hugeWalletSteal).toBe(50);
    });
  });

  describe("stealFromHero", () => {
    it("steals GP and deducts from user store", () => {
      const mockUpdateUserGP = jest.fn();
      const mockSpendInventoryItem = jest.fn().mockReturnValue(true);

      const store: UserStoreLike = {
        users: {
          "hero-1": {
            wallet: 100,
            inventory: [],
          },
        },
        currentUser: { id: "hero-1" },
        updateUserGP: mockUpdateUserGP,
        spendInventoryItem: mockSpendInventoryItem,
      };

      const outcome = stealFromHero("hero-1", store, 0, 0.9);

      expect(outcome.stolenGp).toBe(10);
      expect(mockUpdateUserGP).toHaveBeenCalledWith({ userId: "hero-1", wallet: -10 });
      expect(outcome.stolenItemName).toBeUndefined();
      expect(outcome.hasEmptyPockets).toBe(false);
    });

    it("steals a potion or ether when roll qualifies and item exists", () => {
      const mockUpdateUserGP = jest.fn();
      const mockSpendInventoryItem = jest.fn().mockReturnValue(true);

      const store: UserStoreLike = {
        users: {
          "hero-1": {
            wallet: 50,
            inventory: [
              { id: "inv-potion-1", name: "Health Potion", qty: 2 },
              { id: "inv-key-1", name: "Dungeon Key", qty: 1 },
            ],
          },
        },
        currentUser: { id: "hero-1" },
        updateUserGP: mockUpdateUserGP,
        spendInventoryItem: mockSpendInventoryItem,
      };

      // rollItem = 0.1 (< 0.4 steal rate)
      const outcome = stealFromHero("hero-1", store, 0, 0.1);

      expect(outcome.stolenGp).toBe(5);
      expect(mockSpendInventoryItem).toHaveBeenCalledWith("hero-1", "inv-potion-1", 1);
      expect(outcome.stolenItemName).toBe("Health Potion");
      expect(outcome.hasEmptyPockets).toBe(false);
    });

    it("flags empty pockets when wallet is 0 and no potions/ethers are carried", () => {
      const mockUpdateUserGP = jest.fn();
      const mockSpendInventoryItem = jest.fn();

      const store: UserStoreLike = {
        users: {
          "hero-1": {
            wallet: 0,
            inventory: [{ id: "inv-key-1", name: "Iron Key", qty: 1 }],
          },
        },
        currentUser: { id: "hero-1" },
        updateUserGP: mockUpdateUserGP,
        spendInventoryItem: mockSpendInventoryItem,
      };

      const outcome = stealFromHero("hero-1", store, 0, 0.1);

      expect(outcome.stolenGp).toBe(0);
      expect(outcome.stolenItemName).toBeUndefined();
      expect(outcome.hasEmptyPockets).toBe(true);
      expect(mockUpdateUserGP).not.toHaveBeenCalled();
      expect(mockSpendInventoryItem).not.toHaveBeenCalled();
    });
  });
});

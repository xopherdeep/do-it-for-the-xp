import { createPinia, setActivePinia } from "pinia";
import { rewardGpPayload, splitReward } from "@/lib/services/gp/autoSave";
import { useGameRulesStore } from "@/lib/store/stores/gameRules";

jest.mock("@/lib/databases/FamilySettingsDb", () => ({
  __esModule: true,
  getFamilySettingsDb: () => ({ getSettings: async () => null, saveSettings: async () => undefined }),
}));

describe("Auto-save GP", () => {
  it("sends the share to savings and the rest to the wallet, rounding the share down", () => {
    expect(splitReward(100, 25)).toEqual({ wallet: 75, savings: 25 });
    expect(splitReward(15, 10)).toEqual({ wallet: 14, savings: 1 });
    expect(splitReward(1, 50)).toEqual({ wallet: 1, savings: 0 });
  });

  it("leaves the whole reward in the wallet when it is off", () => {
    expect(splitReward(40, 0)).toEqual({ wallet: 40, savings: 0 });
  });

  describe("the reward's GP move", () => {
    beforeEach(async () => {
      setActivePinia(createPinia());
      await useGameRulesStore().load();
    });

    it("is a plain wallet credit while auto-save is off", () => {
      expect(rewardGpPayload("hero-1", 30, "Battle won")).toEqual({ userId: "hero-1", wallet: 30, kind: "earn", note: "Battle won" });
    });

    it("splits the reward and says how much was saved", () => {
      useGameRulesStore().autoSavePercent = 50;
      expect(rewardGpPayload("hero-1", 30, "Quest: Feed the cat")).toEqual({
        userId: "hero-1",
        wallet: 15,
        savings: 15,
        kind: "earn",
        note: "Quest: Feed the cat (15 GP saved)",
      });
    });
  });
});

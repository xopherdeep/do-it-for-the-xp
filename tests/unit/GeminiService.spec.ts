import {
  DAILY_LIMIT_MESSAGE,
  generateChecklistFromName,
  generateFullBeast,
  generateMonsterName,
  generateSchedule,
  isGeminiConfigured,
} from "@/lib/services/ai/GeminiService";
import { askAi, ProClientError } from "@/lib/services/pro/proClient";
import { openProUpsell } from "@/lib/services/pro/proUi";

const mockPro = { licenseKey: "XP-PRO-AAAA-BBBB-CCCC", deviceId: "devicetest01", isPro: true };
jest.mock("@/lib/store/stores/pro", () => ({ __esModule: true, useProStore: () => mockPro }));
jest.mock("@/lib/services/pro/proClient", () => {
  const actual = jest.requireActual("@/lib/services/pro/proClient");
  return { __esModule: true, ProClientError: actual.ProClientError, askAi: jest.fn() };
});
jest.mock("@/lib/services/pro/proUi", () => ({ __esModule: true, openProUpsell: jest.fn(async () => undefined) }));

const ask = askAi as jest.Mock;

describe("GeminiService through the Pro proxy", () => {
  beforeEach(() => {
    ask.mockReset();
    (openProUpsell as jest.Mock).mockClear();
    mockPro.licenseKey = "XP-PRO-AAAA-BBBB-CCCC";
    mockPro.isPro = true;
  });

  it("generateMonsterName sends the monster_name task with only checklistItems", async () => {
    ask.mockResolvedValue({ name: "Socktopus" });
    const result = await generateMonsterName({ checklistItems: ["Pick up socks"] });
    expect(ask).toHaveBeenCalledWith("monster_name", { checklistItems: ["Pick up socks"] }, "XP-PRO-AAAA-BBBB-CCCC", "devicetest01");
    expect(result).toEqual({ success: true, name: "Socktopus" });
  });

  it("generateChecklistFromName sends monsterName and maps the checklist", async () => {
    ask.mockResolvedValue({ checklist: ["Pick up socks", "", "Sort socks"] });
    const result = await generateChecklistFromName({ monsterName: "Socktopus" });
    expect(ask).toHaveBeenCalledWith("checklist", { monsterName: "Socktopus" }, expect.any(String), expect.any(String));
    expect(result).toEqual({ success: true, checklist: ["Pick up socks", "Sort socks"] });
  });

  it("generateFullBeast sends the theme only when given and maps name and checklist", async () => {
    ask.mockResolvedValue({ name: "Dust Dragon", checklist: ["Dust shelves"] });
    expect(await generateFullBeast({ theme: "dusting" })).toEqual({ success: true, name: "Dust Dragon", checklist: ["Dust shelves"] });
    expect(ask).toHaveBeenLastCalledWith("full_beast", { theme: "dusting" }, expect.any(String), expect.any(String));
    await generateFullBeast();
    expect(ask).toHaveBeenLastCalledWith("full_beast", {}, expect.any(String), expect.any(String));
  });

  it("generateSchedule sends taskName, beastName and checklist and spreads the reply", async () => {
    ask.mockResolvedValue({ scheduleType: "weekly", days: ["tue"], reasoning: "Trash is weekly" });
    const result = await generateSchedule({ taskName: "Take out trash", beastName: "Trashgoyle", checklist: ["Bag it"] });
    expect(ask).toHaveBeenCalledWith(
      "schedule",
      { taskName: "Take out trash", beastName: "Trashgoyle", checklist: ["Bag it"] },
      expect.any(String),
      expect.any(String)
    );
    expect(result).toEqual({ success: true, scheduleType: "weekly", days: ["tue"], reasoning: "Trash is weekly" });
  });

  it("keeps the client-side checks without calling the proxy", async () => {
    expect((await generateMonsterName({ checklistItems: [] })).success).toBe(false);
    expect((await generateChecklistFromName({ monsterName: "  " })).success).toBe(false);
    expect((await generateSchedule({ taskName: "" })).success).toBe(false);
    expect(ask).not.toHaveBeenCalled();
  });

  it("pro_required gives success false and opens the upsell", async () => {
    ask.mockRejectedValue(new ProClientError("pro_required"));
    expect(await generateMonsterName({ checklistItems: ["x"] })).toEqual({ success: false });
    expect(openProUpsell).toHaveBeenCalledWith("aiHelpers");
  });

  it("no license key at all opens the upsell without a request", async () => {
    mockPro.licenseKey = "";
    expect(await generateFullBeast()).toEqual({ success: false });
    expect(openProUpsell).toHaveBeenCalledWith("aiHelpers");
    expect(ask).not.toHaveBeenCalled();
  });

  it("daily_limit gives the recharge message", async () => {
    ask.mockRejectedValue(new ProClientError("daily_limit"));
    expect(await generateSchedule({ taskName: "Mow" })).toEqual({
      success: false,
      error: "Your party used today's AI magic. It recharges tomorrow.",
    });
    expect(DAILY_LIMIT_MESSAGE).toBe("Your party used today's AI magic. It recharges tomorrow.");
    expect(openProUpsell).not.toHaveBeenCalled();
  });

  it("isGeminiConfigured is the Pro flag", () => {
    mockPro.isPro = false;
    expect(isGeminiConfigured()).toBe(false);
    mockPro.isPro = true;
    expect(isGeminiConfigured()).toBe(true);
  });
});

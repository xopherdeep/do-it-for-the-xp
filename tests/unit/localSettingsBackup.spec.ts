import { createLocalSettingsStorage, LOCAL_SETTING_KEYS } from "@/lib/services/core/localSettingsBackup";
import { requestPersistentStorage } from "@/lib/services/core/persistentStorage";

jest.mock("@/lib/utils/debug", () => ({ __esModule: true, default: { warn: jest.fn(), error: jest.fn() } }));

beforeEach(() => localStorage.clear());

describe("the localStorage settings a backup carries", () => {
  const storage = createLocalSettingsStorage(() => localStorage);
  const read = async () => {
    const entries: Array<[string, unknown]> = [];
    await storage.forEach((value, key) => {
      entries.push([key, value]);
    });
    return entries;
  };

  it("reads only the family settings, raw, and leaves device state out", async () => {
    localStorage.setItem("xp.haptics", "false");
    localStorage.setItem("xp-audio-settings", '{"music":0.4}');
    localStorage.setItem("xp.familyLocked", "true");
    localStorage.setItem("xp.currentUser", "ava");
    localStorage.setItem("xp-dev-mode", "true");
    localStorage.setItem("xp.voxelQuality", "pocket");
    expect(await read()).toEqual([
      ["xp-audio-settings", '{"music":0.4}'],
      ["xp.haptics", "false"],
      ["xp.familyLocked", "true"],
    ]);
  });

  it("restores the same text, clears only its own keys and ignores keys it does not keep", async () => {
    localStorage.setItem("xp.textSpeed", "slow");
    localStorage.setItem("xp.currentUser", "ava");
    await storage.clear();
    expect(localStorage.getItem("xp.textSpeed")).toBeNull();
    expect(localStorage.getItem("xp.currentUser")).toBe("ava");

    await storage.set("xp.themeChoice", "retro");
    await storage.set("xp.choreReminders", { on: true });
    await storage.set("xp.currentUser", "ben");
    expect(localStorage.getItem("xp.themeChoice")).toBe("retro");
    expect(localStorage.getItem("xp.choreReminders")).toBe('{"on":true}');
    expect(localStorage.getItem("xp.currentUser")).toBe("ava");
  });

  it("keeps the Video tier on this device: a restore never sets it and a clear never removes it", async () => {
    localStorage.setItem("xp.voxelQuality", "pocket");
    await storage.set("xp.voxelQuality", "super");
    expect(localStorage.getItem("xp.voxelQuality")).toBe("pocket");
    await storage.clear();
    expect(localStorage.getItem("xp.voxelQuality")).toBe("pocket");
    expect(LOCAL_SETTING_KEYS).not.toContain("xp.voxelQuality");
  });

  it("never lists a key twice", () => {
    expect(new Set(LOCAL_SETTING_KEYS).size).toBe(LOCAL_SETTING_KEYS.length);
  });
});

describe("requestPersistentStorage", () => {
  it("asks the browser to keep the data unless it already does", async () => {
    const persist = jest.fn().mockResolvedValue(true);
    expect(await requestPersistentStorage({ persisted: jest.fn().mockResolvedValue(false), persist } as unknown as StorageManager)).toBe(true);
    expect(persist).toHaveBeenCalledTimes(1);

    persist.mockClear();
    expect(await requestPersistentStorage({ persisted: jest.fn().mockResolvedValue(true), persist } as unknown as StorageManager)).toBe(true);
    expect(persist).not.toHaveBeenCalled();
  });

  it("is quiet where the browser has no such thing or refuses", async () => {
    expect(await requestPersistentStorage(undefined)).toBe(false);
    expect(await requestPersistentStorage({ persist: jest.fn().mockRejectedValue(new Error("no")) } as unknown as StorageManager)).toBe(false);
  });
});

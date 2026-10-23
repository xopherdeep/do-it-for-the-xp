import { ProfileDb } from "@/lib/databases/ProfileDb";
import { isSealed, pinMatches } from "@/lib/services/profile/pinSeal";

jest.mock("@/lib/services/core/StorageService", () => ({
  __esModule: true,
  default: { saveProfiles: jest.fn().mockResolvedValue(undefined) },
}));
// The real signal maker stays (the family-sync record signals the storage layer raises are built with it)
jest.mock("@/lib/services/multiplayer/gameSignals", () => ({ ...jest.requireActual("@/lib/services/multiplayer/gameSignals"), emitHeroRemoved: jest.fn() }));

/** The bits of an Ionic Storage ProfileDb uses, in memory */
const memoryStorage = (seed: Record<string, unknown> = {}) => {
  const data = new Map<string, unknown>(Object.entries(seed));
  return {
    data,
    create: async function () {
      return this;
    },
    set: async (key: string, value: unknown) => void data.set(key, value),
    get: async (key: string) => data.get(key),
    keys: async () => Array.from(data.keys()),
    remove: async (key: string) => void data.delete(key),
    clear: async () => data.clear(),
  };
};

describe("ProfileDb and PINs", () => {
  it("seals a PIN the form hands over before it is stored", async () => {
    const storage = memoryStorage();
    const db = new ProfileDb(storage as any);
    await db.setProfile({ id: "dad", passcode: "1234", isAdult: true } as any);
    const stored = storage.data.get("dad") as { passcode: string };
    expect(isSealed(stored.passcode)).toBe(true);
    expect(pinMatches(stored, "1234")).toBe(true);
  });

  it("seals PINs saved before sealing the next time the profiles are read", async () => {
    const storage = memoryStorage({ dad: { id: "dad", passcode: "1234" }, mia: { id: "mia", passcode: "" } });
    const db = new ProfileDb(storage as any);
    const profiles = await db.getAll();
    expect(profiles.every((profile: any) => profile.passcode === "" || isSealed(profile.passcode))).toBe(true);
    expect(isSealed((storage.data.get("dad") as { passcode: string }).passcode)).toBe(true);
    expect(JSON.stringify(Array.from(storage.data.values()))).not.toContain("1234");
  });
});

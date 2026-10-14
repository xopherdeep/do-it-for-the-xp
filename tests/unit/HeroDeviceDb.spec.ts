import { getHeroDeviceDb, HeroDeviceDb, type HeroDevice } from "@/lib/databases/HeroDeviceDb";
import { DEFAULT_LOOK } from "@/lib/hero-look/types";
import { BACKUP_STORES } from "@/lib/services/core/BackupService";

describe("HeroDeviceDb", () => {
  const sampleDevice: HeroDevice = {
    siteUrl: "https://townhall.example.com",
    familyId: "3f6c2a1e-8b4d-4c7a-9e2f-1a2b3c4d5e6f",
    heroId: "h-1",
    deviceId: "devicetest010101",
    key: "xph_testkey1234567890",
    label: "Mia's iPhone",
    linkedAt: 1770000000000,
    card: {
      heroId: "h-1",
      nickname: "Mia",
      look: DEFAULT_LOOK,
      jobClass: "warrior",
      level: 1,
      updatedAt: "2026-10-13T12:00:00.000Z",
    },
  };

  let db: HeroDeviceDb;

  beforeEach(async () => {
    db = getHeroDeviceDb();
    await db.clearDevice();
  });

  afterEach(async () => {
    await db.clearDevice();
  });

  it("returns null when no device is stored", async () => {
    const device = await db.getDevice();
    expect(device).toBeNull();
  });

  it("saves and retrieves a device", async () => {
    await db.saveDevice(sampleDevice);
    const loaded = await db.getDevice();
    expect(loaded).toEqual(sampleDevice);
  });

  it("clears stored device", async () => {
    await db.saveDevice(sampleDevice);
    await db.clearDevice();
    const loaded = await db.getDevice();
    expect(loaded).toBeNull();
  });

  it("BACKUP_STORES does not include __xp_hero_device", () => {
    const hasHeroDevice = BACKUP_STORES.some((s) => s.name === "__xp_hero_device");
    expect(hasHeroDevice).toBe(false);
  });
});

import type { QuestLogEntry } from "@/lib/databases/QuestLogDb";
import { ClaimPhotoDb } from "@/lib/databases/ClaimPhotoDb";
import {
  asksForPhoto,
  claimNeedsApproval,
  dataUrlBytes,
  fitPhoto,
  isImageDataUrl,
  isImageType,
  isPhotoSmallEnough,
  needsPhotoNow,
  nextQuality,
  PHOTO_MAX_BYTES,
  PHOTO_RETENTION_MS,
  requiresPhotoImpliesApproval,
  stalePhotoIds,
} from "@/lib/services/quests/claimPhotos";

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-10-20T12:00:00.000Z").getTime();

describe("photo rules", () => {
  it("asks for a photo only when the chore says so", () => {
    expect(asksForPhoto({ requiresPhoto: true })).toBe(true);
    expect(asksForPhoto({})).toBe(false);
    expect(asksForPhoto(null)).toBe(false);
  });

  it("a photo chore forces approval on, other chores are untouched", () => {
    expect(requiresPhotoImpliesApproval({ requiresApproval: false, requiresPhoto: true }).requiresApproval).toBe(true);
    const plain = { requiresApproval: false };
    expect(requiresPhotoImpliesApproval(plain)).toBe(plain);
    expect(requiresPhotoImpliesApproval({ requiresApproval: true }).requiresApproval).toBe(true);
  });

  it("a photo chore needs approval in a trusted hour, an approval chore does not", () => {
    const trusted = { trustedUntil: new Date(NOW + 3600_000).toISOString() };
    const now = new Date(NOW);
    expect(claimNeedsApproval({ requiresApproval: true, requiresPhoto: true }, trusted, now)).toBe(true);
    expect(claimNeedsApproval({ requiresApproval: true }, trusted, now)).toBe(false);
    expect(claimNeedsApproval({ requiresApproval: true }, undefined, now)).toBe(true);
    expect(claimNeedsApproval({ requiresApproval: false }, undefined, now)).toBe(false);
  });

  it("the picture is asked for unless the claimant is the only Game Master", () => {
    const quest = { requiresApproval: true, requiresPhoto: true };
    const family = { gm: { id: "gm", isAdult: true }, kid: { id: "kid" } };
    expect(needsPhotoNow(quest, "kid", family)).toBe(true);
    expect(needsPhotoNow(quest, "gm", family)).toBe(false);
    expect(needsPhotoNow(quest, "gm", { ...family, gm2: { id: "gm2", isAdult: true } })).toBe(true);
    expect(needsPhotoNow({ requiresApproval: true }, "kid", family)).toBe(false);
  });
});

describe("photo size rules", () => {
  it("shrinks the longest side to 1024 and keeps the ratio", () => {
    expect(fitPhoto(4000, 3000)).toEqual({ width: 1024, height: 768 });
    expect(fitPhoto(3000, 4000)).toEqual({ width: 768, height: 1024 });
  });

  it("never enlarges a small picture and refuses an empty one", () => {
    expect(fitPhoto(640, 480)).toEqual({ width: 640, height: 480 });
    expect(fitPhoto(0, 480)).toEqual({ width: 0, height: 0 });
    expect(fitPhoto(Number.NaN, 5)).toEqual({ width: 0, height: 0 });
  });

  it("accepts image types only", () => {
    expect(isImageType("image/jpeg")).toBe(true);
    expect(isImageType("image/heic")).toBe(true);
    expect(isImageType("application/pdf")).toBe(false);
    expect(isImageType("")).toBe(false);
    expect(isImageDataUrl("data:image/jpeg;base64,AAAA")).toBe(true);
    expect(isImageDataUrl("data:text/html;base64,AAAA")).toBe(false);
    expect(isImageDataUrl(42)).toBe(false);
  });

  it("measures a data URL and holds it to the cap", () => {
    expect(dataUrlBytes("data:image/jpeg;base64,AAAA")).toBe(3);
    expect(dataUrlBytes("data:image/jpeg;base64,AA==")).toBe(1);
    expect(dataUrlBytes("nonsense")).toBe(0);
    const big = `data:image/jpeg;base64,${"A".repeat(Math.ceil(((PHOTO_MAX_BYTES + 10) * 4) / 3))}`;
    expect(isPhotoSmallEnough(big)).toBe(false);
    expect(isPhotoSmallEnough("data:image/jpeg;base64,AAAA")).toBe(true);
  });

  it("lowers the quality in steps and stops at the floor", () => {
    expect(nextQuality(0.7)).toBe(0.6);
    expect(nextQuality(0.4)).toBeNull();
  });
});

const entry = (overrides: Partial<QuestLogEntry>): QuestLogEntry =>
  ({
    id: "e",
    questId: "q",
    questName: "Make your bed",
    userId: "kid",
    completedAt: new Date(NOW - 20 * DAY).toISOString(),
    dayKey: "2026-09-30",
    status: "approved",
    source: "claim",
    rewards: { xp: 1, gp: 1, ap: 1 },
    rewardsApplied: true,
    ...overrides,
  } as QuestLogEntry);

describe("stalePhotoIds", () => {
  it("keeps a pending claim's photo however old, and a fresh settled one", () => {
    const entries = [
      entry({ id: "old-pending", status: "pending" }),
      entry({ id: "fresh", reviewedAt: new Date(NOW - 2 * DAY).toISOString() }),
    ];
    expect(stalePhotoIds([{ id: "old-pending" }, { id: "fresh" }], entries, NOW)).toEqual([]);
  });

  it("deletes photos 7 days after approval or rejection, counted from the review", () => {
    const entries = [
      entry({ id: "approved", reviewedAt: new Date(NOW - 8 * DAY).toISOString() }),
      entry({ id: "rejected", status: "rejected", reviewedAt: new Date(NOW - PHOTO_RETENTION_MS).toISOString() }),
      entry({ id: "claimed-long-ago-reviewed-today", reviewedAt: new Date(NOW).toISOString() }),
    ];
    const photos = entries.map(({ id }) => ({ id }));
    expect(stalePhotoIds(photos, entries, NOW)).toEqual(["approved", "rejected"]);
  });

  it("deletes a photo whose log entry is gone", () => {
    expect(stalePhotoIds([{ id: "ghost" }], [], NOW)).toEqual(["ghost"]);
  });
});

/** An in-memory stand-in for the ionic Storage, as the other DB specs use. */
const fakeStorage = () => {
  const data = new Map<string, unknown>();
  const storage: any = {
    create: async () => storage,
    get: async (key: string) => (data.has(key) ? data.get(key) : null),
    set: async (key: string, value: unknown) => {
      data.set(key, value);
    },
    remove: async (key: string) => {
      data.delete(key);
    },
    keys: async () => Array.from(data.keys()),
    clear: async () => data.clear(),
  };
  return storage;
};

describe("ClaimPhotoDb", () => {
  const jpeg = "data:image/jpeg;base64,AAAA";
  let db: ClaimPhotoDb;

  beforeEach(() => {
    db = new ClaimPhotoDb(fakeStorage());
  });

  it("stores, reads and removes a photo by entry id", async () => {
    expect(await db.getPhoto("e1")).toBeNull();
    await db.setPhoto("e1", "kid", jpeg);
    expect((await db.getPhoto("e1"))?.dataUrl).toBe(jpeg);
    await db.removePhoto("e1");
    expect(await db.getPhoto("e1")).toBeNull();
  });

  it("purges only the settled-and-old photos and orphans", async () => {
    await db.setPhoto("old", "kid", jpeg);
    await db.setPhoto("fresh", "kid", jpeg);
    await db.setPhoto("pending", "kid", jpeg);
    await db.setPhoto("orphan", "kid", jpeg);
    const entries = [
      entry({ id: "old", reviewedAt: new Date(NOW - 9 * DAY).toISOString() }),
      entry({ id: "fresh", reviewedAt: new Date(NOW - DAY).toISOString() }),
      entry({ id: "pending", status: "pending" }),
    ];
    expect(await db.purgeSettled(entries, PHOTO_RETENTION_MS, NOW)).toBe(2);
    expect((await db.allPhotos()).map((photo) => photo.id).sort()).toEqual(["fresh", "pending"]);
  });

  it("removes every photo of a removed hero", async () => {
    await db.setPhoto("a", "kid", jpeg);
    await db.setPhoto("b", "kid", jpeg);
    await db.setPhoto("c", "sis", jpeg);
    expect(await db.removeForHero("kid")).toBe(2);
    expect((await db.allPhotos()).map((photo) => photo.id)).toEqual(["c"]);
  });
});

import type { Achievement } from "@/lib/databases/AchievementDb";
import type { QuestLogEntry } from "@/lib/databases/QuestLogDb";
import { isTrustedHour, type HeroQuestEffects } from "@/lib/engine/quests/QuestSchedule";
import { isSoleGameMaster, type Roster } from "@/lib/services/quests/approvalRouting";

/**
 * Photo proof: a chore can ask the hero for a picture when they claim it, and the Game Master reviews it later.
 *
 * PRIVACY: a child's photo stays on THIS device (ClaimPhotoDb). It is never put in a family event, the outbox, a backup
 * file or any request to the Town Hall. Uploading one would need a new `claim.photo` kind, server storage and a
 * parent's consent (see services/multiplayer/FAMILY_EVENTS.md).
 *
 * This file is the pure rules: whether a chore needs approval or a photo, and the size rules for a picture.
 * The browser side (file input, canvas) is claimPhotoImage.ts.
 */

/** The longest side of a stored photo, in pixels */
export const PHOTO_MAX_SIDE = 1024;
/** The JPEG quality a photo is first encoded at */
export const PHOTO_QUALITY = 0.7;
/** The lowest quality tried while squeezing a photo under the cap */
export const PHOTO_MIN_QUALITY = 0.35;
/** A stored photo is at most this many bytes (about 400 KB) */
export const PHOTO_MAX_BYTES = 400 * 1024;
/** A photo is deleted this long after its claim was settled */
export const PHOTO_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

type PhotoRule = Pick<Achievement, "requiresApproval"> & { requiresPhoto?: boolean };

/** A chore that asks for a photo */
export const asksForPhoto = (quest: { requiresPhoto?: boolean } | null | undefined): boolean => Boolean(quest?.requiresPhoto);

/** A photo chore must be reviewed, so it forces approval. Returns the chore's fields with approval locked on. */
export const requiresPhotoImpliesApproval = <T extends PhotoRule>(quest: T): T =>
  asksForPhoto(quest) && !quest.requiresApproval ? { ...quest, requiresApproval: true } : quest;

/**
 * Whether claiming this chore holds it for a Game Master. A photo chore always does (trusted hour or not); an ordinary
 * approval chore waits unless the hero is in a trusted hour. (A sole Game Master is auto-approved later, by completeQuest.)
 */
export const claimNeedsApproval = (
  quest: PhotoRule,
  effects: HeroQuestEffects | undefined,
  now: Date = new Date()
): boolean => {
  const isPhotoChore = asksForPhoto(quest);
  if (isPhotoChore) return true;
  return Boolean(quest.requiresApproval) && !isTrustedHour(effects, now);
};

/** Whether the claim must start with a picture: a photo chore, unless the claimant is the only Game Master (nobody would look). */
export const needsPhotoNow = (quest: PhotoRule, heroId: string, users: Roster): boolean => {
  const isPhotoChore = asksForPhoto(quest);
  if (!isPhotoChore) return false;
  return !isSoleGameMaster(heroId, users);
};

export interface PhotoSize {
  width: number;
  height: number;
}

/** The size a picture is drawn at: its longest side at most `max`, the ratio kept, never enlarged. */
export const fitPhoto = (width: number, height: number, max: number = PHOTO_MAX_SIDE): PhotoSize => {
  const isUnreadable = !(width > 0) || !(height > 0);
  if (isUnreadable) return { width: 0, height: 0 };
  const longest = Math.max(width, height);
  const isSmallEnough = longest <= max;
  if (isSmallEnough) return { width: Math.round(width), height: Math.round(height) };
  const scale = max / longest;
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
};

/** Only pictures are taken: a file whose type is not image/* is turned away */
export const isImageType = (type: string | null | undefined): boolean => /^image\//i.test(type || "");

const DATA_URL = /^data:image\/(jpeg|png|webp);base64,/i;

export const isImageDataUrl = (value: unknown): value is string => typeof value === "string" && DATA_URL.test(value);

/** The decoded size of a base64 data URL, in bytes (0 when it is not one) */
export const dataUrlBytes = (dataUrl: string): number => {
  const comma = dataUrl.indexOf(",");
  const hasNoBody = comma < 0;
  if (hasNoBody) return 0;
  const body = dataUrl.slice(comma + 1);
  const padding = (body.match(/=+$/)?.[0] ?? "").length;
  return Math.max(0, Math.floor((body.length * 3) / 4) - padding);
};

export const isPhotoSmallEnough = (dataUrl: string, max: number = PHOTO_MAX_BYTES): boolean => dataUrlBytes(dataUrl) <= max;

/** The next JPEG quality to try when a photo is still over the cap; null when the floor is reached. */
export const nextQuality = (quality: number): number | null => {
  const lower = Math.round((quality - 0.1) * 100) / 100;
  return lower >= PHOTO_MIN_QUALITY ? lower : null;
};

export interface StoredPhoto {
  /** The quest log entry id this photo belongs to */
  id: string;
  userId: string;
  dataUrl: string;
  /** ISO timestamp of when the photo was taken */
  takenAt: string;
}

/** True when the claim was approved or rejected at or before `cutoff` (ms); a pending claim never is */
const isSettledBefore = (entry: QuestLogEntry, cutoff: number): boolean => {
  const isPending = entry.status === "pending";
  if (isPending) return false;
  const settledAt = new Date(entry.reviewedAt || entry.completedAt).getTime();
  return Number.isFinite(settledAt) && settledAt <= cutoff;
};

/**
 * The photos to delete: those whose claim was settled (approved or rejected) at least `olderThanMs` ago, and those whose
 * log entry no longer exists. A claim still pending keeps its photo however old it is.
 */
export const stalePhotoIds = (
  photos: readonly Pick<StoredPhoto, "id">[],
  entries: readonly QuestLogEntry[],
  now: number,
  olderThanMs: number = PHOTO_RETENTION_MS
): string[] => {
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  return photos
    .filter((photo) => {
      const entry = byId.get(photo.id);
      return entry ? isSettledBefore(entry, now - olderThanMs) : true;
    })
    .map((photo) => photo.id);
};

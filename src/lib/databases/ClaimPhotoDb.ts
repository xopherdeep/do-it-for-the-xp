import { Drivers, Storage } from "@ionic/storage";
import DbStorageApi from "./DbStorageApi";
import type { QuestLogEntry } from "@/lib/databases/QuestLogDb";
import { PHOTO_RETENTION_MS, stalePhotoIds, type StoredPhoto } from "@/lib/services/quests/claimPhotos";

/**
 * Photo proof for held claims, keyed by the quest log entry id.
 * PRIVACY: local to this device. Never added to BACKUP_STORES (a backup file is shared and photos are big and private),
 * and never sent to the Town Hall (family events carry no photo; see claimPhotos.ts).
 */
export const claimPhotoStorage = new Storage({
  name: "__xp_claim_photos",
  driverOrder: [Drivers.IndexedDB, Drivers.LocalStorage],
});

export class ClaimPhotoDb extends DbStorageApi {
  public async setPhoto(entryId: string, userId: string, dataUrl: string): Promise<StoredPhoto> {
    const photo: StoredPhoto = { id: entryId, userId, dataUrl, takenAt: new Date().toISOString() };
    await this.set(entryId, photo);
    return photo;
  }

  public async getPhoto(entryId: string): Promise<StoredPhoto | null> {
    const stored = await this.get(entryId);
    return (stored as StoredPhoto) ?? null;
  }

  public async removePhoto(entryId: string): Promise<void> {
    await this.remove(entryId);
  }

  public async allPhotos(): Promise<StoredPhoto[]> {
    return ((await this.getAll()) as (StoredPhoto | null)[]).filter((photo): photo is StoredPhoto => Boolean(photo));
  }

  /** Delete every photo of a hero (the hero was removed). Returns how many went. */
  public async removeForHero(userId: string): Promise<number> {
    const mine = (await this.allPhotos()).filter((photo) => photo.userId === String(userId));
    await Promise.all(mine.map((photo) => this.remove(photo.id)));
    return mine.length;
  }

  /** Delete the photos of claims settled `olderThanMs` ago, and orphans. Returns how many went. */
  public async purgeSettled(
    entries: readonly QuestLogEntry[],
    olderThanMs: number = PHOTO_RETENTION_MS,
    now: number = Date.now()
  ): Promise<number> {
    const stale = stalePhotoIds(await this.allPhotos(), entries, now, olderThanMs);
    await Promise.all(stale.map((id) => this.remove(id)));
    return stale.length;
  }
}

let instance: ClaimPhotoDb | null = null;
export const getClaimPhotoDb = (): ClaimPhotoDb => {
  if (!instance) instance = new ClaimPhotoDb(claimPhotoStorage);
  return instance;
};

export default ClaimPhotoDb;

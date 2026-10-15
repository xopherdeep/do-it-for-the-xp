import { Drivers, Storage } from "@ionic/storage";
import DbStorageApi from "./DbStorageApi";
import type { TownHallLink, TownHallPost } from "@/lib/services/townhall/townHallTypes";

/**
 * What this device keeps for the Town Hall: the family's WordPress link and the posts waiting to be sent.
 *
 * This database is never added to BACKUP_STORES: a backup file must not carry the family's sign-in or unsent posts.
 */
export const townHallStorage = new Storage({
  name: "__xp_town_hall",
  driverOrder: [Drivers.IndexedDB, Drivers.LocalStorage],
});

const LINK_KEY = "link";
const POSTS_KEY = "posts";

export class TownHallDb extends DbStorageApi {
  public async getLink(): Promise<TownHallLink | null> {
    const stored = await this.get(LINK_KEY);
    const isLink = !!stored && typeof stored === "object" && !Array.isArray(stored);
    return isLink ? (stored as TownHallLink) : null;
  }

  public async saveLink(link: TownHallLink): Promise<void> {
    await this.set(LINK_KEY, link);
  }

  public async clearLink(): Promise<void> {
    await this.remove(LINK_KEY);
  }

  public async getPosts(): Promise<TownHallPost[]> {
    const stored = await this.get(POSTS_KEY);
    return Array.isArray(stored) ? (stored as TownHallPost[]) : [];
  }

  public async savePosts(posts: TownHallPost[]): Promise<void> {
    await this.set(POSTS_KEY, posts);
  }
}

let instance: TownHallDb | null = null;
export const getTownHallDb = (): TownHallDb => {
  if (!instance) instance = new TownHallDb(townHallStorage);
  return instance;
};

export default TownHallDb;

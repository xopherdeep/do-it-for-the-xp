import { Drivers, Storage } from "@ionic/storage";
import DbStorageApi from "./DbStorageApi";
import type { XpNotification } from "@/lib/services/notifications/Notifications";

/**
 * The hero's notification feed on disk: one record per hero (keyed by the hero id) holding their
 * notifications, newest first. The notifications store (`src/lib/store/stores/notifications.ts`)
 * reads a hero's feed once and writes it back after every change, the way ProfileDb backs the user store.
 */
export const notificationsStorage = new Storage({
  name: "__notifications",
  driverOrder: [Drivers.IndexedDB, Drivers.LocalStorage],
});

export class NotificationsDb extends DbStorageApi {
  public async getForHero(heroId: string): Promise<XpNotification[]> {
    const stored = await this.get(String(heroId));
    return Array.isArray(stored) ? (stored as XpNotification[]).filter(Boolean) : [];
  }

  public async saveForHero(heroId: string, notifications: readonly XpNotification[]): Promise<void> {
    await this.set(String(heroId), notifications);
  }

  public async clearForHero(heroId: string): Promise<void> {
    await this.remove(String(heroId));
  }
}

let instance: NotificationsDb | null = null;
export const getNotificationsDb = (): NotificationsDb => {
  if (!instance) instance = new NotificationsDb(notificationsStorage);
  return instance;
};

export default NotificationsDb;

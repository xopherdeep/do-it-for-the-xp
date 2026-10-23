import { Storage } from "@ionic/storage"
import { toastController } from "@ionic/vue";
import { emitRecordWritten, trackWrite } from "@/lib/services/sync/recordSignals";
import { isSyncedStore } from "@/lib/services/sync/syncScopes";

/**
 * What the sync layer calls this store: the name the Storage was created with. Ionic Storage 4 keeps its config private (`_config`) and
 * has no public getter, so it is read from there; a storage that cannot tell gives "".
 */
const storeNameOf = (storage: Storage): string => {
  const { _config: config } = storage as unknown as { _config?: { name?: string } };
  return config?.name ?? "";
};

export class DbStorageApi {
  constructor(public storage: Storage) {
    this.init()
  }
  public async init() {
    const storage = await this.storage.create();
    this.storage = storage;
  }
  private flatten(value: any) {
    return JSON.parse(JSON.stringify(value))
  }

  /** Every write is noted while it is on its way (Family Sync's rest waits for it), then announced */
  public set(key: string, value: any): Promise<void> {
    const flat = this.flatten(value);
    return trackWrite(
      (async () => {
        await this.storage.set(key, flat);
        emitRecordWritten({ store: storeNameOf(this.storage), key, value: flat });
      })()
    );
  }

  public async get(key: string) {
    return this.storage.get(key);
  }

  public remove(key: string): Promise<void> {
    return trackWrite(this.removeNow(key));
  }

  private async removeNow(key: string) {
    const store = storeNameOf(this.storage);
    // Only a store Family Sync carries is read first (once the record is gone there is nothing left to name its hero from);
    // the others (claim photos, this device's settings) are never read for it
    const isSynced = isSyncedStore(store);
    const previous = isSynced ? await this.storage.get(key) : undefined;
    await this.storage.remove(key);
    emitRecordWritten(isSynced ? { store, key, value: null, previous } : { store, key, value: null });
  }

  public async clear() {
    const store = storeNameOf(this.storage);
    // The keys, and for a synced store what they held, are read first: once the store is empty there is nothing left to name
    const keys = await this.storage.keys();
    const isSynced = isSyncedStore(store);
    const held = isSynced ? await Promise.all(keys.map((key) => this.storage.get(key))) : [];
    await this.storage.clear();
    keys.forEach((key, index) => emitRecordWritten(isSynced ? { store, key, value: null, previous: held[index] } : { store, key, value: null }));
  }

  public async keys() {
    return await this.storage.keys();
  }

  public async getAll() {
    const mapKeyToData = (k: string) => this.get(k)
    const promiseMap = (keys: string[]) => Promise.all(keys.map(mapKeyToData))
    return await this.storage.keys().then(promiseMap);
  }

  public async showSuccessToast(message?: string) {
    const toast = await toastController.create({
      message: message || `Save Successful!`,
      duration: 2500,
      position: 'top',
      buttons: [
        {
          text: 'Dismiss',
          cssClass: 'rpg-toast',
          role: 'cancel',
        }
      ]
    });
    await toast.present();
  }

  public async showDeleteToast() {
    const toast = await toastController.create({
      message: `Delete Successful!`,
      duration: 2500,
      position: 'top',
      buttons: [
        {
          text: 'Dismiss',
          cssClass: 'rpg-toast',
          role: 'cancel',
        }
      ]
    });
    await toast.present();
  }

  public async showWarningToast(message: string) {
    const toast = await toastController.create({
      message: message,
      duration: 2500,
      position: 'top',
      color: 'warning',
      buttons: [
        {
          text: 'Dismiss',
          cssClass: 'rpg-toast',
          role: 'cancel',
        }
      ]
    });
    await toast.present();
  }

  public async showErrorToast(message: string) {
    const toast = await toastController.create({
      message: message,
      duration: 2500,
      position: 'top',
      color: 'danger',
      buttons: [
        {
          text: 'Dismiss',
          cssClass: 'rpg-toast',
          role: 'cancel',
        }
      ]
    });
    await toast.present();
  }
}

export default DbStorageApi
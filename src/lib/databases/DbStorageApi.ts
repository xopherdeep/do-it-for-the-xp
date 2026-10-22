import { Storage } from "@ionic/storage"
import { toastController } from "@ionic/vue";
import { emitRecordWritten } from "@/lib/services/sync/recordSignals";

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

  public async set(key: string, value: any) {
    const flat = this.flatten(value);
    await this.storage.set(key, flat);
    emitRecordWritten({ store: storeNameOf(this.storage), key, value: flat });
  }

  public async get(key: string) {
    return this.storage.get(key);
  }

  public async remove(key: string) {
    await this.storage.remove(key);
    emitRecordWritten({ store: storeNameOf(this.storage), key, value: null });
  }

  public async clear() {
    // The keys are read first: once the store is empty there is nothing left to name
    const keys = await this.storage.keys();
    await this.storage.clear();
    const store = storeNameOf(this.storage);
    keys.forEach((key) => emitRecordWritten({ store, key, value: null }));
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
import { Storage } from "@ionic/storage"
import { toastController } from "@ionic/vue";

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
    await this.storage.set(key, this.flatten(value));
  }

  public async get(key: string) {
    const value = await this.storage.get(key)
    return value;
  }

  public async remove(key: string) {
    await this.storage.remove(key);
  }

  public async clear() {
    await this.storage.clear();
  }

  public async getAll() {
    const mapKeyToData = (k: string) => this.get(k)
    const promiseMap = (keys: string[]) => Promise.all(keys.map(mapKeyToData))
    return await this.storage.keys().then(promiseMap);
  }

  public async showSuccessToast() {
    const toast = await toastController.create({
      message: `Save Succesfull!`,
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
      message: `Delete Succesfull!`,
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

}

export default DbStorageApi
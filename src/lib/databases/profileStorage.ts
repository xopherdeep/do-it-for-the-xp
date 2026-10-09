import { Drivers, Storage } from "@ionic/storage";

/**
 * Shared Ionic Storage instance backing ProfileDb.
 * Lives in a plain TS module so services, hooks and stores can import it
 * without depending on a .vue single-file component.
 */
export const profileStorage = new Storage({
  name: "__profiles",
  driverOrder: [Drivers.IndexedDB, Drivers.LocalStorage],
});

export default profileStorage;

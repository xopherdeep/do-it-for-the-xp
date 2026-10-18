import debug from "@/lib/utils/debug";

/**
 * Asks the browser to keep this site's storage. Without it Safari and Chrome may evict IndexedDB when the device runs
 * low on space (Safari also after weeks unused), and for most families that is the only copy of everything. Granted
 * quietly for an installed PWA; elsewhere the browser decides. Harmless in the phone app, where nothing is evicted.
 * Resolves to whether storage is persistent now; never throws.
 */
export const requestPersistentStorage = async (storage: StorageManager | undefined = globalThis.navigator?.storage): Promise<boolean> => {
  const cannotAsk = !storage || typeof storage.persist !== "function";
  if (cannotAsk) return false;
  try {
    const isPersisted = typeof storage.persisted === "function" && (await storage.persisted());
    return isPersisted || (await storage.persist());
  } catch (error) {
    debug.warn("storage: could not ask the browser to keep our data", error);
    return false;
  }
};

import { Capacitor } from "@capacitor/core";
import { Directory, Encoding, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import debug from "@/lib/utils/debug";

/**
 * Puts a finished backup file somewhere the family can get it back from.
 *
 * Browser: an `<a download>` of a Blob. Phone app: a WebView has no download handler, so that link would do nothing
 * while the app reported success. There the file is written with Capacitor Filesystem instead: on Android straight
 * into the public Documents folder (it outlives the app); on iOS, or when Android refuses, into the cache and handed
 * to the share sheet so the person picks Files, Drive or mail. Closing that sheet saves nothing, and says so.
 */

/** Where the backup ended up, in words for the toast */
export interface SavedBackupFile {
  fileName: string;
  /** Finishes "Backup <file> saved ...": "to Downloads", "in Documents" or "through the share sheet" */
  savedTo: string;
}

/** The backup was made but could not be put anywhere. Nothing on the device changed. */
export class BackupNotSavedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BackupNotSavedError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

const OBJECT_URL_LIFETIME_MS = 10_000;

/** Whether an error means the person simply closed the share sheet */
const isDismissal = (error: unknown): boolean => {
  const text = `${(error as { name?: string })?.name || ""} ${(error as { message?: string })?.message || ""}`;
  return /abort|cancel/i.test(text);
};

const reasonOf = (error: unknown): string => (error instanceof Error ? error.message : String(error));

/** Hands the text to the browser as a file download. */
export const downloadInBrowser = (fileName: string, json: string): SavedBackupFile => {
  // A Blob URL has no size limit; a data: URL stops working in some browsers at about 2 MB
  const useBlob = typeof Blob !== "undefined" && typeof URL !== "undefined" && typeof URL.createObjectURL === "function";
  const href = useBlob
    ? URL.createObjectURL(new Blob([json], { type: "application/json" }))
    : `data:application/json;charset=utf-8,${encodeURIComponent(json)}`;

  const link = document.createElement("a");
  link.href = href;
  link.download = fileName;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  if (useBlob) setTimeout(() => URL.revokeObjectURL(href), OBJECT_URL_LIFETIME_MS);
  return { fileName, savedTo: "to Downloads" };
};

/** Android only: the public Documents folder survives an uninstall. False when Android says no (old phones without the storage permission). */
const saveToAndroidDocuments = async (fileName: string, json: string): Promise<boolean> => {
  try {
    const { publicStorage } = await Filesystem.checkPermissions();
    const isAllowed = publicStorage === "granted" || (await Filesystem.requestPermissions()).publicStorage === "granted";
    if (!isAllowed) return false;
    await Filesystem.writeFile({ path: fileName, data: json, directory: Directory.Documents, encoding: Encoding.UTF8, recursive: true });
    return true;
  } catch (error) {
    debug.warn("backup: could not write to Documents, using the share sheet", error);
    return false;
  }
};

/** Writes the file to the app's cache and opens the share sheet on it. Throws BackupNotSavedError when nothing took it. */
const shareFromCache = async (fileName: string, json: string): Promise<SavedBackupFile> => {
  let uri: string;
  try {
    ({ uri } = await Filesystem.writeFile({ path: fileName, data: json, directory: Directory.Cache, encoding: Encoding.UTF8 }));
  } catch (error) {
    throw new BackupNotSavedError(`The backup file could not be written on this phone: ${reasonOf(error)}`);
  }
  try {
    await Share.share({ title: fileName, files: [uri], dialogTitle: "Save your backup" });
  } catch (error) {
    throw new BackupNotSavedError(
      isDismissal(error)
        ? "The share sheet was closed, so the backup was not saved. Try again and pick Save to Files, Drive or mail."
        : `The share sheet could not open: ${reasonOf(error)}`
    );
  }
  return { fileName, savedTo: "through the share sheet" };
};

/** Saves the backup text as `fileName` the way this platform can. Throws BackupNotSavedError instead of pretending. */
export const saveBackupFile = async (
  fileName: string,
  json: string,
  platform: string = Capacitor.getPlatform()
): Promise<SavedBackupFile> => {
  const isWeb = platform === "web";
  if (isWeb) return downloadInBrowser(fileName, json);
  const isSavedInDocuments = platform === "android" && (await saveToAndroidDocuments(fileName, json));
  if (isSavedInDocuments) return { fileName, savedTo: "in Documents" };
  return shareFromCache(fileName, json);
};

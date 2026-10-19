import { Capacitor } from "@capacitor/core";
import { Directory, Encoding, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import debug from "@/lib/utils/debug";

/**
 * Puts a finished text file (a backup, a pack) somewhere the family can get it back from.
 *
 * Browser: an `<a download>` of a Blob. Phone app: a WebView has no download handler, so that link would do nothing
 * while the app reported success. There the file is written with Capacitor Filesystem instead: on Android straight
 * into the public Documents folder (it outlives the app); on iOS, or when Android refuses, into the cache and handed
 * to the share sheet so the person picks Files, Drive or mail. Closing that sheet saves nothing, and says so.
 */

/** Where the file ended up, in words for the toast or alert */
export interface SavedBackupFile {
  fileName: string;
  /** Finishes "<file> saved ...": "to Downloads", "in Documents" or "through the share sheet" */
  savedTo: string;
}

/** What is being saved ("backup", "pack") and, for tests, the platform to save for */
export interface SaveTextFileOptions {
  /** One word for the file in messages: "backup" gives "Save your backup" and "The backup file could not be written" */
  label: string;
  platform?: string;
}

/** The file was made but could not be put anywhere (a backup or a pack). Nothing on the device changed. */
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
    debug.warn("saveTextFile: could not write to Documents, using the share sheet", error);
    return false;
  }
};

/** Writes the file to the app's cache and opens the share sheet on it. Throws BackupNotSavedError when nothing took it. */
const shareFromCache = async (fileName: string, json: string, label: string): Promise<SavedBackupFile> => {
  let uri: string;
  try {
    ({ uri } = await Filesystem.writeFile({ path: fileName, data: json, directory: Directory.Cache, encoding: Encoding.UTF8 }));
  } catch (error) {
    throw new BackupNotSavedError(`The ${label} file could not be written on this phone: ${reasonOf(error)}`);
  }
  try {
    await Share.share({ title: fileName, files: [uri], dialogTitle: `Save your ${label}` });
  } catch (error) {
    throw new BackupNotSavedError(
      isDismissal(error)
        ? `The share sheet was closed, so the ${label} was not saved. Try again and pick Save to Files, Drive or mail.`
        : `The share sheet could not open: ${reasonOf(error)}`
    );
  }
  return { fileName, savedTo: "through the share sheet" };
};

/** Saves the text as `fileName` the way this platform can. Throws BackupNotSavedError instead of pretending. */
export const saveTextFile = async (fileName: string, text: string, options: SaveTextFileOptions): Promise<SavedBackupFile> => {
  const { label, platform = Capacitor.getPlatform() } = options;
  const isWeb = platform === "web";
  if (isWeb) return downloadInBrowser(fileName, text);
  const isSavedInDocuments = platform === "android" && (await saveToAndroidDocuments(fileName, text));
  if (isSavedInDocuments) return { fileName, savedTo: "in Documents" };
  return shareFromCache(fileName, text, label);
};

/** Saves the backup text as `fileName` the way this platform can. Throws BackupNotSavedError instead of pretending. */
export const saveBackupFile = (fileName: string, json: string, platform: string = Capacitor.getPlatform()): Promise<SavedBackupFile> =>
  saveTextFile(fileName, json, { label: "backup", platform });

/** The line a success alert opens with: the file and where it went ("a.json was saved to Downloads.") */
export const savedFileLine = (saved: SavedBackupFile): string => `${saved.fileName} was saved ${saved.savedTo}.`;

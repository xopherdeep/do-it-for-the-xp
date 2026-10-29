import { Preferences } from "@capacitor/preferences";
import debug from "@/lib/utils/debug";

export const DLC_VERSION_KEY = "xp.dlc_version";
export const DLC_CACHE_NAME = "xp-dlc-v1";
export const DLC_PRIMARY_ENDPOINT = "https://pub-89620c9706034c37924bd717c0bc6ea7.r2.dev/dlc";
export const DLC_FALLBACK_ENDPOINT = "https://doit.forthexp.com/wp-content/uploads/xp-dlc";
export const DLC_PAGES_ENDPOINT = "https://app.forthexp.com";

export const DLC_ENDPOINTS = [
  DLC_PRIMARY_ENDPOINT,
  DLC_FALLBACK_ENDPOINT,
  DLC_PAGES_ENDPOINT,
];

export interface DlcFileItem {
  path: string;
  size: number;
  sha256: string;
}

export interface DlcManifest {
  version: string;
  generatedAt: string;
  totalFiles: number;
  totalBytes: number;
  bundle: string;
  files: DlcFileItem[];
}

export type DlcStatus = "idle" | "checking" | "available" | "downloading" | "ready" | "error";

export interface DlcProgress {
  status: DlcStatus;
  percent: number;
  downloadedBytes: number;
  totalBytes: number;
  downloadedFiles: number;
  totalFiles: number;
  currentFile: string;
  errorMessage: string;
}

export class AssetDlcService {
  private static instance: AssetDlcService;

  public progress: DlcProgress = {
    status: "idle",
    percent: 0,
    downloadedBytes: 0,
    totalBytes: 0,
    downloadedFiles: 0,
    totalFiles: 0,
    currentFile: "",
    errorMessage: "",
  };

  private manifest: DlcManifest | null = null;
  private activeEndpoint = DLC_PRIMARY_ENDPOINT;

  public static getInstance(): AssetDlcService {
    const hasExistingInstance = Boolean(AssetDlcService.instance);
    if (!hasExistingInstance) {
      AssetDlcService.instance = new AssetDlcService();
    }
    return AssetDlcService.instance;
  }

  public async checkStatus(): Promise<boolean> {
    const isCacheSupported = typeof window !== "undefined" && "caches" in window;
    if (!isCacheSupported) {
      this.progress.status = "ready";
      return true;
    }

    try {
      this.progress.status = "checking";
      const stored = await Preferences.get({ key: DLC_VERSION_KEY });
      const storedVersion = stored.value;

      const cache = await caches.open(DLC_CACHE_NAME);
      const cachedKeys = await cache.keys();
      const hasCachedFiles = cachedKeys.length > 50;
      const isVersionRecorded = Boolean(storedVersion);

      const isAlreadyReady = hasCachedFiles && isVersionRecorded;
      if (isAlreadyReady) {
        this.progress.status = "ready";
        this.progress.percent = 100;
        return true;
      }

      this.progress.status = "available";
      return false;
    } catch (err: unknown) {
      debug.warn("[AssetDlcService] Status check failed:", err);
      this.progress.status = "available";
      return false;
    }
  }

  public async fetchManifest(): Promise<DlcManifest | null> {
    const hasCachedManifest = Boolean(this.manifest);
    if (hasCachedManifest) return this.manifest;

    for (const endpoint of DLC_ENDPOINTS) {
      const manifestUrl = `${endpoint}/manifest.json`;
      try {
        const response = await fetch(manifestUrl, { mode: "cors" });
        const isResponseOk = response.ok;
        if (isResponseOk) {
          this.manifest = await response.json();
          this.activeEndpoint = endpoint;
          return this.manifest;
        }
      } catch (err: unknown) {
        debug.log(`[AssetDlcService] Could not reach manifest at ${manifestUrl}:`, err);
      }
    }

    return null;
  }

  public async startDownload(onUpdate?: (progress: DlcProgress) => void): Promise<boolean> {
    const isCacheSupported = typeof window !== "undefined" && "caches" in window;
    if (!isCacheSupported) {
      this.progress.status = "ready";
      return true;
    }

    this.progress.status = "downloading";
    this.progress.errorMessage = "";
    onUpdate?.(this.progress);

    const manifest = await this.fetchManifest();
    const isManifestMissing = !manifest || !Array.isArray(manifest.files);
    if (isManifestMissing) {
      this.progress.status = "error";
      this.progress.errorMessage = "Could not fetch game asset manifest from servers.";
      onUpdate?.(this.progress);
      return false;
    }

    this.progress.totalFiles = manifest.files.length;
    this.progress.totalBytes = manifest.totalBytes;
    this.progress.downloadedFiles = 0;
    this.progress.downloadedBytes = 0;

    const cache = await caches.open(DLC_CACHE_NAME);
    const origin = typeof window !== "undefined" ? window.location.origin : "https://localhost";

    const concurrencyLimit = 6;
    let fileIndex = 0;
    const fileItems = manifest.files;

    const downloadWorker = async (): Promise<void> => {
      while (fileIndex < fileItems.length) {
        const currentIndex = fileIndex;
        fileIndex += 1;
        const item = fileItems[currentIndex];
        const isItemValid = Boolean(item && item.path);
        if (!isItemValid) continue;

        const normalizedPath = item.path.startsWith("/") ? item.path : `/${item.path}`;
        const targetRequestUrl = `${origin}${normalizedPath}`;
        const sourceDownloadUrl = `${this.activeEndpoint}${normalizedPath}`;

        try {
          this.progress.currentFile = normalizedPath;
          const remoteResponse = await fetch(sourceDownloadUrl, { mode: "cors" });
          const isDownloadOk = remoteResponse.ok;

          if (isDownloadOk) {
            await cache.put(targetRequestUrl, remoteResponse.clone());
            this.progress.downloadedBytes += item.size;
            this.progress.downloadedFiles += 1;
          }
        } catch {
          // chemx-allow: best-effort continue downloading remaining files if an individual asset fails
        }

        const calculatedPercent = Math.min(
          100,
          Math.floor((this.progress.downloadedBytes / this.progress.totalBytes) * 100)
        );
        this.progress.percent = calculatedPercent;
        onUpdate?.(this.progress);
      }
    };

    const workerSlots = Array.from({ length: concurrencyLimit }, () => downloadWorker());
    await Promise.all(workerSlots);

    await Preferences.set({ key: DLC_VERSION_KEY, value: manifest.version });
    this.progress.status = "ready";
    this.progress.percent = 100;
    onUpdate?.(this.progress);
    return true;
  }
}

export const dlcService = AssetDlcService.getInstance();

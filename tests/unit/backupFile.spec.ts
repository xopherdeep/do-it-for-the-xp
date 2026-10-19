import { BackupNotSavedError, saveBackupFile, savedFileLine, saveTextFile } from "@/lib/services/core/backupFile";

const mockFs = {
  checkPermissions: jest.fn(),
  requestPermissions: jest.fn(),
  writeFile: jest.fn(),
};
const mockShare = jest.fn();

jest.mock("@capacitor/filesystem", () => ({
  __esModule: true,
  Directory: { Documents: "DOCUMENTS", Cache: "CACHE" },
  Encoding: { UTF8: "utf8" },
  Filesystem: {
    checkPermissions: (...args: unknown[]) => mockFs.checkPermissions(...args),
    requestPermissions: (...args: unknown[]) => mockFs.requestPermissions(...args),
    writeFile: (...args: unknown[]) => mockFs.writeFile(...args),
  },
}));
jest.mock("@capacitor/share", () => ({ __esModule: true, Share: { share: (...args: unknown[]) => mockShare(...args) } }));
jest.mock("@/lib/utils/debug", () => ({ __esModule: true, default: { warn: jest.fn(), error: jest.fn() } }));

const FILE = "do-it-for-the-xp-backup-2026-10-18.json";
const JSON_TEXT = '{"version":1}';

beforeEach(() => {
  jest.clearAllMocks();
  mockFs.checkPermissions.mockResolvedValue({ publicStorage: "granted" });
  mockFs.requestPermissions.mockResolvedValue({ publicStorage: "granted" });
  mockFs.writeFile.mockResolvedValue({ uri: "file:///cache/backup.json" });
  mockShare.mockResolvedValue({});
});

describe("saveBackupFile in the browser", () => {
  let clicked: Array<{ download: string; href: string }>;
  let clickSpy: jest.SpyInstance;

  beforeEach(() => {
    clicked = [];
    clickSpy = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      clicked.push({ download: this.download, href: this.href });
    });
  });

  afterEach(() => {
    clickSpy.mockRestore();
    jest.useRealTimers();
    delete (URL as unknown as Record<string, unknown>).createObjectURL;
    delete (URL as unknown as Record<string, unknown>).revokeObjectURL;
  });

  it("downloads the text as a Blob file, then frees the URL, and never touches the phone plugins", async () => {
    jest.useFakeTimers();
    const createObjectURL = jest.fn((_blob: unknown) => "blob:backup-1");
    const revokeObjectURL = jest.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });

    await expect(saveBackupFile(FILE, JSON_TEXT, "web")).resolves.toEqual({ fileName: FILE, savedTo: "to Downloads" });
    expect(clicked).toEqual([{ download: FILE, href: "blob:backup-1" }]);
    expect(document.querySelector("a[download]")).toBeNull();
    jest.advanceTimersByTime(10_000);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:backup-1");
    expect(mockFs.writeFile).not.toHaveBeenCalled();
  });

  it("falls back to a data: URL where Blob URLs do not exist", async () => {
    await saveBackupFile(FILE, JSON_TEXT, "web");
    const prefix = "data:application/json;charset=utf-8,";
    expect(clicked[0].href.startsWith(prefix)).toBe(true);
    expect(decodeURIComponent(clicked[0].href.slice(prefix.length))).toBe(JSON_TEXT);
  });
});

describe("saveBackupFile in the phone app", () => {
  it("Android: writes the file into the public Documents folder, no share sheet", async () => {
    await expect(saveBackupFile(FILE, JSON_TEXT, "android")).resolves.toEqual({ fileName: FILE, savedTo: "in Documents" });
    expect(mockFs.writeFile).toHaveBeenCalledWith({ path: FILE, data: JSON_TEXT, directory: "DOCUMENTS", encoding: "utf8", recursive: true });
    expect(mockShare).not.toHaveBeenCalled();
  });

  it("Android: asks for storage on old phones, and uses the share sheet when refused", async () => {
    mockFs.checkPermissions.mockResolvedValue({ publicStorage: "prompt" });
    mockFs.requestPermissions.mockResolvedValue({ publicStorage: "denied" });
    await expect(saveBackupFile(FILE, JSON_TEXT, "android")).resolves.toEqual({ fileName: FILE, savedTo: "through the share sheet" });
    expect(mockFs.requestPermissions).toHaveBeenCalled();
    expect(mockFs.writeFile).toHaveBeenCalledTimes(1);
    expect(mockFs.writeFile).toHaveBeenCalledWith(expect.objectContaining({ directory: "CACHE" }));
  });

  it("Android: uses the share sheet when Documents refuses the write", async () => {
    mockFs.writeFile.mockRejectedValueOnce(new Error("EACCES")).mockResolvedValueOnce({ uri: "file:///cache/b.json" });
    await expect(saveBackupFile(FILE, JSON_TEXT, "android")).resolves.toEqual({ fileName: FILE, savedTo: "through the share sheet" });
    expect(mockShare).toHaveBeenCalledWith(expect.objectContaining({ files: ["file:///cache/b.json"] }));
  });

  it("iOS: writes to the cache and shares that file", async () => {
    await expect(saveBackupFile(FILE, JSON_TEXT, "ios")).resolves.toEqual({ fileName: FILE, savedTo: "through the share sheet" });
    expect(mockFs.writeFile).toHaveBeenCalledWith({ path: FILE, data: JSON_TEXT, directory: "CACHE", encoding: "utf8" });
    expect(mockShare).toHaveBeenCalledWith({ title: FILE, files: ["file:///cache/backup.json"], dialogTitle: "Save your backup" });
    expect(mockFs.checkPermissions).not.toHaveBeenCalled();
  });

  it("fails loudly when the share sheet is closed: nothing was saved", async () => {
    mockShare.mockRejectedValue(new Error("Share canceled"));
    const error = await saveBackupFile(FILE, JSON_TEXT, "ios").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(BackupNotSavedError);
    expect((error as Error).message).toMatch(/was not saved/);
  });

  it("fails loudly when the file cannot be written at all", async () => {
    mockFs.writeFile.mockRejectedValue(new Error("disk full"));
    await expect(saveBackupFile(FILE, JSON_TEXT, "ios")).rejects.toThrow(/could not be written on this phone: disk full/);
    expect(mockShare).not.toHaveBeenCalled();
  });
});

describe("saveTextFile, the path any text file takes (a pack file shares it with backups)", () => {
  const PACK_FILE = "the-neighbours-pack.json";
  const PACK_TEXT = '{"id":"pack-1"}';

  it("web: downloads it, and says it went to Downloads", async () => {
    const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    try {
      await expect(saveTextFile(PACK_FILE, PACK_TEXT, { label: "pack", platform: "web" })).resolves.toEqual({
        fileName: PACK_FILE,
        savedTo: "to Downloads",
      });
      expect(clickSpy).toHaveBeenCalledTimes(1);
      expect(mockFs.writeFile).not.toHaveBeenCalled();
      expect(mockShare).not.toHaveBeenCalled();
    } finally {
      clickSpy.mockRestore();
    }
  });

  it("Android: writes it into Documents like a backup, with no share sheet", async () => {
    await expect(saveTextFile(PACK_FILE, PACK_TEXT, { label: "pack", platform: "android" })).resolves.toEqual({
      fileName: PACK_FILE,
      savedTo: "in Documents",
    });
    expect(mockFs.writeFile).toHaveBeenCalledWith({ path: PACK_FILE, data: PACK_TEXT, directory: "DOCUMENTS", encoding: "utf8", recursive: true });
    expect(mockShare).not.toHaveBeenCalled();
  });

  it("iOS: shares it from the cache and names the pack on the sheet", async () => {
    await expect(saveTextFile(PACK_FILE, PACK_TEXT, { label: "pack", platform: "ios" })).resolves.toEqual({
      fileName: PACK_FILE,
      savedTo: "through the share sheet",
    });
    expect(mockFs.writeFile).toHaveBeenCalledWith({ path: PACK_FILE, data: PACK_TEXT, directory: "CACHE", encoding: "utf8" });
    expect(mockShare).toHaveBeenCalledWith({ title: PACK_FILE, files: ["file:///cache/backup.json"], dialogTitle: "Save your pack" });
  });

  it("calls the thing a pack, not a backup, when the sheet is closed or the disk is full", async () => {
    mockShare.mockRejectedValue(new Error("Share canceled"));
    const closed = await saveTextFile(PACK_FILE, PACK_TEXT, { label: "pack", platform: "ios" }).catch((e: unknown) => e);
    expect(closed).toBeInstanceOf(BackupNotSavedError);
    expect((closed as Error).message).toMatch(/so the pack was not saved/);
    expect((closed as Error).message).not.toMatch(/backup/);

    mockFs.writeFile.mockRejectedValue(new Error("disk full"));
    await expect(saveTextFile(PACK_FILE, PACK_TEXT, { label: "pack", platform: "ios" })).rejects.toThrow(
      /The pack file could not be written on this phone: disk full/
    );
  });

  it("saveBackupFile keeps its own words", async () => {
    mockShare.mockRejectedValue(new Error("Share canceled"));
    await expect(saveBackupFile(FILE, JSON_TEXT, "ios")).rejects.toThrow(/so the backup was not saved/);
  });
});

describe("savedFileLine, the sentence a success alert opens with", () => {
  it("says where the file went on each platform", () => {
    expect(savedFileLine({ fileName: "a.json", savedTo: "to Downloads" })).toBe("a.json was saved to Downloads.");
    expect(savedFileLine({ fileName: "a.json", savedTo: "in Documents" })).toBe("a.json was saved in Documents.");
    expect(savedFileLine({ fileName: "a.json", savedTo: "through the share sheet" })).toBe("a.json was saved through the share sheet.");
  });
});

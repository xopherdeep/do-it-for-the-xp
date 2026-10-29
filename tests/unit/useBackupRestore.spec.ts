/**
 * The pick-a-file-and-restore flow shared by Settings > General and the empty File Select screen. Only the overlays
 * (alerts, spinner, toast), the backup service and the two answers it asks (may this person restore, how many profiles
 * does the device hold) are faked; the flow itself is real: file picker, parse, confirm, restore, done.
 */
import { useBackupRestore } from "@/hooks/useBackupRestore";
import backupService from "@/lib/services/core/BackupService";
import { canRestoreHere } from "@/lib/services/core/restoreAccess";
import { useUserStore } from "@/lib/store/stores/user";
import { alertController, loadingController } from "@ionic/vue";

const GM_ONLY = "Only a Game Master can restore a backup.";

const mockShowToast = jest.fn();

jest.mock("@ionic/vue", () => ({
  alertController: { create: jest.fn() },
  loadingController: { create: jest.fn() },
  toastController: { create: jest.fn() },
}));
jest.mock("@/hooks/useToast", () => ({ useToast: () => ({ showToast: (...args: unknown[]) => mockShowToast(...args) }) }));
jest.mock("@/lib/services/core/BackupService", () => {
  class BackupFormatError extends Error {}
  return {
    __esModule: true,
    BackupFormatError,
    default: { parseBackup: jest.fn(), summarizeBackup: jest.fn(), restoreBackup: jest.fn() },
  };
});
jest.mock("@/lib/services/core/restoreAccess", () => ({ __esModule: true, canRestoreHere: jest.fn() }));
jest.mock("@/lib/store/stores/user", () => ({ useUserStore: jest.fn() }));
jest.mock("@/router/_Guards/gm.guard", () => ({ __esModule: true, RESTORE_GM_ONLY_MESSAGE: "Only a Game Master can restore a backup." }));

type AlertOptions = {
  header: string;
  message?: string;
  buttons: Array<string | { text: string; role?: string; handler?: () => void }>;
  cssClass?: string | string[];
};

const alerts: AlertOptions[] = [];
const present = jest.fn(async () => undefined);
const parsed = { version: 1, exportedAt: "2026-10-09T05:30:00.000Z", stores: {} };
const summary = { exportedAt: parsed.exportedAt, total: 7, stores: [{ name: "__profiles", label: "Profiles", count: 2 }] };

/** Every click on a file input; the spy records the input each click ran on (mock.instances) */
let clickSpy: jest.SpyInstance;

/** The input the flow made and clicked, if it did: the test plays the person choosing a file in it */
const pickedInput = (): HTMLInputElement | null => (clickSpy.mock.instances[0] as HTMLInputElement | undefined) ?? null;

const waitFor = async (check: () => void) => {
  for (let tries = 0; tries < 50; tries += 1) {
    try {
      check();
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
  }
  check();
};

const choose = (text = '{"version":1}') => {
  const file = new File([text], "backup.json", { type: "application/json" });
  Object.defineProperty(pickedInput(), "files", { value: [file], configurable: true });
  pickedInput()?.dispatchEvent(new Event("change"));
};

const withUsers = (count: number) => {
  const users = Object.fromEntries(Array.from({ length: count }, (_, i) => [`p${i}`, { id: `p${i}` }]));
  (useUserStore as unknown as jest.Mock).mockReturnValue({ users });
};

beforeEach(() => {
  jest.clearAllMocks();
  alerts.length = 0;
  clickSpy = jest.spyOn(HTMLInputElement.prototype, "click").mockImplementation(() => undefined);
  (alertController.create as jest.Mock).mockImplementation(async (options: AlertOptions) => {
    alerts.push(options);
    return { present };
  });
  (loadingController.create as jest.Mock).mockResolvedValue({ present: jest.fn(), dismiss: jest.fn() });
  (backupService.parseBackup as jest.Mock).mockReturnValue(parsed);
  (backupService.summarizeBackup as jest.Mock).mockReturnValue(summary);
  (backupService.restoreBackup as jest.Mock).mockResolvedValue({
    total: 7,
    exportedAt: parsed.exportedAt,
    ignored: [],
    untouched: [],
    usersReloaded: true,
  });
  (canRestoreHere as jest.Mock).mockReturnValue(true);
  withUsers(0);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("selectRestoreFile: who may start it", () => {
  it("tells a hero to ask a Game Master and opens no file picker", () => {
    (canRestoreHere as jest.Mock).mockReturnValue(false);
    withUsers(3);

    useBackupRestore().selectRestoreFile();

    expect(mockShowToast).toHaveBeenCalledWith(GM_ONLY, 2500);
    expect(pickedInput()).toBeNull();
  });

  it("opens a JSON file picker on an empty device, where there is no Game Master to ask", () => {
    useBackupRestore().selectRestoreFile();

    expect(mockShowToast).not.toHaveBeenCalled();
    expect(pickedInput()?.type).toBe("file");
    expect(pickedInput()?.accept).toBe("application/json,.json");
  });

  it("opens no second picker while a backup or restore is running", async () => {
    const flow = useBackupRestore();
    await flow.runWithLoading("Working...", async () => {
      flow.selectRestoreFile();
    });

    expect(pickedInput()).toBeNull();
  });
});

describe("the flow on an empty device", () => {
  it("asks plainly before restoring, with a Restore button that is not marked destructive", async () => {
    useBackupRestore().selectRestoreFile();
    choose();

    await waitFor(() => expect(alerts).toHaveLength(1));
    const [confirm] = alerts;
    expect(confirm.header).toBe("Restore this backup?");
    expect(confirm.cssClass).not.toContain("rpg-alert--danger");
    expect(confirm.message).toContain("7 entries come back onto this device");
    const restoreButton = confirm.buttons[1] as { text: string; role?: string };
    expect(restoreButton.text).toBe("Restore");
    expect(restoreButton.role).toBeUndefined();
    expect(backupService.restoreBackup).not.toHaveBeenCalled();
  });

  it("restores when the person confirms, then offers the reload that shows the heroes", async () => {
    useBackupRestore().selectRestoreFile();
    choose();
    await waitFor(() => expect(alerts).toHaveLength(1));

    (alerts[0].buttons[1] as { handler: () => void }).handler();

    await waitFor(() => expect(alerts).toHaveLength(2));
    expect(backupService.restoreBackup).toHaveBeenCalledWith(parsed, { mode: "replace" });
    expect(alerts[1].header).toBe("Restore complete");
    expect((alerts[1].buttons[0] as { text: string }).text).toBe("Reload app");
  });
});

describe("the flow on a device that has profiles", () => {
  it("asks before restoring or merging, offering merge and destructive replace", async () => {
    withUsers(2);
    useBackupRestore().selectRestoreFile();
    choose();

    await waitFor(() => expect(alerts).toHaveLength(1));
    expect(alerts[0].header).toBe("Restore or merge backup?");
    expect(alerts[0].cssClass).toContain("rpg-alert--danger");
    expect((alerts[0].buttons[1] as { text: string }).text).toBe("Merge with current data");
    expect((alerts[0].buttons[2] as { text: string; role?: string }).role).toBe("destructive");
  });

  it("merges records without replacing when Merge is chosen", async () => {
    (backupService.restoreBackup as jest.Mock).mockResolvedValue({
      total: 7,
      exportedAt: parsed.exportedAt,
      ignored: [],
      untouched: [],
      usersReloaded: true,
      mode: "merge",
    });
    withUsers(2);
    useBackupRestore().selectRestoreFile();
    choose();
    await waitFor(() => expect(alerts).toHaveLength(1));

    (alerts[0].buttons[1] as { handler: () => void }).handler();

    await waitFor(() => expect(alerts).toHaveLength(2));
    expect(backupService.restoreBackup).toHaveBeenCalledWith(parsed, { mode: "merge" });
    expect(alerts[1].header).toBe("Merge complete");
  });
});

describe("a file that is not a backup", () => {
  it("is turned away before anybody is asked to confirm, and nothing is restored", async () => {
    (backupService.parseBackup as jest.Mock).mockImplementation(() => {
      throw new Error("not json");
    });
    useBackupRestore().selectRestoreFile();
    choose("nope");

    await waitFor(() => expect(alerts).toHaveLength(1));
    expect(alerts[0].header).toBe("That is not a usable backup");
    expect(alerts[0].message).toContain("Nothing was changed.");
    expect(backupService.restoreBackup).not.toHaveBeenCalled();
  });

  it("shows why a restore failed", async () => {
    (backupService.restoreBackup as jest.Mock).mockRejectedValue(new Error("disk full"));
    useBackupRestore().selectRestoreFile();
    choose();
    await waitFor(() => expect(alerts).toHaveLength(1));

    (alerts[0].buttons[1] as { handler: () => void }).handler();

    await waitFor(() => expect(alerts).toHaveLength(2));
    expect(alerts[1].header).toBe("Restore failed");
    expect(alerts[1].message).toBe("disk full");
  });
});

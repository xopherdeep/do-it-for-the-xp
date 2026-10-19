import { ref } from "vue";
import { alertController, loadingController } from "@ionic/vue";
import { useToast } from "@/hooks/useToast";
import backupService, { BackupFormatError } from "@/lib/services/core/BackupService";
import type { BackupFile, BackupSummary, RestoreResult } from "@/lib/services/core/BackupService";
import { canRestoreHere } from "@/lib/services/core/restoreAccess";
import { useUserStore } from "@/lib/store/stores/user";
import { dialogMessage } from "@/lib/utils/dialogMessage";
import { RESTORE_GM_ONLY_MESSAGE } from "@/router/_Guards/gm.guard";

/**
 * The pick-a-file-and-restore flow, shared by Settings > General and the empty File Select screen (a new or empty
 * device). Pick the file first, so a bad file is turned away before anyone is asked to confirm; then confirm; then
 * restore; then offer the one button that reloads the app, so every screen shows the restored family.
 * Who may start it is restoreAccess.ts: a Game Master, or anybody while the device has no profile at all.
 */

/** The backup and restore dialogs share the RPG message box and its short-lines layout */
const RPG_ALERT = "rpg-alert";

const errorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error));

const readFileAsText = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("The file could not be read."));
    reader.readAsText(file);
  });

const formatBackupDate = (iso: string): string => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "on an unknown date" : `on ${date.toLocaleString()}`;
};

export function useBackupRestore() {
  const { showToast } = useToast();
  const userStore = useUserStore();
  /** A backup or restore is running: keeps the actions from overlapping */
  const isBackupBusy = ref(false);

  const showAlert = async (header: string, message: string) => {
    const alert = await alertController.create({ header, message, buttons: ["OK"], cssClass: RPG_ALERT });
    await alert.present();
  };

  /** Shows a spinner while a backup or restore runs and keeps a second one from starting */
  const runWithLoading = async <T>(message: string, task: () => Promise<T>): Promise<T> => {
    isBackupBusy.value = true;
    let loading: Awaited<ReturnType<typeof loadingController.create>> | undefined;
    try {
      loading = await loadingController.create({ message });
      await loading.present();
      return await task();
    } finally {
      isBackupBusy.value = false;
      await loading?.dismiss();
    }
  };

  /** Caches and open screens still hold the old data, so the only button reloads the app */
  const showRestoreDone = async (result: RestoreResult) => {
    const lead = `Restored ${result.total} entries from the backup made ${formatBackupDate(result.exportedAt)}.`;
    const warnings = [
      ...(result.ignored.length ? [`Skipped (not in this app version): ${result.ignored.join(", ")}`] : []),
      ...(result.usersReloaded ? [] : ["The profile list could not be refreshed"]),
    ];

    const alert = await alertController.create({
      header: "Restore complete",
      cssClass: RPG_ALERT,
      message: dialogMessage({
        lead,
        groups: [
          { title: "Left as they were", tone: "keep", lines: result.untouched },
          { tone: "warn", lines: warnings },
        ],
        note: "Reload so every screen shows the new data.",
      }),
      backdropDismiss: false,
      buttons: [
        {
          text: "Reload app",
          handler: () => {
            window.location.reload();
          },
        },
      ],
    });
    await alert.present();
  };

  const runRestore = async (backup: BackupFile) => {
    try {
      const result = await runWithLoading("Restoring your data...", () => backupService.restoreBackup(backup));
      await showRestoreDone(result);
    } catch (error) {
      await showAlert("Restore failed", errorMessage(error));
    }
  };

  const confirmRestore = async (backup: BackupFile, summary: BackupSummary) => {
    // On a device with no profiles nothing is replaced: the backup simply comes back
    const isEmptyDevice = Object.keys(userStore.users).length === 0;
    const alert = await alertController.create({
      header: isEmptyDevice ? "Restore this backup?" : "Replace everything?",
      subHeader: `Backup made ${formatBackupDate(summary.exportedAt)}`,
      cssClass: isEmptyDevice ? RPG_ALERT : [RPG_ALERT, "rpg-alert--danger"],
      message: dialogMessage({
        lead: isEmptyDevice
          ? `These ${summary.total} entries come back onto this device:`
          : `These ${summary.total} entries replace what is here now:`,
        groups: [
          {
            tone: "info",
            lines: summary.stores.map(({ label, count }) => `${label}: ${count}`),
          },
        ],
        note: isEmptyDevice ? "Your heroes wait on the File Select screen afterward." : "Anything not listed stays. This can't be undone.",
      }),
      buttons: [
        { text: "Cancel", role: "cancel" },
        {
          text: isEmptyDevice ? "Restore" : "Replace everything",
          ...(isEmptyDevice ? {} : { role: "destructive" }),
          handler: () => {
            void runRestore(backup);
          },
        },
      ],
    });
    await alert.present();
  };

  const checkRestoreFile = async (file: File) => {
    let backup: BackupFile;
    try {
      backup = backupService.parseBackup(await readFileAsText(file));
    } catch (error) {
      await showAlert(
        "That is not a usable backup",
        error instanceof BackupFormatError
          ? `${error.message} Nothing was changed.`
          : `The file could not be read: ${errorMessage(error)} Nothing was changed.`
      );
      return;
    }
    await confirmRestore(backup, backupService.summarizeBackup(backup));
  };

  /** Opens the file picker. A hero on a device that has profiles is told to ask a Game Master instead. */
  const selectRestoreFile = () => {
    if (isBackupBusy.value) return;
    if (!canRestoreHere()) {
      void showToast(RESTORE_GM_ONLY_MESSAGE, 2500);
      return;
    }
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.addEventListener("change", () => {
      const file = input.files?.[0];
      if (file) void checkRestoreFile(file);
    });
    input.click();
  };

  return { isBackupBusy, runWithLoading, selectRestoreFile };
}

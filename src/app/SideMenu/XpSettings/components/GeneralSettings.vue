<template>
  <ion-page :class="[$options.name, 'xp-settings-page']">
    <ion-header :translucent="true">
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <xp-back-button></xp-back-button>
        </ion-buttons>
        <ion-title>General Settings</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="rpg-box bg-slide ion-padding">
      <ion-card class="settings-card max-w-2xl">
        <!-- <ion-card-content class="p-0"> -->
        <ion-list>
          <ion-item-group>
            <ion-item-divider>
              <ion-label>Language</ion-label>
            </ion-item-divider>
            <ion-item>
              <ion-label>App Language</ion-label>
              <ion-select
                v-model="generalSettings.language"
                interface="popover"
                @ionChange="changeLanguage"
              >
                <ion-select-option value="en">English</ion-select-option>
                <ion-select-option value="es">Español</ion-select-option>
                <ion-select-option value="fr">Français</ion-select-option>
                <ion-select-option value="de">Deutsch</ion-select-option>
                <ion-select-option value="ja">日本語</ion-select-option>
              </ion-select>
            </ion-item>
          </ion-item-group>
          <ion-item-group>
            <ion-item-divider>
              <ion-label>App Preferences</ion-label>
            </ion-item-divider>

            <ion-item>
              <ion-label>
                <h2>Set my landing page</h2>
                <p>This is the page you are taken to when signing in.</p>
              </ion-label>
              <ion-select
                v-model="generalSettings.landingPage"
                placeholder="Select page..."
                interface="popover"
                @ionChange="saveGeneralSettings"
              >
                <ion-select-option value="community"
                  >Community</ion-select-option
                >
                <ion-select-option value="party"
                  >Family Party</ion-select-option
                >
                <ion-select-option value="quests">Quests Tab</ion-select-option>
                <ion-select-option value="merchant"
                  >Merchant Tab</ion-select-option
                >
                <ion-select-option value="worldMap"
                  >World Map</ion-select-option
                >
              </ion-select>
            </ion-item>

            <ion-item>
              <ion-label>
                <h2>Start My Week on Sunday</h2>
                <p>Calendar weeks will start on Sunday instead of Monday</p>
              </ion-label>
              <ion-toggle
                v-model="generalSettings.startWeekOnSunday"
                @ionChange="saveGeneralSettings"
              ></ion-toggle>
            </ion-item>

            <ion-item>
              <ion-label>
                <h2>Enable Dark Mode</h2>
                <p>Use dark theme throughout the app</p>
              </ion-label>
              <ion-toggle
                v-model="generalSettings.darkMode"
                @ionChange="toggleDarkMode"
              ></ion-toggle>
            </ion-item>

            <ion-item>
              <ion-label>
                <h2>Show Helper Dialogs</h2>
                <p>Enable in-app guides and walkthroughs</p>
              </ion-label>
              <ion-toggle
                v-model="generalSettings.showHelperDialogs"
                @ionChange="saveGeneralSettings"
              ></ion-toggle>
            </ion-item>
          </ion-item-group>

          <ion-item-group>
            <ion-item-divider>
              <ion-label>Family Settings</ion-label>
            </ion-item-divider>

            <ion-item>
              <ion-label>
                <h2>Lock My Family Setup</h2>
                <p>Prevent making changes to the family</p>
              </ion-label>
              <ion-toggle
                v-model="generalSettings.lockFamily"
                @ionChange="saveGeneralSettings"
              ></ion-toggle>
            </ion-item>

            <ion-item>
              <ion-label>
                <h2>Enable "Overview" from Choose Profile</h2>
                <p>Show family overview when selecting profiles</p>
              </ion-label>
              <ion-toggle
                v-model="generalSettings.enableOverview"
                @ionChange="saveGeneralSettings"
              ></ion-toggle>
            </ion-item>
          </ion-item-group>

          <ion-item-group>
            <ion-item-divider>
              <ion-label>Backup &amp; Restore</ion-label>
            </ion-item-divider>

            <ion-item
              button
              :detail="false"
              :disabled="isBackupBusy"
              @click="confirmBackup"
            >
              <ion-icon slot="start" :icon="cloudDownloadOutline"></ion-icon>
              <ion-label>
                <h2>Back up everything</h2>
                <p>Download one file with all of your family's data</p>
              </ion-label>
            </ion-item>

            <ion-item
              button
              :detail="false"
              :disabled="isBackupBusy"
              :style="canRestore() ? undefined : { opacity: 0.5 }"
              @click="chooseRestoreFile"
            >
              <ion-icon slot="start" :icon="cloudUploadOutline"></ion-icon>
              <ion-label>
                <h2>Restore from backup</h2>
                <p>Replace what the app holds with the contents of a backup file</p>
              </ion-label>
            </ion-item>

            <ion-item button :detail="false" router-link="/xp-settings/packs">
              <ion-icon slot="start" :icon="sparklesOutline"></ion-icon>
              <ion-label>
                <h2>Packs</h2>
                <p>Ready-made worlds to load now live under Settings, Packs</p>
              </ion-label>
            </ion-item>
          </ion-item-group>

          <ion-item-group>
            <ion-item-divider>
              <ion-label>Premium Features</ion-label>
            </ion-item-divider>

            <ion-item>
              <ion-label>
                <h2>Community</h2>
                <ion-badge color="warning" size="small" class="premium-badge">
                  <i class="fa fa-crown"></i>
                  Premium
                </ion-badge>
                <p>
                  For premium users only, turn off community by disabling this
                  switch.
                </p>
              </ion-label>
              <ion-toggle
                v-model="generalSettings.community"
                :disabled="!isPremiumUser"
                @ionChange="saveGeneralSettings"
              ></ion-toggle>
            </ion-item>

            <ion-item>
              <ion-label>
                <h2>Custom Themes</h2>
                <ion-badge color="warning" size="small" class="premium-badge">
                  <i class="fa fa-crown"></i>
                  Premium
                </ion-badge>
                <p>Access to premium themes and customizations</p>
              </ion-label>
              <ion-toggle
                v-model="generalSettings.customThemes"
                :disabled="!isPremiumUser"
                @ionChange="saveGeneralSettings"
              ></ion-toggle>
            </ion-item>
          </ion-item-group>
        </ion-list>

        <!-- </ion-card-content> -->
      </ion-card>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
  import { defineComponent, ref } from "vue";
  import ionic from "@/lib/mixins/ionic";
  import { arrowBack, cloudDownloadOutline, cloudUploadOutline, sparklesOutline } from "ionicons/icons";
  import { alertController, loadingController, toastController } from "@ionic/vue";
  import backupService, { BackupFormatError } from "@/lib/services/core/BackupService";
  import type { BackupFile, BackupSummary, RestoreResult } from "@/lib/services/core/BackupService";
  import { canManageFamily, RESTORE_GM_ONLY_MESSAGE } from "@/router/_Guards/gm.guard";
  import { dialogMessage } from "@/lib/utils/dialogMessage";

  type AlertButton = string | { text: string; role?: string; handler?: () => void };

  const errorMessage = (error: unknown): string =>
    error instanceof Error ? error.message : String(error);

  const readFileAsText = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () =>
        reject(reader.error ?? new Error("The file could not be read."));
      reader.readAsText(file);
    });

  const formatBackupDate = (iso: string): string => {
    const date = new Date(iso);
    return Number.isNaN(date.getTime())
      ? "on an unknown date"
      : `on ${date.toLocaleString()}`;
  };

  /** The backup and restore dialogs share the RPG message box and its short-lines layout */
  const RPG_ALERT = "rpg-alert";

  export default defineComponent({
    name: "general-settings",

    mixins: [ionic],
    methods: {
      saveGeneralSettings() {
        // In a real app, this would save to a database or local storage
        localStorage.setItem(
          "generalSettings",
          JSON.stringify(this.generalSettings)
        );
        this.showToast("Settings saved");
      },

      toggleDarkMode() {
        // Toggle dark mode class on document
        document.body.classList.toggle("dark", this.generalSettings.darkMode);
        this.saveGeneralSettings();
        this.showToast(
          `Dark mode ${this.generalSettings.darkMode ? "enabled" : "disabled"}`
        );
      },

      changeLanguage() {
        // In a real app, this would change the app's language
        this.saveGeneralSettings();
        this.showToast(
          `Language changed to ${this.getLanguageName(
            this.generalSettings.language
          )}`
        );
      },

      getLanguageName(code: string) {
        const languages = {
          en: "English",
          es: "Spanish",
          fr: "French",
          de: "German",
          ja: "Japanese",
        };
        return languages[code] || code;
      },

      async showToast(message: string, color?: string, duration = 2000) {
        const toast = await toastController.create({
          message,
          duration,
          position: "bottom",
          color,
        });
        await toast.present();
      },

      /** Restore replaces everyone's data, so a hero who taps it is told to ask a Game Master */
      async showGmOnlyToast() {
        const toast = await toastController.create({
          message: RESTORE_GM_ONLY_MESSAGE,
          duration: 2500,
          position: "top",
          cssClass: "rpg-toast",
        });
        await toast.present();
      },

      async showAlert(
        header: string,
        message: string,
        buttons: AlertButton[] = ["OK"]
      ) {
        const alert = await alertController.create({ header, message, buttons, cssClass: RPG_ALERT });
        await alert.present();
      },

      /** Keeps the two backup actions from overlapping and shows a spinner while one runs */
      async withLoading<T>(message: string, task: () => Promise<T>): Promise<T> {
        this.isBackupBusy = true;
        let loading: Awaited<ReturnType<typeof loadingController.create>> | undefined;
        try {
          loading = await loadingController.create({ message });
          await loading.present();
          return await task();
        } finally {
          this.isBackupBusy = false;
          await loading?.dismiss();
        }
      },

      async confirmBackup() {
        const alert = await alertController.create({
          header: "Back up everything?",
          cssClass: RPG_ALERT,
          message: dialogMessage({
            lead: "Saves one file you can restore later.",
            groups: [
              {
                tone: "keep",
                lines: [
                  "Profiles and passcodes",
                  "Quests, beasts, powers, shops",
                  "Temples and their progress",
                  "Logs, chat, Dos and Don'ts",
                ],
              },
            ],
            note: "It holds passcodes, so keep it somewhere safe.",
          }),
          buttons: [
            { text: "Cancel", role: "cancel" },
            {
              text: "Download backup",
              handler: () => {
                this.runBackup();
              },
            },
          ],
        });
        await alert.present();
      },

      async runBackup() {
        try {
          const { fileName, summary } = await this.withLoading(
            "Packing your backup...",
            () => backupService.exportAll()
          );
          await this.showToast(
            `Backup saved as ${fileName} (${summary.total} entries)`,
            "success",
            5000
          );
        } catch (error) {
          await this.showToast(
            `Backup failed: ${errorMessage(error)}`,
            "danger",
            6000
          );
        }
      },

      /** Pick the file first: a bad file is turned away before anyone is asked to confirm a restore */
      chooseRestoreFile() {
        if (!canManageFamily()) {
          this.showGmOnlyToast();
          return;
        }
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "application/json,.json";
        input.addEventListener("change", () => {
          const file = input.files?.[0];
          if (file) this.checkRestoreFile(file);
        });
        input.click();
      },

      async checkRestoreFile(file: File) {
        let backup: BackupFile;
        try {
          backup = backupService.parseBackup(await readFileAsText(file));
        } catch (error) {
          await this.showAlert(
            "That is not a usable backup",
            error instanceof BackupFormatError
              ? `${error.message} Nothing was changed.`
              : `The file could not be read: ${errorMessage(error)} Nothing was changed.`
          );
          return;
        }
        await this.confirmRestore(backup, backupService.summarizeBackup(backup));
      },

      async confirmRestore(backup: BackupFile, summary: BackupSummary) {
        const alert = await alertController.create({
          header: "Replace everything?",
          subHeader: `Backup made ${formatBackupDate(summary.exportedAt)}`,
          cssClass: [RPG_ALERT, "rpg-alert--danger"],
          message: dialogMessage({
            lead: `These ${summary.total} entries replace what is here now:`,
            groups: [
              {
                tone: "info",
                lines: summary.stores.map(({ label, count }) => `${label}: ${count}`),
              },
            ],
            note: "Anything not listed stays. This can't be undone.",
          }),
          buttons: [
            { text: "Cancel", role: "cancel" },
            {
              text: "Replace everything",
              role: "destructive",
              handler: () => {
                this.runRestore(backup);
              },
            },
          ],
        });
        await alert.present();
      },

      async runRestore(backup: BackupFile) {
        try {
          const result = await this.withLoading("Restoring your data...", () =>
            backupService.restoreBackup(backup)
          );
          await this.showRestoreDone(result);
        } catch (error) {
          await this.showAlert("Restore failed", errorMessage(error));
        }
      },

      /** Caches and open screens still hold the old data, so the only button reloads the app */
      async showRestoreDone(result: RestoreResult) {
        const lead = `Restored ${result.total} entries from the backup made ${formatBackupDate(result.exportedAt)}.`;
        const warnings = [
          ...(result.ignored.length
            ? [`Skipped (not in this app version): ${result.ignored.join(", ")}`]
            : []),
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
      },
    },
    setup() {
      // Load saved settings or use defaults
      let savedSettings = localStorage.getItem("generalSettings");
      const defaultSettings = {
        landingPage: "worldMap",
        startWeekOnSunday: false,
        darkMode: false,
        lockFamily: false,
        enableOverview: true,
        community: true,
        customThemes: false,
        language: "en",
        showHelperDialogs: true,
      };

      const generalSettings = ref(
        savedSettings ? JSON.parse(savedSettings) : defaultSettings
      );
      const isPremiumUser = ref(true); // In a real app, this would be determined by user's subscription
      const isBackupBusy = ref(false); // A backup or restore is running

      // Initialize dark mode on component mount
      if (generalSettings.value.darkMode) {
        document.body.classList.add("dark");
      }

      return {
        generalSettings,
        isPremiumUser,
        isBackupBusy,
        canRestore: () => canManageFamily(),
        arrowBack,
        cloudDownloadOutline,
        cloudUploadOutline,
        sparklesOutline,
      };
    },
  });
</script>

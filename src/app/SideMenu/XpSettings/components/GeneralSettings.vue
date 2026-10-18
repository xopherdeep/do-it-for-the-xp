<template>
  <ion-page :class="[$options.name, 'xp-settings-page']">
    <ion-header :translucent="true">
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <xp-back-button></xp-back-button>
        </ion-buttons>
        <ion-title>General</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="rpg-box bg-slide ion-padding">
      <ion-card class="settings-card max-w-2xl">
        <ion-list>
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
              <ion-icon slot="start" color="rpg" :icon="cloudDownloadOutline"></ion-icon>
              <ion-label>
                <h2>Back up everything</h2>
                <p>Download one file with all of your family's data. {{ backupAge }}.</p>
              </ion-label>
            </ion-item>

            <ion-item
              button
              :detail="false"
              :disabled="isBackupBusy"
              :style="canRestore() ? undefined : { opacity: 0.5 }"
              lines="none"
              @click="chooseRestoreFile"
            >
              <ion-icon slot="start" color="rpg" :icon="cloudUploadOutline"></ion-icon>
              <ion-label>
                <h2>Restore from backup</h2>
                <p>Replace what the app holds with the contents of a backup file. Game Masters only.</p>
              </ion-label>
            </ion-item>
          </ion-item-group>
        </ion-list>
      </ion-card>

      <ion-card class="settings-card max-w-2xl">
        <ion-list>
          <ion-item-group>
            <ion-item-divider>
              <ion-label>Guides</ion-label>
            </ion-item-divider>

            <ion-item :disabled="!currentHeroId">
              <ion-label class="ion-text-wrap">
                <h2>Helper dialogs</h2>
                <p>The Guide and the portal tour speak up on their own. Off, they wait until you open the Journal from your avatar menu.</p>
              </ion-label>
              <ion-toggle data-cy="guides-toggle" :checked="guides" @ionChange="setGuides($event.detail.checked)"></ion-toggle>
            </ion-item>

            <ion-item
              button
              :detail="false"
              :disabled="!currentHeroId"
              lines="none"
              data-cy="replay-tour"
              @click="replayTour"
            >
              <ion-icon slot="start" color="rpg" :icon="mapOutline"></ion-icon>
              <ion-label>
                <h2>Show the portal tour again</h2>
                <p>The guide walks this hero through the XP bar and the buttons next time their portal opens</p>
              </ion-label>
            </ion-item>
          </ion-item-group>
        </ion-list>
      </ion-card>

      <ion-card class="settings-card max-w-2xl">
        <ion-list>
          <ion-item-group>
            <ion-item-divider>
              <ion-label>Start up</ion-label>
            </ion-item-divider>

            <ion-item class="setting-stacked" :disabled="!currentHeroId">
              <div class="setting-stacked__body">
                <ion-label class="ion-text-wrap">
                  <h2>Landing page</h2>
                  <p>The screen {{ profileName }} sees after signing in on this device</p>
                </ion-label>
                <ion-select
                  class="setting-stacked__select"
                  interface="action-sheet"
                  aria-label="Landing page"
                  data-cy="landing-page"
                  :value="landing"
                  @ionChange="setLanding($event.detail.value)"
                >
                  <ion-select-option v-for="option in landingOptions" :key="option.value" :value="option.value">{{ option.label }}</ion-select-option>
                </ion-select>
              </div>
            </ion-item>

            <ion-item class="setting-stacked" lines="none" :disabled="!canManage">
              <div class="setting-stacked__body">
                <ion-label class="ion-text-wrap">
                  <h2>Week starts on</h2>
                  <p>The first day of the week in date pickers, quest day rows and the weekly recap, for the whole family</p>
                </ion-label>
                <ion-select
                  class="setting-stacked__select"
                  interface="action-sheet"
                  aria-label="Week starts on"
                  data-cy="week-start"
                  :value="rules.weekStartsOn"
                  @ionChange="rules.setWeekStartsOn(Number($event.detail.value))"
                >
                  <ion-select-option :value="1">Monday</ion-select-option>
                  <ion-select-option :value="0">Sunday</ion-select-option>
                </ion-select>
              </div>
            </ion-item>
          </ion-item-group>
        </ion-list>
      </ion-card>

      <ion-card class="settings-card max-w-2xl">
        <ion-card-content>
          <p>
            Everything lives on this device. Back up before you clear the browser, switch phones or try a
            pack, and keep the file somewhere safe: it holds your whole family's game. Passcodes are saved scrambled, so the
            file never shows them.
          </p>
        </ion-card-content>
      </ion-card>

      <xp-coming-soon-card title="App preferences" :items="comingSoon" />
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
  import { computed, defineComponent, ref } from "vue";
  import ionic from "@/lib/mixins/ionic";
  import { cloudDownloadOutline, cloudUploadOutline, mapOutline } from "ionicons/icons";
  import { alertController, loadingController, toastController } from "@ionic/vue";
  import { rpgToastOptions } from "@/hooks/useToast";
  import backupService, { BackupFormatError } from "@/lib/services/core/BackupService";
  import type { BackupFile, BackupSummary, RestoreResult } from "@/lib/services/core/BackupService";
  import { canManageFamily, RESTORE_GM_ONLY_MESSAGE } from "@/router/_Guards/gm.guard";
  import { dialogMessage } from "@/lib/utils/dialogMessage";
  import XpComingSoonCard from "./XpComingSoonCard.vue";
  import { GENERAL_COMING_SOON } from "./comingSoon";
  import { resetTour } from "@/lib/services/tutorial/firstRunTour";
  import {
    guidesOn,
    landingChoiceOf,
    landingOptionsFor,
    setGuidesOn,
    setLandingChoice,
    type LandingChoice,
  } from "@/lib/services/core/profilePrefs";
  import { useGameRulesStore } from "@/lib/store/stores/gameRules";
  import { useUserStore } from "@/lib/store/stores/user";
  import { backupAgeLabel, lastBackupAt, recordBackup } from "@/lib/services/core/backupReminder";

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
    components: { XpComingSoonCard },

    mixins: [ionic],
    methods: {
      /** Backup results stay up long enough to read the file name */
      async showToast(message: string, duration = 2500) {
        const toast = await toastController.create(rpgToastOptions(message, duration));
        await toast.present();
      },

      /** The first-run tour plays once per hero; this queues it for the hero signed in now */
      async replayTour() {
        const noHero = this.currentHeroId === "";
        if (noHero) return;
        resetTour(this.currentHeroId);
        await this.showToast("The tour will play next time your portal opens.");
      },

      /** Restore replaces everyone's data, so a hero who taps it is told to ask a Game Master */
      async showGmOnlyToast() {
        await this.showToast(RESTORE_GM_ONLY_MESSAGE);
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
                  "Profiles (passcodes scrambled)",
                  "Quests, beasts, powers, shops",
                  "Temples and their progress",
                  "Family rules and settings",
                  "Logs, penalties, chat, Dos and Don'ts",
                ],
              },
            ],
            note: "It holds your whole family's game, so keep it somewhere safe.",
          }),
          buttons: [
            { text: "Cancel", role: "cancel" },
            {
              text: "Save backup",
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
          const { fileName, savedTo, summary } = await this.withLoading(
            "Packing your backup...",
            () => backupService.exportAll()
          );
          // Only a file that really landed somewhere counts: exportAll throws when it did not
          recordBackup();
          this.lastBackup = lastBackupAt();
          await this.showToast(`Backup ${fileName} saved ${savedTo} (${summary.total} entries)`, 5000);
        } catch (error) {
          await this.showToast(`Backup failed: ${errorMessage(error)}`, 6000);
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
      const isBackupBusy = ref(false); // A backup or restore is running
      const userStore = useUserStore();
      const currentHeroId = computed(() => String(userStore.currentUser?.id || ""));
      // When the last backup was made, and how to say so under "Back up everything"
      const lastBackup = ref(lastBackupAt());
      const backupAge = computed(() => backupAgeLabel(lastBackup.value));

      // This profile's own start-up choices, kept on this device
      const profile = computed(() => userStore.currentUser);
      const profileName = computed(() => profile.value?.name?.nick || profile.value?.name?.full || "this profile");
      const landingOptions = computed(() => landingOptionsFor(profile.value?.isAdult === true));
      const landing = ref<LandingChoice>(landingChoiceOf(currentHeroId.value));
      const setLanding = (choice: LandingChoice) => {
        landing.value = choice;
        setLandingChoice(currentHeroId.value, choice);
      };
      const guides = ref(guidesOn(currentHeroId.value));
      const setGuides = (on: boolean) => {
        guides.value = on;
        setGuidesOn(currentHeroId.value, on);
      };

      // The first day of the week is the family's, so only a Game Master moves it
      const rules = useGameRulesStore();
      void rules.load();
      const canManage = computed(() => canManageFamily(userStore));

      return {
        isBackupBusy,
        lastBackup,
        backupAge,
        currentHeroId,
        mapOutline,
        profileName,
        landingOptions,
        landing,
        setLanding,
        guides,
        setGuides,
        rules,
        canManage,
        comingSoon: GENERAL_COMING_SOON,
        canRestore: () => canManageFamily(),
        cloudDownloadOutline,
        cloudUploadOutline,
      };
    },
  });
</script>

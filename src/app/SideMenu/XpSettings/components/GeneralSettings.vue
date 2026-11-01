<template>
  <ion-page :class="[$options.name, 'xp-settings-page']">
    <ion-header :translucent="true">
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <xp-back-button></xp-back-button>
        </ion-buttons>
        <ion-title>{{ t("settings.general.title") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content
      :fullscreen="true"
      class="rpg-box bg-slide ion-padding"
    >
      <ion-card
        v-if="!isKidMode"
        class="settings-card"
      >
        <ion-card-content>
          <p>{{ t("settings.general.backupDisclaimer") }}</p>
        </ion-card-content>
      </ion-card>

      <!-- A kid phone never saves or restores the family's file -->
      <ion-card
        v-if="!isKidMode"
        class="settings-card"
      >
        <ion-list>
          <ion-item-group>
            <ion-item-divider>
              <ion-label>{{ t("settings.general.backupRestore") }}</ion-label>
            </ion-item-divider>

            <ion-item
              button
              :detail="false"
              :disabled="isBackupBusy"
              @click="confirmBackup"
            >
              <ion-icon
                slot="start"
                color="rpg"
                :icon="cloudDownloadOutline"
              ></ion-icon>
              <ion-label>
                <h2>{{ t("settings.general.backupEverything") }}</h2>
                <p>Download one file with all of your family's data. {{ backupAge }}.</p>
              </ion-label>
            </ion-item>

            <ion-item
              button
              :detail="false"
              :disabled="isBackupBusy"
              :style="canRestore ? undefined : { opacity: 0.5 }"
              lines="none"
              @click="selectRestoreFile"
            >
              <ion-icon
                slot="start"
                color="rpg"
                :icon="cloudUploadOutline"
              ></ion-icon>
              <ion-label>
                <h2>{{ t("settings.general.restoreBackup") }}</h2>
                <p>{{ t("settings.general.restoreDesc") }}</p>
              </ion-label>
            </ion-item>
          </ion-item-group>
        </ion-list>
      </ion-card>

      <xp-dlc-modal
        :is-open="isDlcModalOpen"
        @close="isDlcModalOpen = false"
        @completed="handleDlcCompleted"
      />

      <ion-card class="settings-card">
        <ion-list>
          <ion-item-group>
            <ion-item-divider>
              <ion-label>{{ t("settings.general.gameAssets") }}</ion-label>
            </ion-item-divider>

            <ion-item
              button
              :detail="true"
              lines="none"
              data-cy="dlc-settings-row"
              @click="openDlcModal"
            >
              <ion-icon
                slot="start"
                color="rpg"
                :icon="cloudDownloadOutline"
              ></ion-icon>
              <ion-label class="ion-text-wrap">
                <h2>{{ t("settings.general.assetPack") }}</h2>
                <p>{{ dlcSummaryText }}</p>
              </ion-label>
              <ion-badge
                slot="end"
                :color="isDlcReady ? 'success' : 'warning'"
              >
                {{ isDlcReady ? "Ready" : "Download" }}
              </ion-badge>
            </ion-item>
          </ion-item-group>
        </ion-list>
      </ion-card>

      <ion-card class="settings-card">
        <ion-list>
          <ion-item-group>
            <ion-item-divider>
              <ion-label>{{ t("settings.general.guides") }}</ion-label>
            </ion-item-divider>

            <ion-item :disabled="!currentHeroId">
              <ion-label class="ion-text-wrap">
                <h2>{{ t("settings.general.helperDialogs") }}</h2>
                <p>{{ t("settings.general.helperDesc") }}</p>
              </ion-label>
              <ion-toggle
                data-cy="guides-toggle"
                :checked="guides"
                @ionChange="setGuides($event.detail.checked)"
              ></ion-toggle>
            </ion-item>

            <ion-item
              button
              :detail="false"
              :disabled="!currentHeroId"
              lines="none"
              data-cy="replay-tour"
              @click="replayTour"
            >
              <ion-icon
                slot="start"
                color="rpg"
                :icon="mapOutline"
              ></ion-icon>
              <ion-label>
                <h2>{{ t("settings.general.replayTour") }}</h2>
                <p>{{ t("settings.general.replayTourDesc") }}</p>
              </ion-label>
            </ion-item>
          </ion-item-group>
        </ion-list>
      </ion-card>

      <ion-card class="settings-card">
        <ion-list>
          <ion-item-group>
            <ion-item-divider>
              <ion-label>{{ t("settings.general.startUp") }}</ion-label>
            </ion-item-divider>

            <ion-item
              class="setting-stacked"
              :disabled="!currentHeroId"
            >
              <div class="setting-stacked__body">
                <ion-label class="ion-text-wrap">
                  <h2>{{ t("settings.general.landingPage") }}</h2>
                  <p>{{ t("settings.general.landingPageDesc", { name: profileName }) }}</p>
                </ion-label>
                <ion-select
                  class="setting-stacked__select"
                  interface="action-sheet"
                  aria-label="Landing page"
                  data-cy="landing-page"
                  :value="landing"
                  @ionChange="setLanding($event.detail.value)"
                >
                  <ion-select-option
                    v-for="option in landingOptions"
                    :key="option.value"
                    :value="option.value"
                  >{{ option.label }}</ion-select-option>
                </ion-select>
              </div>
            </ion-item>

            <ion-item
              class="setting-stacked"
              lines="none"
              :disabled="!canManage"
            >
              <div class="setting-stacked__body">
                <ion-label class="ion-text-wrap">
                  <h2>{{ t("settings.general.weekStartsOn") }}</h2>
                  <p>{{ t("settings.general.weekStartsDesc") }}</p>
                </ion-label>
                <ion-select
                  class="setting-stacked__select"
                  interface="action-sheet"
                  aria-label="Week starts on"
                  data-cy="week-start"
                  :value="rules.weekStartsOn"
                  @ionChange="rules.setWeekStartsOn(Number($event.detail.value))"
                >
                  <ion-select-option :value="1">{{ t("settings.general.monday") }}</ion-select-option>
                  <ion-select-option :value="0">{{ t("settings.general.sunday") }}</ion-select-option>
                </ion-select>
              </div>
            </ion-item>
          </ion-item-group>
        </ion-list>
      </ion-card>

      <ion-card class="settings-card">
        <ion-list>
          <ion-item-group>
            <ion-item-divider>
              <ion-label>{{ t("settings.general.appPreferences") }}</ion-label>
            </ion-item-divider>

            <ion-item
              class="setting-stacked"
            >
              <div class="setting-stacked__body">
                <ion-label class="ion-text-wrap">
                  <h2>{{ t("settings.general.appLanguage") }}</h2>
                  <p>{{ t("settings.general.appLanguageDesc") }}</p>
                </ion-label>
                <ion-select
                  class="setting-stacked__select"
                  interface="action-sheet"
                  :aria-label="t('settings.general.appLanguage')"
                  data-cy="app-language"
                  :value="activeLocale"
                  @ionChange="handleLocaleChange($event.detail.value)"
                >
                  <ion-select-option
                    v-for="opt in languageOptions"
                    :key="opt.code"
                    :value="opt.code"
                  >
                    {{ opt.nativeLabel }} ({{ opt.label }})
                  </ion-select-option>
                </ion-select>
              </div>
            </ion-item>

            <ion-item
              button
              :detail="true"
              router-link="/xp-settings/family-overview"
              data-cy="family-overview-nav"
            >
              <ion-icon
                slot="start"
                color="rpg"
                :icon="peopleOutline"
              ></ion-icon>
              <ion-label class="ion-text-wrap">
                <h2>Family Overview</h2>
                <p>See the whole family's progress, chores, and stats at a glance.</p>
              </ion-label>
            </ion-item>

            <ion-item
              lines="none"
              data-cy="family-overview-picker-row"
            >
              <ion-label class="ion-text-wrap">
                <h2>Show on profile chooser</h2>
                <p>Display a shortcut to the Family Overview on Choose A Profile.</p>
              </ion-label>
              <ion-toggle
                data-cy="family-overview-picker-toggle"
                :checked="showOnPicker"
                @ionChange="setShowOnPicker($event.detail.checked)"
              ></ion-toggle>
            </ion-item>
          </ion-item-group>
        </ion-list>
      </ion-card>

      <xp-coming-soon-card
        v-if="comingSoon.length > 0"
        title="App preferences"
        :items="comingSoon"
      />
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
  import { computed, defineComponent, ref } from "vue";
  import ionic from "@/lib/mixins/ionic";
  import { cloudDownloadOutline, cloudUploadOutline, mapOutline, peopleOutline } from "ionicons/icons";
  import { alertController, toastController } from "@ionic/vue";
  import { rpgToastOptions } from "@/hooks/useToast";
  import { useBackupRestore } from "@/hooks/useBackupRestore";
  import backupService from "@/lib/services/core/BackupService";
  import { dialogMessage } from "@/lib/utils/dialogMessage";
  import XpComingSoonCard from "./XpComingSoonCard.vue";
  import XpDlcModal from "@/components/molecules/Modals/XpDlcModal.vue";
  import { dlcService } from "@/lib/services/dlc/assetDlcService";
  import { useI18n, type SupportedLocale } from "@/hooks/useI18n";
  import { GENERAL_COMING_SOON } from "./comingSoon";
  import { useSignedInProfile } from "./general/useSignedInProfile";
  import { resetTour } from "@/lib/services/tutorial/firstRunTour";
  import {
    familyOverviewOnPicker,
    guidesOn,
    landingChoiceOf,
    landingOptionsFor,
    setFamilyOverviewOnPicker,
    setGuidesOn,
    setLandingChoice,
    type LandingChoice,
  } from "@/lib/services/core/profilePrefs";
  import { useGameRulesStore } from "@/lib/store/stores/gameRules";
  import { backupAgeLabel, lastBackupAt, recordBackup } from "@/lib/services/core/backupReminder";

  const errorMessage = (error: unknown): string =>
    error instanceof Error ? error.message : String(error);

  /** The backup dialog uses the RPG message box and its short-lines layout */
  const RPG_ALERT = "rpg-alert";

  export default defineComponent({
    name: "general-settings",
    components: { XpComingSoonCard, XpDlcModal },

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
          const { fileName, savedTo, summary } = await this.runWithLoading(
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
    },
    setup() {
      // A backup or restore is running; the restore flow is shared with the empty File Select screen
      const { isBackupBusy, runWithLoading, selectRestoreFile } = useBackupRestore();
      const { isKidMode, currentHeroId, profile, canManage, canRestore } = useSignedInProfile();
      // When the last backup was made, and how to say so under "Back up everything"
      const lastBackup = ref(lastBackupAt());
      const backupAge = computed(() => backupAgeLabel(lastBackup.value));

      // This profile's own start-up choices, kept on this device
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

      const isDlcModalOpen = ref(false);
      const isDlcReady = ref(false);

      const checkDlcStatus = async () => {
        isDlcReady.value = await dlcService.checkStatus();
      };
      void checkDlcStatus();

      const dlcSummaryText = computed(() => {
        if (isDlcReady.value) {
          return "All monsters, dungeon art, and soundtrack loops are saved locally for offline play.";
        }
        return "Currently streaming art on-demand. Download all ~82 MB of assets for zero-lag offline play.";
      });

      const openDlcModal = () => {
        isDlcModalOpen.value = true;
      };

      const handleDlcCompleted = () => {
        isDlcModalOpen.value = false;
        isDlcReady.value = true;
      };

      const {
        t,
        locale: activeLocale,
        setLocale: changeLocale,
        availableLocales: languageOptions,
      } = useI18n();

      const handleLocaleChange = (value: SupportedLocale) => {
        changeLocale(value);
      };

      const showOnPicker = ref(familyOverviewOnPicker());
      const setShowOnPicker = (on: boolean) => {
        showOnPicker.value = on;
        setFamilyOverviewOnPicker(on);
      };

      return {
        t,
        activeLocale,
        handleLocaleChange,
        languageOptions,
        isBackupBusy,
        isKidMode,
        lastBackup,
        backupAge,
        currentHeroId,
        mapOutline,
        peopleOutline,
        showOnPicker,
        setShowOnPicker,
        profileName,
        landingOptions,
        landing,
        setLanding,
        guides,
        setGuides,
        rules,
        canManage,
        comingSoon: GENERAL_COMING_SOON,
        canRestore,
        selectRestoreFile,
        runWithLoading,
        cloudDownloadOutline,
        cloudUploadOutline,
        isDlcModalOpen,
        isDlcReady,
        dlcSummaryText,
        openDlcModal,
        handleDlcCompleted,
      };
    },
  });
</script>

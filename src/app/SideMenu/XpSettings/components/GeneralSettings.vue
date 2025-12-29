<template>
  <ion-page :class="$options.name">
    <ion-header :translucent="true">
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <ion-back-button :default-href="`/xp-settings/`"></ion-back-button>
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
  import { arrowBack } from "ionicons/icons";
  import { toastController } from "@ionic/vue";

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

      async showToast(message: string) {
        const toast = await toastController.create({
          message,
          duration: 2000,
          position: "bottom",
        });
        await toast.present();
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
      };

      const generalSettings = ref(
        savedSettings ? JSON.parse(savedSettings) : defaultSettings
      );
      const isPremiumUser = ref(true); // In a real app, this would be determined by user's subscription

      // Initialize dark mode on component mount
      if (generalSettings.value.darkMode) {
        document.body.classList.add("dark");
      }

      return {
        generalSettings,
        isPremiumUser,
        arrowBack,
      };
    },
  });
</script>

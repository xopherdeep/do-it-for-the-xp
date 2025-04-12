<template>
  <ion-page :class="$options.name">
    <ion-header :translucent="true">
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <ion-back-button default-href="/xp-settings"></ion-back-button>
        </ion-buttons>
        <ion-title>Theme Settings</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="rpg-box">
      <ion-card>
        <ion-list>
          <ion-item-group>
            <ion-item-divider>
              <ion-label>UI Theme</ion-label>
            </ion-item-divider>
            
            <ion-item>
              <ion-label>Interface Style</ion-label>
              <ion-select 
                :value="theme.ui"
                interface="action-sheet"
                @ionChange="changeUISound"
              >
                <ion-select-option value="nintendo">Nintendo</ion-select-option>
                <ion-select-option value="playstation">PlayStation</ion-select-option>
                <ion-select-option value="xbox">Xbox</ion-select-option>
              </ion-select>
            </ion-item>
          </ion-item-group>

          <ion-item-group>
            <ion-item-divider>
              <ion-label>RPG Theme</ion-label>
            </ion-item-divider>
            
            <ion-item>
              <ion-label>Game Style</ion-label>
              <ion-select 
                :value="theme.rpg"
                interface="action-sheet"
                @ionChange="changeRPGSound"
              >
                <ion-select-option value="chronoTrigger">Chrono Trigger</ion-select-option>
                <ion-select-option value="finalFantasy">Final Fantasy</ion-select-option>
                <ion-select-option value="zelda">Legend of Zelda</ion-select-option>
              </ion-select>
            </ion-item>
          </ion-item-group>

          <ion-item-group>
            <ion-item-divider>
              <ion-label>Display</ion-label>
            </ion-item-divider>
            
            <ion-item>
              <ion-label>
                <h2>Dark Mode</h2>
                <p>Enable dark theme across the app</p>
              </ion-label>
              <ion-toggle v-model="themeSettings.darkMode" @ionChange="toggleDarkMode"></ion-toggle>
            </ion-item>

            <ion-item>
              <ion-label>Color Theme</ion-label>
              <ion-select v-model="themeSettings.colorTheme" interface="action-sheet" @ionChange="updateColorTheme">
                <ion-select-option value="default">Default</ion-select-option>
                <ion-select-option value="fantasy">Fantasy</ion-select-option>
                <ion-select-option value="retro">Retro Gaming</ion-select-option>
              </ion-select>
            </ion-item>
          </ion-item-group>
        </ion-list>
      </ion-card>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue'
import { mapState, mapActions } from 'vuex'
import { 
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonList, IonItem, IonLabel, IonToggle, IonCard,
  IonBackButton, IonButtons, IonSelect, IonSelectOption,
  IonItemGroup, IonItemDivider, toastController
} from '@ionic/vue'
import ionic from "@/mixins/ionic"

export default defineComponent({
  name: 'ThemeSettings',
  components: {
    IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
    IonList, IonItem, IonLabel, IonToggle, IonCard,
    IonBackButton, IonButtons, IonSelect, IonSelectOption,
    IonItemGroup, IonItemDivider
  },
  mixins: [ionic],
  computed: {
    ...mapState(['theme'])
  },
  setup() {
    const themeSettings = ref({
      darkMode: false,
      colorTheme: 'default'
    })

    // Load saved settings
    const savedSettings = localStorage.getItem('themeSettings')
    if (savedSettings) {
      themeSettings.value = JSON.parse(savedSettings)
      // Apply saved dark mode
      document.body.classList.toggle('dark', themeSettings.value.darkMode)
    }

    return {
      themeSettings
    }
  },
  methods: {
    ...mapActions(['changeSoundFX']),
    
    async showToast(message: string) {
      const toast = await toastController.create({
        message,
        duration: 2000,
        position: 'bottom'
      })
      await toast.present()
    },

    update$fx({ rpg, ui }) {
      const { $fx, changeSoundFX } = this
      const newFx = { ...$fx.theme, rpg, ui }
      this.play$fx()
      changeSoundFX(newFx).then(() => ($fx.theme = newFx))
    },

    changeUISound(ev) {
      const { rpg } = this.theme
      this.update$fx({
        ui: ev.detail.value,
        rpg
      })
    },

    changeRPGSound(ev) {
      const { ui } = this.theme
      this.update$fx({
        rpg: ev.detail.value,
        ui
      })
    },

    toggleDarkMode() {
      document.body.classList.toggle('dark', this.themeSettings.darkMode)
      this.saveSettings()
      this.showToast(`Dark mode ${this.themeSettings.darkMode ? 'enabled' : 'disabled'}`)
    },

    updateColorTheme() {
      this.saveSettings()
      this.showToast(`Color theme changed to ${this.themeSettings.colorTheme}`)
    },

    saveSettings() {
      localStorage.setItem('themeSettings', JSON.stringify(this.themeSettings))
    }
  }
})
</script>
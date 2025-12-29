import { defineComponent } from 'vue'
import InputSettings from "./components/InputSettings.vue"
import SettingsMenu from "./components/SettingsMenu.vue"
const requireIconImg = require.context("@/assets/icons/");

import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonMenuButton,
  IonTitle,
  IonSelect,
  IonSelectOption,
  IonContent,
  IonRouterOutlet
} from '@ionic/vue'

import {
  arrowBack,
  settingsOutline,
  peopleOutline,
  volumeHighOutline,
  lockClosedOutline,
  personOutline
} from "ionicons/icons"

export default defineComponent({
  name: 'xp-settings',
  components: {
    InputSettings,
    SettingsMenu,
    IonSelect,
    IonSelectOption,
    IonPage,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonMenuButton,
    IonTitle,
    IonContent,
    IonRouterOutlet
  },
  mounted() {
    this.$fx.ui[this.$fx.theme.ui].options.play()
  },
  setup() {
    const settingsMenuItems = [
      {
        title: 'General Settings',
        icon: settingsOutline,
        route: '/xp-settings/general'
      },
      {
        title: 'Family Settings',
        icon: peopleOutline,
        route: '/xp-settings/family'
      },
      {
        title: 'Sound Settings',
        icon: volumeHighOutline,
        route: '/xp-settings/sound'
      },
      {
        title: 'Privacy Settings',
        icon: lockClosedOutline,
        route: '/xp-settings/privacy'
      },
      {
        title: 'Account Settings',
        icon: personOutline,
        route: '/xp-settings/account'
      }
    ]
    
    return {
      arrowBack,
      requireIconImg,
      settingsMenuItems
    }
  },
})

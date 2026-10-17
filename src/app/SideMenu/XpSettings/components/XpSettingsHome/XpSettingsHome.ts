import { defineComponent } from 'vue'
import ionic from "@/lib/mixins/ionic";
import { SETTINGS_SECTIONS } from "./settingsSections";
const requireIconImg = require.context("@/assets/icons/", false, /\.svg$/);

import {
  arrowBack,
  pizzaOutline,
  pizzaSharp
} from "ionicons/icons"

export default defineComponent({
  name: 'xp-settings-home',
  mixins: [ionic],
  setup() {
    return {
      arrowBack,
      requireIconImg,
      pizzaOutline,
      pizzaSharp,
      sections: SETTINGS_SECTIONS,
    };
  },
})
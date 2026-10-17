import { defineComponent } from 'vue'
import ionic from "@/lib/mixins/ionic";
import { PRO_ITEM, SETTINGS_SECTIONS } from "./settingsSections";
import XpBackupNudge from "../XpBackupNudge.vue";
const requireIconImg = require.context("@/assets/icons/", false, /\.svg$/);

import {
  arrowBack,
  pizzaOutline,
  pizzaSharp
} from "ionicons/icons"

export default defineComponent({
  name: 'xp-settings-home',
  mixins: [ionic],
  components: { XpBackupNudge },
  setup() {
    return {
      arrowBack,
      requireIconImg,
      pizzaOutline,
      pizzaSharp,
      sections: SETTINGS_SECTIONS,
      proItem: PRO_ITEM,
    };
  },
})
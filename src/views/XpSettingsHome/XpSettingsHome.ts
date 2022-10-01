import { defineComponent } from 'vue'
import ionic from "@/assets/js/mixins/ionic";
const requireIconImg = require.context("@/assets/images/icons/");

import {
  arrowBack
} from "ionicons/icons"

export default defineComponent({
  name: 'xp-settings-home',
  mixins: [ionic],
  setup() {
    // code
    return {
      arrowBack,
      requireIconImg
    }
  },
})
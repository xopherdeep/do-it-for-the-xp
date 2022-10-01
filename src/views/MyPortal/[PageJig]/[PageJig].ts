import { defineComponent } from 'vue'
import ionic from "@/mixins/ionic";

import {
  arrowBack
} from "ionicons/icons"

export default defineComponent({
  mixins: [ionic],
  setup() {
    // code
    return {
      arrowBack
    }
  },
})
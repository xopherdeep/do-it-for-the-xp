import { defineComponent } from 'vue'
import ionic from "@/mixins/ionic";


import {
  arrowBack
} from "ionicons/icons"

export default defineComponent({
  name: "xp-game-master",
  mixins: [ionic],
  components: {
  },
  setup() {
    // code
    return {
      arrowBack
    }
  },
})
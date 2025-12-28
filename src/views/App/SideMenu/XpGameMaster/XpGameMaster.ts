import { defineComponent } from 'vue'
import ionic from "@/mixins/ionic";
import { useRoute } from 'vue-router'

import {
  arrowBack,
  speedometerOutline,
  speedometerSharp,
  trophyOutline,
  trophySharp,
  pawOutline,
  pawSharp
} from "ionicons/icons"

export default defineComponent({
  name: "xp-game-master",
  mixins: [ionic],
  setup() {
    const route = useRoute()
    return {
      route,
      arrowBack,
      speedometerOutline,
      speedometerSharp,
      trophyOutline,
      trophySharp,
      pawOutline,
      pawSharp
    }
  },
})

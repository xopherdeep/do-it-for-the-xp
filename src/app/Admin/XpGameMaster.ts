import { defineComponent } from 'vue'
import ionic from "@/lib/mixins/ionic";
import { useRoute, useRouter } from 'vue-router'

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
    const router = useRouter()
    return {
      route,
      router,
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

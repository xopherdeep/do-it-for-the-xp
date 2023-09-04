import { defineComponent , ref } from 'vue'
import ionic from "@/mixins/ionic";

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
  components: {
  },
  setup() {
    // code
    const selectedTab = ref('dashboard'); // default selected tab
    const updateSelectedTab = (event) => {
      console.log('ionTabsDidChange event:', event);
      if (event && event.detail) {
        console.log('event.detail.tab:', event.detail.tab);
        selectedTab.value = event.detail.tab;
      }
    };
    return {
      arrowBack,
      speedometerOutline,
      speedometerSharp,
      trophyOutline,
      trophySharp,
      pawOutline,
      pawSharp,
      selectedTab,
      updateSelectedTab
    }
  },
})

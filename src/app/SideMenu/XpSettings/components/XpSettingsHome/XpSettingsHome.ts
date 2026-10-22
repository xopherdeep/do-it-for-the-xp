import { computed, defineComponent } from 'vue'
import { useRouter } from "vue-router";
import ionic from "@/lib/mixins/ionic";
import { PRO_ITEM, sectionsFor, type SettingsItem } from "./settingsSections";
import { useUnlinkPhone } from "./useUnlinkPhone";
import { useFamilyStore } from "@/lib/store/stores/family";
import XpBackupNudge from "../XpBackupNudge.vue";
import XpRevealPrompt from "@/components/organisms/RevealPrompt/XpRevealPrompt.vue";
const requireIconImg = require.context("@/assets/icons/", false, /\.svg$/);

import {
  arrowBack,
  pizzaOutline,
  pizzaSharp
} from "ionicons/icons"

export default defineComponent({
  name: 'xp-settings-home',
  mixins: [ionic],
  components: { XpBackupNudge, XpRevealPrompt },
  setup() {
    const family = useFamilyStore();
    // A kid phone lists its own pages and the way to unlink (family sync spec, section 7)
    const sections = computed(() => sectionsFor({ isKidMode: family.isKidMode }));
    const { prompt, respond, unlinkThisPhone } = useUnlinkPhone(useRouter());
    /** A row that does something instead of opening a page */
    const runRow = (item: SettingsItem): void => {
      const isUnlink = item.action === "unlink-phone";
      if (isUnlink) void unlinkThisPhone();
    };

    return {
      arrowBack,
      requireIconImg,
      pizzaOutline,
      pizzaSharp,
      sections,
      isKidMode: computed(() => family.isKidMode),
      runRow,
      prompt,
      respond,
      proItem: PRO_ITEM,
    };
  },
})
import { defineComponent } from "vue";
import XpComingSoonCard from "@/app/SideMenu/XpSettings/components/XpComingSoonCard.vue";
import type { ComingSoonItem } from "@/app/SideMenu/XpSettings/components/comingSoon";

/**
 * Ready-made quests came from the old WordPress feed, which no longer answers (GitHub issue 138). The route stays so
 * the quest list's Discover entry never lands on a missing page; packs (Settings > Packs) are the way to add quests
 * that someone else wrote.
 */
const DISCOVER_COMING_SOON: ComingSoonItem[] = [
  { title: "Ready-made quests", description: "Browse chores other families made and copy them in. For now, load a pack from Settings" },
];

export const XpDiscoverAchievements = defineComponent({
  name: "xp-discover-achievements",
  components: { XpComingSoonCard },
  setup() {
    return { comingSoonItems: DISCOVER_COMING_SOON };
  },
});

export default XpDiscoverAchievements;

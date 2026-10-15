import { computed, defineComponent, onMounted, ref } from "vue";
import { toastController } from "@ionic/vue";
import { play$fx } from "@/assets/fx";
import { rpgToastOptions } from "@/hooks/useToast";
import ionic from "@/lib/mixins/ionic";
import { AchievementDb, achievementStorage } from "@/lib/databases/AchievementDb";
import { getQuestLogDb, type QuestLogEntry } from "@/lib/databases/QuestLogDb";
import { heroAvatarSrc } from "@/lib/hero-look/look";
import {
  changeLabel,
  heroInsights,
  recapLines,
  recapShareText,
  WEEKDAYS,
} from "@/lib/services/insights/heroInsights";
import { nextChest } from "@/lib/services/streaks/streakChests";
import { useGameRulesStore } from "@/lib/store/stores/gameRules";
import { useUserStore } from "@/lib/store/stores/user";
import { copyTextToClipboard } from "@/lib/utils/clipboard";
import debug from "@/lib/utils/debug";
import { formatQuestName } from "@/lib/utils/format";

const requireAvatar = require.context("@/assets/images/avatars/", false, /\.svg$/);

const TIME_WORDS = { morning: "Mornings", afternoon: "Afternoons", evening: "Evenings", night: "Nights" } as const;

/** "Oct 9" from a YYYY-MM-DD day */
const shortDay = (dayKey: string): string => {
  const [year, month, day] = dayKey.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

/**
 * Hero Records (services/insights/heroInsights.ts): the weekly recap card to screenshot or share, the streak, XP over
 * the last 8 weeks, all-time records, the beasts tamed most and the ones the hero runs from.
 */
export default defineComponent({
  name: "my-records",
  mixins: [ionic],
  props: { userId: { type: String, default: "" } },
  setup(props) {
    const userStore = useUserStore();
    const rules = useGameRulesStore();
    const entries = ref<QuestLogEntry[]>([]);
    const questNames = ref(new Map<string, string>());
    const loaded = ref(false);

    const heroId = computed(() => String(props.userId || userStore.currentUser?.id || ""));
    const user = computed(() => userStore.users[heroId.value] || null);
    const nickname = computed(() => user.value?.name?.nick || user.value?.name?.first || "Hero");
    const avatarSrc = computed(() => heroAvatarSrc(user.value, requireAvatar) || requireAvatar("./001-gamer.svg"));

    const insights = computed(() =>
      heroInsights(entries.value, heroId.value, user.value, new Date(), questNames.value)
    );
    const recap = computed(() => recapLines(insights.value));
    const weekRange = computed(() => {
      const bars = insights.value.xpByWeek;
      const from = bars[bars.length - 1]?.from || "";
      return from ? `${shortDay(from)} to today` : "";
    });
    const chartMax = computed(() => Math.max(1, ...insights.value.xpByWeek.map((bar) => bar.xp)));
    const bars = computed(() =>
      insights.value.xpByWeek.map((bar, index, all) => ({
        ...bar,
        label: shortDay(bar.from),
        height: Math.round((bar.xp / chartMax.value) * 100),
        isThisWeek: index === all.length - 1,
      }))
    );
    const next = computed(() => nextChest(insights.value.streak.current));
    const busiestDay = computed(() =>
      insights.value.busiestWeekday === null ? "None yet" : `${WEEKDAYS[insights.value.busiestWeekday]}s`
    );
    const favoriteTime = computed(() =>
      insights.value.favoriteTime ? TIME_WORDS[insights.value.favoriteTime] : "None yet"
    );
    const questChange = computed(() => changeLabel(insights.value.thisWeek.quests, insights.value.lastWeek.quests));
    const xpChange = computed(() => changeLabel(insights.value.thisWeek.xp, insights.value.lastWeek.xp));

    const load = async () => {
      try {
        const [log, quests] = await Promise.all([
          getQuestLogDb().getEntriesForUser(heroId.value),
          new AchievementDb(achievementStorage).getTasks(),
        ]);
        entries.value = log;
        questNames.value = new Map(
          quests.filter(Boolean).map((quest) => [String(quest.id), formatQuestName(quest.achievementName || "")])
        );
      } catch (error) {
        debug.warn("records: could not read the quest log", error);
      } finally {
        loaded.value = true;
      }
    };

    const shareRecap = async () => {
      play$fx("select");
      const text = recapShareText(nickname.value, insights.value);
      try {
        const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
        if (canShare) {
          await navigator.share({ title: `${nickname.value}'s week`, text });
          return;
        }
      } catch (error) {
        // The share sheet was closed or refused: fall back to the clipboard
        debug.warn("records: share refused, copying instead", error);
      }
      const copied = await copyTextToClipboard(text);
      const toast = await toastController.create(
        rpgToastOptions(copied ? "Recap copied! Paste it anywhere." : "Could not copy the recap.")
      );
      await toast.present();
    };

    onMounted(() => {
      void rules.load();
      void load();
    });

    return {
      rules,
      loaded,
      user,
      nickname,
      avatarSrc,
      insights,
      recap,
      weekRange,
      bars,
      next,
      busiestDay,
      favoriteTime,
      questChange,
      xpChange,
      shareRecap,
    };
  },
});

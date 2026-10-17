import { computed, onBeforeUnmount, onMounted, ref, watch, type Ref } from "vue";
import { useRoute } from "vue-router";
import { getTempleProgressDb } from "@/lib/databases/TempleProgressDb";
import { getQuestLogDb } from "@/lib/databases/QuestLogDb";
import { getQuestEngine } from "@/lib/engine/quests/QuestEngine";
import { onQuestPaid } from "@/lib/services/multiplayer/gameSignals";
import { guideRecordOf } from "@/lib/services/guide/guideState";
import {
  nextGuideStep,
  normalPegasi,
  templeProgressOf,
  type GuideStep,
  type GuideTempleProgress,
} from "@/lib/services/guide/nextStep";
import { useUserStore } from "@/lib/store/stores/user";
import { useHeroStreak } from "@/hooks/useHeroStreak";
import debug from "@/lib/utils/debug";

/**
 * The Guide's next step for a hero (services/guide/nextStep.ts), kept fresh: the Pegasi and the Guide record come
 * straight from the profile, and the temple records, the quest log and today's board are read again on mount, on
 * every route change (back from a temple, say) and whenever a quest pays.
 */
export function useGuide(heroId: Ref<string>) {
  const userStore = useUserStore();
  const route = useRoute();
  const { streak, enabled: streaksOn } = useHeroStreak(heroId);

  const temples = ref<Record<string, GuideTempleProgress>>({});
  const hasQuestLog = ref(false);
  const openQuests = ref(0);
  const loaded = ref(false);

  const refresh = async (): Promise<void> => {
    const id = heroId.value;
    if (!id) return;
    try {
      const [records, log, open] = await Promise.all([
        getTempleProgressDb().getProgressForUser(id),
        getQuestLogDb().getEntriesForUser(id),
        getQuestEngine().getOpenQuestsForUser(id),
      ]);
      const isStaleHero = id !== heroId.value;
      if (isStaleHero) return;
      temples.value = Object.fromEntries(records.map((entry) => [entry.templeId, templeProgressOf(entry)]));
      hasQuestLog.value = log.some((entry) => entry.status !== "rejected");
      openQuests.value = open.length;
      loaded.value = true;
    } catch (error) {
      debug.warn("guide: could not read the hero's progress", error);
    }
  };

  const hero = computed(() => userStore.getUserById(heroId.value));
  const record = computed(() => guideRecordOf(hero.value));

  const step = computed<GuideStep>(() =>
    nextGuideStep({
      questsSeen: Boolean(record.value.questsSeen) || hasQuestLog.value,
      shopSeen: Boolean(record.value.shopSeen),
      champion: Boolean(record.value.championAt),
      pegasi: normalPegasi(hero.value?.stats?.pegasi),
      temples: temples.value,
      openQuests: openQuests.value,
      streakDays: streaksOn.value ? streak.value.current : 0,
      streakAtRisk: streaksOn.value && streak.value.atRisk,
    })
  );

  let stopPaid: (() => void) | null = null;
  onMounted(() => {
    void refresh();
    stopPaid = onQuestPaid(({ heroId: paidId }) => {
      const isThisHero = paidId === heroId.value;
      if (isThisHero) void refresh();
    });
  });
  onBeforeUnmount(() => stopPaid?.());
  watch(heroId, () => void refresh());
  watch(() => route.fullPath, () => void refresh());

  return { step, record, loaded, refresh };
}

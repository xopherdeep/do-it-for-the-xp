import { computed, onBeforeUnmount, onMounted, ref, watch, type Ref } from "vue";
import { getQuestLogDb, type QuestLogEntry } from "@/lib/databases/QuestLogDb";
import { onQuestPaid } from "@/lib/services/multiplayer/gameSignals";
import { dailyStreak, EMPTY_STREAK, type DailyStreak } from "@/lib/services/streaks/dailyStreak";
import { useGameRulesStore } from "@/lib/store/stores/gameRules";
import { useUserStore } from "@/lib/store/stores/user";
import debug from "@/lib/utils/debug";

/** How often the streak is read again while a screen shows it, so midnight turns "kept" into "at risk" */
const REFRESH_MS = 60_000;

/**
 * A hero's daily streak for a screen (services/streaks/dailyStreak.ts), read from the quest log and kept fresh: on
 * mount, whenever a quest pays, when the hero's stats change, and once a minute (a claim held for approval pays
 * nothing, so the minute tick is what picks it up).
 * `enabled` follows the Game Master's switch in Settings > Chores.
 */
export function useHeroStreak(heroId: Ref<string>) {
  const rulesStore = useGameRulesStore();
  const userStore = useUserStore();
  const entries = ref<QuestLogEntry[]>([]);
  const today = ref(new Date());

  const refresh = async (): Promise<void> => {
    const id = heroId.value;
    if (!id) return;
    try {
      const read = await getQuestLogDb().getEntriesForUser(id);
      const isStaleHero = id !== heroId.value;
      if (isStaleHero) return;
      entries.value = read;
      today.value = new Date();
    } catch (error) {
      debug.warn("streaks: could not read the quest log", error);
    }
  };

  const streak = computed<DailyStreak>(() =>
    heroId.value ? dailyStreak(entries.value, heroId.value, today.value) : { ...EMPTY_STREAK }
  );
  const enabled = computed(() => rulesStore.streaks);

  let stopPaid: (() => void) | null = null;
  let timer: ReturnType<typeof setInterval> | null = null;
  onMounted(() => {
    void rulesStore.load();
    void refresh();
    stopPaid = onQuestPaid(({ heroId: paidId }) => {
      const isThisHero = paidId === heroId.value;
      if (isThisHero) void refresh();
    });
    timer = setInterval(() => void refresh(), REFRESH_MS);
  });
  onBeforeUnmount(() => {
    stopPaid?.();
    if (timer) clearInterval(timer);
  });
  watch(heroId, () => void refresh());
  watch(() => userStore.users[heroId.value]?.stats, () => void refresh(), { deep: true });

  return { streak, enabled, refresh };
}

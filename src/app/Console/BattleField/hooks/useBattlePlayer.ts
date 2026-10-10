import {
  computed,
  getCurrentScope,
  onScopeDispose,
  ref,
  toValue,
  watch,
  type MaybeRefOrGetter,
} from "vue";
import { calculatePlayerStats } from "@/lib/services/stats/PlayerStatsService";
import { useUserStore } from "@/lib/store/stores/user";
import type { SpecialStats } from "@/lib/utils/User/stats";
import { requireAvatar } from "@/lib/utils/requireImg";

/** One tick of the HP / MP odometer: the number on the tiles moves one step toward the real value. */
export const ROLL_STEP_MS = 40;

/** The slice of a stored hero profile that the battle screen reads (the user store keeps profiles untyped). */
export interface BattlePlayer {
  id: string;
  name?: { full?: string; first?: string; nick?: string };
  /** File name of the avatar without folder or extension, e.g. "003-gamer". */
  avatar?: string;
  jobClass?: string;
  stats?: {
    level?: number;
    hp?: { now?: number; max?: number };
    mp?: { now?: number; max?: number };
    special?: Partial<SpecialStats>;
    classes?: Record<string, { level?: number }>;
  };
}

/**
 * The tiles of one odometer, left to right (the names are the old HUD's). Leading zeros are blank strings,
 * and a number past 999 spills into the left tile, so 1234 reads "12" "3" "4".
 */
export interface OdometerDigits {
  thou: string;
  hun: string;
  ten: string;
}

const finiteNumber = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

const cleanText = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

const toOdometer = (value: number): OdometerDigits => {
  const whole = Math.max(0, Math.floor(value));
  const high = Math.floor(whole / 100);
  const tens = Math.floor(whole / 10) % 10;
  return {
    thou: high > 0 ? String(high) : "",
    hun: high > 0 || tens > 0 ? String(tens) : "",
    ten: String(whole % 10),
  };
};

const toPercent = (value: number, max: number): number =>
  max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;

/**
 * A whole number that counts toward `target` one step per tick, like the odometers in the original game.
 * It starts AT the target (a card that opens on 30 HP shows 30, it does not count up from zero) and runs at
 * most one interval, only while the shown number is away from the target.
 */
const useRollingNumber = (target: () => number) => {
  const shown = ref(target());
  let timer: number | undefined;

  const stop = () => {
    if (timer === undefined) return;
    window.clearInterval(timer);
    timer = undefined;
  };

  const step = () => {
    const goal = target();
    if (shown.value !== goal) shown.value += shown.value < goal ? 1 : -1;
    if (shown.value === goal) stop();
  };

  // Sync flush: the first tick is scheduled in the same breath as the damage, not a microtask later.
  watch(
    target,
    (goal) => {
      if (shown.value !== goal && timer === undefined) timer = window.setInterval(step, ROLL_STEP_MS);
    },
    { flush: "sync" }
  );

  /** Jump to the real value without rolling. */
  const snap = () => {
    stop();
    shown.value = target();
  };

  if (getCurrentScope()) onScopeDispose(stop);

  return { shown, snap };
};

/**
 * The hero on the battle screen: name, level, avatar and the rolling HP / MP odometers.
 *
 * Everything derives from `useUserStore().users[userId]`, so whoever changes the profile (the engine's
 * `updateUserHP`, a level-up, a restore) moves the card without being asked. The hook never loads or writes
 * anything: the user store must already hold the hero, and until it does `isLoading` is true.
 *
 * Call it from a component's `setup()`: the rolling intervals are cancelled when the component unmounts.
 *
 * @param userId The hero's id, as a value, ref or getter. Left out, the signed-in hero is shown.
 */
export function useBattlePlayer(userId?: MaybeRefOrGetter<string | null | undefined>) {
  const userStore = useUserStore();

  // Left out entirely, the signed-in hero is shown; an id that is empty or unknown is a hero who is missing.
  const heroId = computed(() => (userId === undefined ? userStore.currentUser.id : toValue(userId)) || "");
  const player = computed<BattlePlayer | null>(() => {
    const stored: BattlePlayer | undefined = userStore.users[heroId.value];
    return stored ?? null;
  });
  /** True only while the hero is missing from the store. */
  const isLoading = computed(() => player.value === null);

  const playerName = computed(
    () => cleanText(player.value?.name?.nick) || cleanText(player.value?.name?.first) || "Hero"
  );
  const level = computed(() => Math.max(1, Math.floor(finiteNumber(player.value?.stats?.level) ?? 1)));

  const avatarSrc = computed(() => {
    const avatar = player.value?.avatar;
    if (!avatar) return "";
    try {
      const src = requireAvatar(`./${avatar}.svg`);
      return typeof src === "string" ? src : "";
    } catch {
      return "";
    }
  });

  // The profile's own max is the source of truth; the class formula only fills in for a profile without one.
  const formula = computed(() => {
    const hero = player.value;
    const jobClass = cleanText(hero?.jobClass) || "default";
    const classLevel = finiteNumber(hero?.stats?.classes?.[jobClass]?.level) || 1;
    return calculatePlayerStats(level.value, jobClass, hero?.stats?.special, undefined, undefined, classLevel);
  });
  const hpNow = computed(() => finiteNumber(player.value?.stats?.hp?.now) ?? 0);
  const hpMax = computed(() => {
    const stored = finiteNumber(player.value?.stats?.hp?.max);
    return stored !== undefined && stored > 0 ? stored : formula.value.hp.max;
  });
  const mpNow = computed(() => finiteNumber(player.value?.stats?.mp?.now) ?? 0);
  const mpMax = computed(() => {
    const stored = finiteNumber(player.value?.stats?.mp?.max);
    return stored !== undefined && stored >= 0 ? stored : formula.value.mp.max;
  });

  const hp = useRollingNumber(() => Math.max(0, Math.round(hpNow.value)));
  const mp = useRollingNumber(() => Math.max(0, Math.round(mpNow.value)));

  // A hero who turns up after the card did (or a different one) starts on their real numbers, not rolling from zero.
  watch(
    () => (player.value ? heroId.value : ""),
    (key) => {
      if (!key) return;
      hp.snap();
      mp.snap();
    },
    { flush: "sync" }
  );

  const hpDisplay = hp.shown;
  const mpDisplay = mp.shown;

  return {
    player,
    isLoading,
    playerName,
    level,
    avatarSrc,
    /** The profile's real numbers. */
    hpNow,
    hpMax,
    mpNow,
    mpMax,
    /** What the tiles show right now: whole numbers that roll toward the real ones. */
    hpDisplay,
    mpDisplay,
    formattedHp: computed(() => toOdometer(hpDisplay.value)),
    formattedMp: computed(() => toOdometer(mpDisplay.value)),
    /** The rolling number as a share of the max, 0 to 100, so the bars move with the tiles. */
    hpPercentage: computed(() => toPercent(hpDisplay.value, hpMax.value)),
    mpPercentage: computed(() => toPercent(mpDisplay.value, mpMax.value)),
  };
}

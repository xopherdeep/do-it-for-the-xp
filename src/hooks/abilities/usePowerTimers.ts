/**
 * The hero's running timed privileges for a screen: the timers with a ticking clock, and "time's up" said once when
 * one runs out (a sound and a toast here; the alert and the notifications are PowerTimerActions.finishExpiredTimers).
 * One clock ticks for every screen that uses it, and it stops when none is left.
 */
import { computed, onBeforeUnmount, onMounted, ref, watch, type Ref } from "vue";
import { play$fx } from "@/assets/fx";
import { useToast } from "@/hooks/useToast";
import { useUserStore } from "@/lib/store/stores/user";
import { countdownLabel, msLeft, runningTimers, type PowerTimer } from "@/lib/services/abilities/PowerTimers";
import { endPowerTimer, finishExpiredTimers } from "@/lib/services/abilities/PowerTimerActions";

const now = ref(new Date());
let ticker: ReturnType<typeof setInterval> | null = null;
let users = 0;

const startTicking = () => {
  users += 1;
  if (ticker) return;
  now.value = new Date();
  ticker = setInterval(() => {
    now.value = new Date();
  }, 1000);
};

const stopTicking = () => {
  users = Math.max(0, users - 1);
  if (users) return;
  if (!ticker) return;
  clearInterval(ticker);
  ticker = null;
};

export interface PowerTimerView extends PowerTimer {
  /** "29:59" */
  left: string;
  /** 0 to 1 of the time still on the clock */
  fraction: number;
}

/** `quiet`: time's up is still said to the hero's feed and the alert, but this screen plays no sound and shows no toast (the Game Master's dashboard) */
export const usePowerTimers = (heroId: Readonly<Ref<string>>, options: { quiet?: boolean } = {}) => {
  const userStore = useUserStore();
  const { showToast } = useToast();

  const timers = computed<PowerTimerView[]>(() =>
    runningTimers(userStore.users[heroId.value], now.value).map((timer) => {
      const total = new Date(timer.endsAt).getTime() - new Date(timer.startedAt).getTime();
      const left = msLeft(timer, now.value);
      return { ...timer, left: countdownLabel(left), fraction: total > 0 ? left / total : 0 };
    })
  );

  // Whatever ran out, while the screen was open or while the app was closed, is said once and taken off
  const sayTimeUp = () => {
    if (!heroId.value) return;
    const ended = finishExpiredTimers(heroId.value, now.value);
    const isSilent = !ended.length || options.quiet;
    if (isSilent) return;
    play$fx("learn");
    void showToast(ended.map((timer) => `Time's up: ${timer.name}!`).join("<br>"), 6000, "middle");
  };

  watch([now, heroId], sayTimeUp);

  /** Hand the time back before it runs out (the hero, or a Game Master on the dashboard) */
  const stopEarly = (abilityId: string, endedBy = "") => {
    const ended = endPowerTimer(heroId.value, abilityId, endedBy);
    if (ended) play$fx("cursor");
    return ended;
  };

  onMounted(() => {
    startTicking();
    sayTimeUp();
  });
  onBeforeUnmount(stopTicking);

  return { timers, stopEarly, now };
};

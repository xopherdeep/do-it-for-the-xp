import { getQuestEngine } from "@/lib/engine/quests/QuestEngine";
import { getQuestLogDb, type QuestLogEntry } from "@/lib/databases/QuestLogDb";
import { lockedNoticesFor } from "@/lib/services/quests/lateChores";
import { sentBackFor } from "@/lib/services/quests/sentBack";
import { questListFor } from "@/lib/services/quests/QuestList";
import { dailyStreak } from "@/lib/services/streaks/dailyStreak";
import { useGameRulesStore } from "@/lib/store/stores/gameRules";
import { useUserStore } from "@/lib/store/stores/user";
import debug from "@/lib/utils/debug";
import { buildWidgetSyncPayload, type WidgetHeroInput } from "./widgetDataExtractor";
import { hasWidgetHost, syncWidgetData, type WidgetSyncResult } from "./widgetSync";

export type { WidgetSyncResult };

/**
 * How long a burst of syncs is held. persistUser fires on every stat tick — three of them land in
 * one battle turn — and each sync is a full board read plus a bridge hop into SharedPreferences.
 */
export const WIDGET_SYNC_DEBOUNCE_MS = 1500;

// useTimers clears itself when the component that called it unmounts; this debounce belongs to no
// screen and has to outlive all of them, so it is a plain timer the module owns.
let pending: ReturnType<typeof setTimeout> | null = null;

const clearPending = (): void => {
  if (!pending) return;
  clearTimeout(pending);
  pending = null;
};

/** A side read nobody could finish falls back: a missing late notice is not worth the whole sync. */
const readOr = async <T>(read: () => Promise<T>, what: string, fallback: T): Promise<T> => {
  try {
    return await read();
  } catch (error) {
    debug.warn(`[WidgetSync] could not read ${what}`, error);
    return fallback;
  }
};

/**
 * One hero's slice, assembled the way the quest log screen assembles it (MyQuests.ts): the engine's
 * board, then `questListFor` with the same late-lock and sent-back notices, so a widget row reads
 * exactly as the row in the app.
 */
const heroInputFor = async (
  user: any,
  entries: QuestLogEntry[],
  streaksOn: boolean,
  now: Date
): Promise<WidgetHeroInput> => {
  const id = String(user?.id ?? "");
  const effects = user?.questEffects;
  const board = await getQuestEngine().getQuestBoardForUser(id, now, undefined, effects);
  const locked = await readOr(() => lockedNoticesFor(board, id, now), "the late-chore locks", {});
  const sentBack = await readOr(
    async () => sentBackFor(entries, board, id, now, effects),
    "the sent-back claims",
    {}
  );
  const rows = questListFor(id, now, board, useUserStore().users, effects, locked, sentBack);
  // The Game Master's switch in Settings > Chores: with streaks off the Streak Altar shows nothing
  const streak = streaksOn ? dailyStreak(entries, id, now).current : 0;

  return { user, rows, streak };
};

/**
 * Write the whole family's state to the home-screen widgets.
 *
 * It takes nothing and gathers everything itself, because its callers (persistUser, the identity
 * actions, the config modal's Sync Now) have no business knowing what a widget draws. Never throws:
 * a home screen going stale must not break a save.
 */
export const syncAllWidgets = async (): Promise<WidgetSyncResult> => {
  // Fresher data than whatever a queued run would have gathered
  clearPending();

  try {
    const userStore = useUserStore();
    const rules = useGameRulesStore();
    await rules.load().catch((error) => debug.warn("[WidgetSync] could not read the family rules", error));

    // Signed out, primaryHeroId is empty: an unbound widget then draws its signed-out face rather
    // than keeping the last hero's numbers on the home screen of a tablet the family shares.
    const primaryHeroId = String(userStore.currentUser?.id ?? "");
    const roster = Object.values(userStore.users).filter((user: any) => user?.id);
    if (!roster.length) return { ok: false, reason: "no profiles are loaded yet" };

    // One read of the log for the whole family: both `dailyStreak` and `sentBackFor` pick their own
    // hero's entries out of it, and the roster would otherwise re-read the same store once a hero.
    const entries = await readOr(() => getQuestLogDb().getEntries(), "the quest log", [] as QuestLogEntry[]);

    const now = new Date();
    const heroes: WidgetHeroInput[] = [];
    for (const user of roster) {
      heroes.push(await heroInputFor(user, entries, rules.streaks, now));
    }

    return await syncWidgetData(buildWidgetSyncPayload(primaryHeroId, heroes, now.getTime()));
  } catch (error) {
    debug.error("[WidgetSync] could not build the widget payload", error);
    return { ok: false, reason: "could not read the family's quests" };
  }
};

/**
 * Ask for a sync soon. This is what the save path and the identity actions call: a burst of stat
 * writes, or a sign-in that reloads the roster first, collapses into one run.
 */
export const queueWidgetSync = (): void => {
  // Off Android the sync would read the whole family's board only to throw it away at the bridge.
  // Skipping the timer outright also keeps a 1.5s handle from outliving a jest spec that signed a
  // hero in: the user store queues on login, logout and every persist.
  if (!hasWidgetHost()) return;
  clearPending();
  pending = setTimeout(() => {
    pending = null;
    void syncAllWidgets();
  }, WIDGET_SYNC_DEBOUNCE_MS);
};

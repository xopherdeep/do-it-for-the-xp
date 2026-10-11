import type { BattleContext } from "./battleContext";

/**
 * Chores finished earlier today, per hero and per fight. A dinner call, a dead battery or an
 * escape must not throw away real work: reopening the same fight restores the checked chores
 * and the beast is "still hurt from earlier". Cleared on victory; a new day starts fresh.
 */
const STORAGE_PREFIX = "xp_battle_progress:";

const today = (now = new Date()): string => {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
};

const resolveFightKey = (ctx: BattleContext): string => {
  if (ctx.kind === "quest") {
    return `quest:${ctx.questId ?? ""}`;
  }
  if (ctx.kind === "temple") {
    return `temple:${ctx.templeId ?? ""}:${ctx.level ?? ""}:${ctx.x ?? ""}:${ctx.y ?? ""}`;
  }
  return `free:${ctx.beastIds.join(",")}`;
};

/** One key per hero, fight and day; the fight is the quest, the temple room or the beast set. */
export const battleProgressKey = (ctx: BattleContext, now = new Date()): string => {
  const fight = resolveFightKey(ctx);
  return `${STORAGE_PREFIX}${ctx.userId}:${fight}:${today(now)}`;
};

const storage = (): Storage | null => {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
};

export const loadBattleProgress = (ctx: BattleContext): string[] => {
  const store = storage();
  if (!store) return [];
  try {
    const raw = store.getItem(battleProgressKey(ctx));
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
};

export const saveBattleProgress = (ctx: BattleContext, completedTaskIds: string[]): void => {
  const store = storage();
  if (!store) return;
  try {
    if (completedTaskIds.length) store.setItem(battleProgressKey(ctx), JSON.stringify(completedTaskIds));
    else store.removeItem(battleProgressKey(ctx));
  } catch {
    // storage full or blocked: the fight still works, it just will not be remembered
  }
};

export const clearBattleProgress = (ctx: BattleContext): void => saveBattleProgress(ctx, []);

/** Yesterday's keys are never read again; sweep them so the store does not grow forever. */
export const pruneBattleProgress = (now = new Date()): void => {
  const store = storage();
  if (!store) return;
  const keep = today(now);
  try {
    const stale: string[] = [];
    for (let index = 0; index < store.length; index += 1) {
      const key = store.key(index);
      if (key && key.startsWith(STORAGE_PREFIX) && !key.endsWith(keep)) stale.push(key);
    }
    stale.forEach((key) => store.removeItem(key));
  } catch {
    // nothing to prune
  }
};

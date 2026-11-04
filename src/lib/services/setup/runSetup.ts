/**
 * Setup wizard, the storage side: is this game empty, who already plays, and the one merge restore that applies a plan.
 *
 * Like Quick start it is all or nothing (a single BackupService restore) and it only ever adds: existing heroes are
 * never rewritten and anything that already exists (shops, beasts, quests, abilities...) is kept.
 */
import type { BackupFile } from "@/lib/services/core/BackupService";
import { firstRunService, readAll, storageOf } from "@/lib/services/core/packs/quickStart";
import type { PackStorage } from "@/lib/services/core/packs/packService";
import { BackupPermissionError } from "@/lib/services/core/BackupService";
import { canManageFamily } from "@/router/_Guards/gm.guard";
import { setupBlockedReason } from "./setupGuard";
import { setupPlan } from "./setupPlan";
import type { SetupAnswers, SetupHero, SetupPlan, SetupStored } from "./setupPlan";

export interface SetupDeps {
  storage: (name: string) => PackStorage;
  /** A merge restore of the plan's backup */
  restore: (file: BackupFile) => Promise<unknown>;
  /** Whether the person at the device may manage the family (canManageFamily); a test may leave it out */
  canManage?: () => boolean;
}

const defaultDeps: SetupDeps = {
  storage: storageOf,
  restore: (file) => firstRunService.restoreBackup(file, { mode: "merge" }),
};

/** No beasts and no quests yet: the wizard has nothing of the family's to collide with */
export const isGameEmpty = async (deps: SetupDeps = defaultDeps): Promise<boolean> => {
  const beasts = await readAll(deps.storage("__beasts"));
  const quests = await readAll(deps.storage("__achievements"));
  return beasts.size === 0 && quests.size === 0;
};

/** The profiles already on this device, as wizard heroes that need no new profile */
export const existingHeroes = async (deps: SetupDeps = defaultDeps): Promise<SetupHero[]> => {
  const profiles = await readAll(deps.storage("__profiles"));
  return Array.from(profiles.entries()).map(([key, value]) => {
    const profile = value as { id?: unknown; name?: { full?: string }; isAdult?: boolean };
    return {
      id: String(profile.id ?? key),
      name: String(profile.name?.full ?? ""),
      age: null,
      existing: true,
      isParent: Boolean(profile.isAdult),
    };
  });
};

/** The ids of what the game already holds, which the plan must not overwrite */
export const readSetupStored = async (deps: SetupDeps = defaultDeps): Promise<SetupStored> => {
  const ids = async (name: string) => new Set((await readAll(deps.storage(name))).keys());
  return {
    achievements: await readAll(deps.storage("__achievements")),
    beasts: await ids("__beasts"),
    abilities: await ids("__abilities"),
    accessories: await ids("__accessories"),
    dosDonts: await ids("__dosDonts"),
  };
};

/** Why this person may not run setup (a Game Master exists and they cannot manage the family), or null */
export const setupBlocked = async (deps: SetupDeps = defaultDeps): Promise<string | null> => {
  const profiles = await readAll(deps.storage("__profiles"));
  const canManage = (deps.canManage ?? (() => canManageFamily()))();
  return setupBlockedReason(Array.from(profiles.values()) as { isAdult?: unknown }[], canManage);
};

/** Builds the plan from the answers and applies it in one merge restore; a failed restore rejects and can be retried */
export const runSetup = async (answers: SetupAnswers, deps: SetupDeps = defaultDeps): Promise<SetupPlan> => {
  const blocked = await setupBlocked(deps);
  if (blocked) throw new BackupPermissionError(blocked);
  const shopsNow = await readAll(deps.storage("__shops"));
  const plan = setupPlan(answers, shopsNow, new Date(), undefined, await readSetupStored(deps));
  await deps.restore(plan.backup);
  return plan;
};

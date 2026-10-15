import { toastController } from "@ionic/vue";
import { play$fx } from "@/assets/fx";
import { rpgToastOptions } from "@/hooks/useToast";
import { getQuestLogDb } from "@/lib/databases/QuestLogDb";
import { onQuestPaid } from "@/lib/services/multiplayer/gameSignals";
import { useGameRulesStore } from "@/lib/store/stores/gameRules";
import { useUserStore } from "@/lib/store/stores/user";
import debug from "@/lib/utils/debug";
import { dailyStreak } from "./dailyStreak";
import { chestTotal, chestsOwed, ledgerOf, type StreakChest } from "./streakChests";

/**
 * Pays streak chests. Every time a quest pays (a claim, a Game Master's approval, a battle win) the hero's APPROVED run
 * is read from the quest log and any chest it reached and has not opened yet is paid: XP and GP straight into the
 * pocket (no class bonus, it is not loot), the ledger on the profile notes it, and a toast says so.
 * Nothing happens while the Game Master has streaks switched off (Settings > Chores).
 */

/** Heroes whose chests are being worked out, so two quick payments never open the same chest twice */
const settling = new Set<string>();

/** Pays whatever chests the hero's run owes now; returns the chests paid (none when streaks are off) */
export const settleStreakChests = async (heroId: string, now: Date = new Date()): Promise<StreakChest[]> => {
  if (settling.has(heroId)) return [];
  settling.add(heroId);
  try {
    const rulesStore = useGameRulesStore();
    await rulesStore.load();
    if (!rulesStore.streaks) return [];
    const userStore = useUserStore();
    const hero = userStore.users[heroId];
    if (!hero) return [];

    const run = dailyStreak(await getQuestLogDb().getEntriesForUser(heroId), heroId, now, ["approved"]);
    const { owed, ledger } = chestsOwed(run, ledgerOf(hero.streakChests));
    if (!owed.length || !ledger) return [];

    const total = chestTotal(owed);
    userStore.setStreakChests(heroId, ledger);
    if (total.xp > 0) userStore.updateUserXP({ userId: heroId, amount: total.xp, commit: true });
    if (total.gp > 0) void userStore.updateUserGP({ userId: heroId, wallet: total.gp });
    return owed;
  } finally {
    settling.delete(heroId);
  }
};

/** What the toast says: "Sam hit a 7-day streak! Chest: +40 XP, +25 GP" */
export const chestMessage = (nickname: string, chests: readonly StreakChest[]): string => {
  const total = chestTotal(chests);
  const longest = Math.max(...chests.map((chest) => chest.day));
  return `${nickname} hit a ${longest}-day streak! Chest: +${total.xp} XP, +${total.gp} GP`;
};

const announce = async (heroId: string, chests: StreakChest[]): Promise<void> => {
  const hero = useUserStore().users[heroId];
  const nickname = hero?.name?.nick || hero?.name?.first || "Hero";
  play$fx("openChest");
  const toast = await toastController.create(rpgToastOptions(chestMessage(nickname, chests), 4000));
  await toast.present();
};

/** Starts paying chests on every paid quest. Call once at start-up; returns how to stop. */
export const listenForStreakChests = (): (() => void) =>
  onQuestPaid(({ heroId }) => {
    settleStreakChests(heroId)
      .then((chests) => (chests.length ? announce(heroId, chests) : undefined))
      .catch((error) => debug.warn("streaks: could not settle streak chests", error));
  });

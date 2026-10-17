import { computed, ref } from "vue";
import { getQuestLogDb } from "@/lib/databases/QuestLogDb";
import type { QuestLogEntry } from "@/lib/databases/QuestLogDb";
import { canReviewClaim } from "@/lib/services/quests/approvalRouting";
import type { Roster } from "@/lib/services/quests/approvalRouting";
import { useUserStore } from "@/lib/store/stores/user";

/**
 * The claims waiting on the signed-in Game Master, as the avatar badge and the "the village awaits your word" prompt
 * read them. The list is kept in memory and refreshed whenever a claim is made or settled (approvalFlow.ts), when
 * the portal opens and on a slow timer. It holds only the claims this Game Master may settle: their own chore, when
 * another Game Master could settle it, is not theirs to approve.
 */

/** The claims this reviewer may settle, oldest first (the one waiting longest is shown first) */
export const claimsFor = (reviewerId: string | null | undefined, pending: readonly QuestLogEntry[], users: Roster): QuestLogEntry[] =>
  pending
    .filter((entry) => entry.status === "pending" && canReviewClaim(reviewerId, entry.userId, users))
    .sort((a, b) => a.completedAt.localeCompare(b.completedAt));

const waiting = ref<QuestLogEntry[]>([]);

/** Whoever is signed in has no claims waiting unless they are a Game Master */
export const waitingClaims = computed(() => waiting.value);
export const waitingClaimCount = computed(() => waiting.value.length);

/** Read the quest log again and keep what the signed-in Game Master may settle */
export const refreshWaitingClaims = async (): Promise<number> => {
  const store = useUserStore();
  const me = String(store.currentUser.id ?? "");
  const isGameMaster = store.users[me]?.isAdult === true;
  if (!isGameMaster) {
    waiting.value = [];
    return 0;
  }
  const pending = await getQuestLogDb().getPending();
  waiting.value = claimsFor(me, pending, store.users);
  return waiting.value.length;
};

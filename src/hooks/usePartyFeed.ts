import { computed, ref } from "vue";
import { useTimers } from "@/hooks/useTimers";
import { myParties, partyProblem, readFeed, type PartyProblem } from "@/lib/services/party/partyClient";
import { usePartyStore } from "@/lib/store/stores/party";
import { useProStore } from "@/lib/store/stores/pro";
import { useTownHallStore } from "@/lib/store/stores/townHall";

/** How often the open My Party screen asks the site who the family's parties are */
const POLL_MS = 60_000;

/**
 * Keeps the parties with other families fresh. Nothing is asked of the site unless the family holds XP Pro and an
 * account is linked: otherwise the store forgets what it knew and `problem` says why. A failed ask keeps the last
 * answer on screen and says what went wrong; two asks never overlap.
 */
export const usePartyFeed = () => {
  const store = usePartyStore();
  const townHall = useTownHallStore();
  const pro = useProStore();
  const timers = useTimers();
  const problem = ref<PartyProblem | null>(null);
  const isBusy = ref(false);

  /** Why the site cannot be asked now, or null when it can */
  const blocker = computed<PartyProblem | null>(() => {
    const isPro = pro.isPro;
    const isLinked = townHall.isLinked;
    const missing: PartyProblem = isPro ? "unlinked" : "pro-required";
    return isPro && isLinked ? null : missing;
  });

  /** Asks the site for the family's parties and open requests */
  async function refresh(): Promise<void> {
    const blocked = blocker.value;
    if (blocked) {
      store.clearServer();
      problem.value = blocked;
      return;
    }

    const isWorking = isBusy.value;
    if (isWorking) return;
    isBusy.value = true;
    try {
      store.applyServer(await myParties(townHall.auth));
      problem.value = null;
    } catch (error) {
      problem.value = partyProblem(error);
    } finally {
      isBusy.value = false;
    }
  }

  /** Reads one party's feed after the newest event held, and keeps both the events and the fresher party */
  async function refreshParty(partyId: string): Promise<void> {
    const blocked = blocker.value;
    if (blocked) {
      problem.value = blocked;
      return;
    }

    try {
      const answer = await readFeed(townHall.auth, partyId, store.lastSeq(partyId));
      store.appendEvents(partyId, answer.events);
      store.replaceOutside(answer.party);
      problem.value = null;
    } catch (error) {
      problem.value = partyProblem(error);
    }
  }

  /** Refreshes now and on every beat; returns how to stop (the beat also stops with the component that started it) */
  function start(intervalMs: number = POLL_MS): () => void {
    void refresh();
    const beat = timers.startInterval(intervalMs, () => {
      void refresh();
    });
    return () => timers.cancel(beat);
  }

  return { problem, isBusy, refresh, refreshParty, start };
};

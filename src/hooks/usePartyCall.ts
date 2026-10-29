import { usePartyFeed } from "@/hooks/usePartyFeed";
import { partyProblem, type PartyProblem } from "@/lib/services/party/partyClient";
import type { TownHallAuth } from "@/lib/services/townhall/townHallClient";
import { useTownHallStore } from "@/lib/store/stores/townHall";

export type ActionResult<T> = { ok: true; value: T } | { ok: false; problem: PartyProblem };

export const failure = (problem: PartyProblem): { ok: false; problem: PartyProblem } => ({ ok: false, problem });

/**
 * The one way a Game Master's party action reaches the site: nothing is sent unless the family holds XP Pro and an
 * account is linked; the site's refusal becomes a problem the screen can word; and a yes refreshes what the screens show.
 */
export const usePartyCall = () => {
  const townHall = useTownHallStore();
  const feed = usePartyFeed();

  async function runCall<T>(call: (auth: TownHallAuth) => Promise<T>): Promise<ActionResult<T>> {
    const blocked = feed.blocker.value;
    if (blocked) return failure(blocked);
    try {
      const value = await call(townHall.auth);
      await feed.refresh();
      return { ok: true, value };
    } catch (error) {
      return failure(partyProblem(error));
    }
  }

  return { runCall };
};

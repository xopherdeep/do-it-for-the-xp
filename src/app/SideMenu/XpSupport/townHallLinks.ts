import type { Router } from "vue-router";
import { useUserStore } from "@/lib/store/stores/user";
import type { TownHallBoardSlug } from "@/lib/services/townhall/townHallSite";

/**
 * The Help Desk's way to the community: the Town Hall's Board tab, on one board. Feature requests and messages
 * for the developers are posts there; the Town Hall belongs to a hero, so it opens as the signed-in profile.
 */
export function openTownHallBoard(router: Router, board: TownHallBoardSlug): void {
  const userId = useUserStore().currentUser.id;
  if (!userId) {
    router.push("/xp-profile");
    return;
  }
  router.push({ name: "town-hall", params: { userId }, query: { tab: "board", board } });
}

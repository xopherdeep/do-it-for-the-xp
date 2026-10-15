import { useRevealPrompt } from "@/components/organisms/RevealPrompt/useRevealPrompt";
import {
  linkResultNotice,
  linkedStatusPrompt,
  registrationPrompt,
  unlinkResultNotice,
  type RegistrationMenuId,
} from "@/lib/services/hometown/hometownPrompts";
import debug from "@/lib/utils/debug";
import type { LinkResult, useTownHallStore } from "@/lib/store/stores/townHall";
import { SIGNUP_URL, type TownHallBoardSlug } from "@/lib/services/townhall/townHallSite";
import { useTownHallPosting } from "./useTownHallPosting";
import { useTownHallLink } from "./useTownHallLink";
import { registrationOffer } from "./registrationOffer";

export interface TownHallClerkOptions {
  store: ReturnType<typeof useTownHallStore>;
  userId(): string;
  /** What the hero signs with on the public site (`signingName`) */
  heroName(): string;
  isGameMaster(): boolean;
  /** Where the hero is now, for a bug report */
  route(): string;
  currentBoard(): TownHallBoardSlug;
  /** App.ts reads the profiles without waiting, so a cold start at the Town Hall may not know its Game Master yet */
  profilesReady(): Promise<void>;
}

/**
 * The Town Hall's clerk: her dialog, her counter (posting) and the family's registration with the site, which lean on each
 * other: a post with no registration asks for one, and a new registration sends the posts kept waiting.
 */
export function useTownHallClerk(options: TownHallClerkOptions) {
  const { store } = options;
  const reveal = useRevealPrompt();

  const posting = useTownHallPosting({
    store,
    reveal,
    userId: options.userId,
    heroName: options.heroName,
    isGameMaster: options.isGameMaster,
    route: options.route,
    currentBoard: options.currentBoard,
    registerFamily: () => registerFamily(),
    redoRegistration: async () => {
      await store.unlink();
      await registerFamily();
    },
  });

  // Posts queued and no registration here: the clerk offers it to a Game Master, once per visit
  const offerRegistration = registrationOffer({
    store,
    reveal,
    isGameMaster: options.isGameMaster,
    registerFamily: () => registerFamily(),
    profilesReady: options.profilesReady,
  });

  /** The clerk says how the registration went; posts kept before the family was registered go out while she talks */
  const announceLink = async (result: LinkResult) => {
    const isUnchanged = result === "none";
    if (isUnchanged) return;
    const isLinked = result === "linked";
    if (isLinked) void posting.sendQueue();
    await reveal.showPrompt(linkResultNotice(result, store.activeLink?.displayName));
  };

  const link = useTownHallLink({
    store,
    heroId: options.userId,
    returnRoute: () => `/town-hall/${encodeURIComponent(options.userId())}`,
    isGameMaster: options.isGameMaster,
    announce: announceLink,
  });

  /** A registered family sees whom it is registered as and may unlink this device; an unregistered one is asked to register */
  const registerFamily = async () => {
    await link.loadLink();
    const active = store.activeLink;
    if (active) {
      const pick = await reveal.showPrompt(linkedStatusPrompt(active.displayName));
      const isKeepingLink = pick !== "unlink";
      if (isKeepingLink) return;
      try {
        await reveal.showPrompt(unlinkResultNotice(await link.removeLink()));
      } catch (err) {
        debug.error("Town Hall could not unlink this device:", err);
      }
      return;
    }
    const pick = (await reveal.showPrompt(registrationPrompt(store.signedInThroughWebsite))) as RegistrationMenuId;
    const isCreatingAccount = pick === "create";
    if (isCreatingAccount) window.open(SIGNUP_URL, "_blank", "noopener");
    const hasAccount = pick === "have";
    if (hasAccount) await link.openAuthorizePage();
  };

  /**
   * Coming back from WordPress's authorize page, the clerk says how it went (the link composable checks the return). An
   * ordinary visit by a Game Master whose posts wait for a registration this device lacks is offered Family Registration instead.
   */
  const completeVisit = async () => {
    const handled = await link.completeReturn();
    void posting.sendQueue();
    if (!handled) await offerRegistration();
  };

  return { reveal, posting, completeVisit };
}

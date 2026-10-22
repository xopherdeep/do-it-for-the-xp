import {
  linkResultNotice,
  linkedStatusPrompt,
  registrationPrompt,
  unlinkResultNotice,
  type RegistrationMenuId,
} from "@/lib/services/hometown/hometownPrompts";
import debug from "@/lib/utils/debug";
import type { RevealPromptOptions } from "@/components/organisms/RevealPrompt/revealPrompt";
import type { Ref } from "vue";
import type { LinkResult, useTownHallStore } from "@/lib/store/stores/townHall";
import type { EditableType, NewsCategory } from "@/lib/services/townhall/townHallDesk";
import { SIGNUP_URL, type TownHallBoardSlug } from "@/lib/services/townhall/townHallSite";
import { useTownHallDesk } from "./useTownHallDesk";
import { useTownHallPosting } from "./useTownHallPosting";
import { useTownHallLink } from "./useTownHallLink";
import { registrationOffer } from "./registrationOffer";

export interface TownHallClerkOptions {
  store: ReturnType<typeof useTownHallStore>;
  /** The page owns the dialog: its template binds the prompt the clerk is showing */
  reveal: { showPrompt(options: RevealPromptOptions): Promise<string>; prompt: Ref<unknown> };
  userId(): string;
  /** What the hero signs with on the public site: a nickname of their own, never their real name */
  heroName(): string;
  isGameMaster(): boolean;
  route(): string;
  currentBoard(): TownHallBoardSlug;
  /** Resolves once the device's profiles are read: App.ts reads them without waiting, so a cold start may not know its Game Master yet */
  profilesReady(): Promise<void>;
  /** Fetch a tab's list again (the desk changed what it shows) */
  reloadTab(id: "news" | "board" | "updates"): Promise<void>;
}

/**
 * The Town Clerk's whole counter: posting, the administrator's desk, family registration and the link to WordPress. They
 * live together because each calls back into the others (a post waiting for a registration, a registration that sends
 * the queue, a desk change that reloads a tab), and one composable lets those closures see each other instead of the
 * page threading them back and forth.
 */
export function useTownHallClerk(options: TownHallClerkOptions) {
  const { store, reveal } = options;

  // Function declarations are hoisted, so the closures below may name them before they are defined
  async function announceLink(result: LinkResult): Promise<void> {
    const isUnchanged = result === "none";
    if (isUnchanged) return;
    const isLinked = result === "linked";
    // Posts kept before the family was registered go out while the clerk talks
    if (isLinked) void posting.sendQueue();
    await reveal.showPrompt(linkResultNotice(result, store.activeLink?.displayName));
  }

  const link = useTownHallLink({
    store,
    heroId: options.userId,
    returnRoute: () => `/town-hall/${encodeURIComponent(options.userId())}`,
    isGameMaster: options.isGameMaster,
    announce: announceLink,
  });

  /** A registered family sees whom it is registered as and may unlink this device; an unregistered one is asked to register */
  async function registerFamily(): Promise<void> {
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
  }

  const desk = useTownHallDesk({ store, reveal });

  /** The tabs that show what the desk changed: a post is news and a patch note, a topic is the board */
  const reloadFor = (what: NewsCategory | EditableType): void => {
    const touchesNews = what === "news" || what === "post";
    if (touchesNews) void options.reloadTab("news");
    const touchesUpdates = what === "patch-notes" || what === "post";
    if (touchesUpdates) void options.reloadTab("updates");
    const touchesBoard = what === "topic";
    if (touchesBoard) void options.reloadTab("board");
  };

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
      await link.removeLink();
      await registerFamily();
    },
    desk: {
      createNews: desk.createNews,
      saveEdit: desk.saveEdit,
      readWords: desk.readWords,
      changed: reloadFor,
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

  /**
   * Coming back from WordPress's authorize page, the clerk says how it went (the composable checks the return). An ordinary
   * visit by a Game Master whose posts wait for a registration this device lacks is offered Family Registration instead.
   * What the link may do on the site is read again, and the desk with it, before the queue goes out.
   */
  async function completeLinkReturn(): Promise<void> {
    const handled = await link.completeReturn();
    await store.refreshPowers();
    await desk.refresh();
    void posting.sendQueue();
    if (!handled) await offerRegistration();
  }

  return { posting, desk, registerFamily, completeLinkReturn };
}

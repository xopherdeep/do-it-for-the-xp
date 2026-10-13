import type { Ref } from "vue";
import type { RevealPromptOptions } from "@/components/organisms/RevealPrompt/revealPrompt";
import { unregisteredOutboxPrompt } from "@/lib/services/hometown/hometownPrompts";
import { sendable } from "@/lib/services/townhall/townHallOutbox";
import type { TownHallPost } from "@/lib/services/townhall/townHallTypes";

/** What the clerk's offer needs: the outbox, the clerk's dialog, who is on screen and the registration errand. */
export interface RegistrationOfferDeps {
  store: { isLinked: boolean; posts: TownHallPost[] };
  /** The clerk's dialog: `ask` shows a prompt and answers with the choice picked; `prompt` is the one showing, if any */
  reveal: { ask(options: RevealPromptOptions): Promise<string>; prompt: Ref<unknown> };
  isGameMaster(): boolean;
  /** The clerk's registration errand */
  registerFamily(): Promise<void>;
  /** Resolves once the device's profiles are read (a cold start may not have them yet); `isGameMaster` needs them */
  profilesReady?(): Promise<void>;
}

/**
 * The clerk's offer for one visit to the Town Hall: a Game Master who opens it with posts queued and no registration on
 * this device is offered Family Registration, once, and never over a prompt that is already showing. A hero is not asked.
 */
export function registrationOffer(deps: RegistrationOfferDeps): () => Promise<void> {
  let offered = false;
  return async () => {
    await deps.profilesReady?.();
    const postsWait = !deps.store.isLinked && sendable(deps.store.posts).length > 0;
    const mayOffer = deps.isGameMaster() && postsWait && !offered && deps.reveal.prompt.value === null;
    if (!mayOffer) return;
    offered = true;
    const pick = await deps.reveal.ask(unregisteredOutboxPrompt());
    if (pick === "registration") await deps.registerFamily();
  };
}

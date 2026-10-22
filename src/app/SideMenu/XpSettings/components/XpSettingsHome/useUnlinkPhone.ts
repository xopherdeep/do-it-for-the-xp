import { ref } from "vue";
import type { Router } from "vue-router";
import { useRevealPrompt } from "@/components/organisms/RevealPrompt/useRevealPrompt";
import { useVoice } from "@/hooks/useVoice";
import { removePhonePrompt } from "@/lib/services/multiplayer/familyPrompts";
import { useFamilyStore } from "@/lib/store/stores/family";
import { useSyncStore } from "@/lib/store/stores/sync";
import debug from "@/lib/utils/debug";

/**
 * Settings, "Unlink this phone", on a kid phone (family sync spec, section 7). The Town Clerk asks which phone; on Yes the
 * hero rests (what waits goes up first), the phone forgets the family (the link, its queue and its turns), the hero
 * signs out (nobody is left signed in on the picker, and a relink does not ask for their turn) and the profile picker
 * opens. No is the same as never having asked. `isUnlinking` is true from the tap until it is over, so the row can show
 * itself busy and a second tap waits; a step that fails leaves the phone as it was. The screen renders
 * `<xp-reveal-prompt :prompt="prompt" @respond="respond" />` once.
 */
export function useUnlinkPhone(router: Pick<Router, "replace">, signOut: () => void) {
  const family = useFamilyStore();
  const sync = useSyncStore();
  const { voice } = useVoice();
  const { prompt, showPrompt, submitAnswer } = useRevealPrompt();

  const isUnlinking = ref(false);

  const unlinkThisPhone = async (): Promise<void> => {
    const device = family.device;
    const hasNothingToUnlink = !device || isUnlinking.value;
    if (hasNothingToUnlink) return;
    isUnlinking.value = true;
    try {
      const answer = await showPrompt(removePhonePrompt(device.label, voice.value));
      const saidYes = answer === "yes";
      if (!saidYes) return;
      await sync.rest(device.heroId);
      await family.forgetDevice();
      signOut();
      await router.replace("/xp-profile");
    } catch (error) {
      debug.warn("settings: could not unlink this phone", error);
    } finally {
      isUnlinking.value = false;
    }
  };

  return { prompt, respond: submitAnswer, unlinkThisPhone, isUnlinking };
}

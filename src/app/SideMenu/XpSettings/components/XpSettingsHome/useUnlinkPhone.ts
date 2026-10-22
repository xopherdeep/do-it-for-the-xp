import type { Router } from "vue-router";
import { useRevealPrompt } from "@/components/organisms/RevealPrompt/useRevealPrompt";
import { useVoice } from "@/hooks/useVoice";
import { removePhonePrompt } from "@/lib/services/multiplayer/familyPrompts";
import { useFamilyStore } from "@/lib/store/stores/family";
import { useSyncStore } from "@/lib/store/stores/sync";

/**
 * Settings, "Unlink this phone", on a kid phone (family sync spec, section 7). The Town Clerk asks which phone; on Yes the
 * hero rests (what waits goes up first), the phone forgets the family (the link, its queue and its turns) and the
 * profile picker opens. No is the same as never having asked. The screen renders
 * `<xp-reveal-prompt :prompt="prompt" @respond="respond" />` once.
 */
export function useUnlinkPhone(router: Pick<Router, "replace">) {
  const family = useFamilyStore();
  const sync = useSyncStore();
  const { voice } = useVoice();
  const { prompt, showPrompt, submitAnswer } = useRevealPrompt();

  const unlinkThisPhone = async (): Promise<void> => {
    const device = family.device;
    if (!device) return;
    const answer = await showPrompt(removePhonePrompt(device.label, voice.value));
    const saidYes = answer === "yes";
    if (!saidYes) return;
    await sync.rest(device.heroId);
    await family.forgetDevice();
    await router.replace("/xp-profile");
  };

  return { prompt, respond: submitAnswer, unlinkThisPhone };
}

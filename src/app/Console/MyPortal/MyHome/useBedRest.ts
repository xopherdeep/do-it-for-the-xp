import { useRevealPrompt } from "@/components/organisms/RevealPrompt/useRevealPrompt";
import { useVoice } from "@/hooks/useVoice";
import { bedRestConfirmPrompt } from "@/lib/services/hometown/bedRestPrompt";

/**
 * The bed's question, asked in the game's own dialog and in the hero's voice. The page renders `prompt` once
 * (`<xp-reveal-prompt :prompt="prompt" @respond="submitAnswer" />`) and awaits `confirmBedRest` before the hero lies down.
 */
export function useBedRest() {
  const { prompt, showPrompt, submitAnswer } = useRevealPrompt();
  const { voice: words } = useVoice();

  /** True when the hero says yes to a rest in the bed */
  const confirmBedRest = async (): Promise<boolean> => {
    const pick = await showPrompt(bedRestConfirmPrompt(words.value));
    return pick === "yes";
  };

  return { prompt, submitAnswer, confirmBedRest };
}

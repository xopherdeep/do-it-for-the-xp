import { getCurrentInstance, onBeforeUnmount, ref } from 'vue';
import {
  cancelAnswer,
  type ActiveRevealPrompt,
  type RevealAnswer,
  type RevealPromptOptions,
} from './revealPrompt';

/**
 * Ask the hero something in the game's own voice. A screen keeps one of these, renders
 * `<xp-reveal-prompt :prompt="prompt" @respond="submitAnswer" />` once, and reads like a script:
 *
 *   const pick = await showPrompt({ lines: ["A Storage Box holds 10 things. 100 GP?"], choices: [...] });
 *   const { id, amount } = await showAmountPrompt({ lines: [...], amount: { max: wallet }, choices: [...] });
 *
 * The promise settles with the choice picked, or with the cancel choice when the hero backs out (Escape, or the screen
 * leaving). A prompt asked while another is showing cancels it, so no promise is left hanging.
 */
export const useRevealPrompt = () => {
  const prompt = ref<ActiveRevealPrompt | null>(null);
  let settle: ((answer: RevealAnswer) => void) | null = null;
  let counter = 0;

  /** The hero answered: the prompt goes, and whoever asked hears. */
  const submitAnswer = (answer: RevealAnswer) => {
    const done = settle;
    settle = null;
    prompt.value = null;
    done?.(answer);
  };

  /** Back out of whatever is showing (the cancel choice). */
  const dismiss = () => {
    const showing = prompt.value;
    if (showing) submitAnswer(cancelAnswer(showing.options));
  };

  /** Show a prompt; resolves with the choice and, for a number pick, the amount. */
  const showAmountPrompt = (options: RevealPromptOptions): Promise<RevealAnswer> =>
    new Promise<RevealAnswer>((resolve) => {
      dismiss();
      counter += 1;
      settle = resolve;
      prompt.value = { key: counter, options };
    });

  /** Show a prompt; resolves with the id of the choice picked. */
  const showPrompt = async (options: RevealPromptOptions): Promise<string> => (await showAmountPrompt(options)).id;

  // A screen that goes away mid-question must not leave the question hanging
  const isInsideComponent = Boolean(getCurrentInstance());
  if (isInsideComponent) onBeforeUnmount(dismiss);

  return { prompt, showPrompt, showAmountPrompt, submitAnswer, dismiss };
};

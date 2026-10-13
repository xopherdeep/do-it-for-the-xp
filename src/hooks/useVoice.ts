import { computed, getCurrentInstance, onBeforeUnmount } from "vue";
import { getActivePinia } from "pinia";
import { speak, stop } from "@/lib/engine/audio/speech";
import { useUserStore } from "@/lib/store/stores/user";
import { copyFor } from "@/lib/services/copy/copy";
import type { CopyKey } from "@/lib/services/copy/catalog";
import { autoReadsFor, voiceFor } from "@/lib/services/copy/voices";
import type { CopyVars } from "@/lib/services/copy/voices";

/** A catalogue key, still completing in the editor, but any string is accepted (a computed key, a key from data) */
export type CopyKeyArg = CopyKey | (string & Record<never, never>);

/** `t("questWizard.title", { name })`: a catalogue line in the hero's voice, placeholders filled */
export type CopyLookup = (key: CopyKeyArg, vars?: CopyVars) => string;

/**
 * The voice the current hero's screens read in (services/copy/voices.ts): their "Text style" pick, else their birthday.
 * Follows the hero as they switch profiles or change the pick. Nobody signed in (or a screen mounted with no store, as
 * in a component spec) reads the adventure voice.
 */
export function useVoice() {
  const userStore = getActivePinia() ? useUserStore() : null;
  const profile = computed(() => {
    const id = userStore?.currentUser.id;
    const signedIn = id && userStore ? userStore.users[id] : undefined;
    return signedIn ?? userStore?.currentUser ?? null;
  });
  const voice = computed(() => voiceFor(profile.value));
  const isSimple = computed(() => voice.value === "simple");
  /** Whether lines are read aloud on their own: the simple voice, until the hero turns it off on their profile */
  const autoReadOn = computed(() => autoReadsFor(voice.value, profile.value?.autoRead));
  return { voice, isSimple, autoReadOn };
}

/**
 * The hero's words: `const t = useCopy()`, then `t(key, vars)` is the catalogue line in their voice (the adventure
 * wording when their voice has none yet, the key itself when the catalogue lacks it). Re-reads when the voice changes,
 * so use it inside a template or computed.
 */
export function useCopy(): CopyLookup {
  const { voice } = useVoice();
  return (key, vars) => copyFor(key, voice.value, vars);
}

/**
 * Read-aloud for a screen: `playLine(text)` is the speaker button (every voice); `startAutoReading(text)` reads only
 * when the hero's voice does so on its own (simple, unless they turned it off) and says whether it did;
 * `stopReading()` is for dismissing. Both stay quiet while the app is muted or where the device cannot speak. A screen
 * that started a reading cuts it off when it unmounts.
 */
export function useReadAloud() {
  const { autoReadOn } = useVoice();
  let startedReading = false;

  const playLine = (text: string): boolean => {
    const started = speak(text);
    startedReading = startedReading || started;
    return started;
  };

  const startAutoReading = (text: string): boolean => (autoReadOn.value ? playLine(text) : false);

  const stopReading = (): void => stop();

  const isInComponent = getCurrentInstance() !== null;
  if (isInComponent) {
    onBeforeUnmount(() => {
      if (startedReading) stop();
    });
  }

  return { playLine, startAutoReading, stopReading };
}

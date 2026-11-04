/**
 * The setup wizard's logic: the draft, the step it is on, the heroes and chores the parent edits, and Begin. A composable
 * (the screen is a `<script setup>` component), so the screen stays a template and these rules can be read on their own.
 */
import { computed, onMounted, ref, watch } from "vue";
import { modalController, toastController } from "@ionic/vue";
import { play$fx } from "@/assets/fx";
import { rpgToastOptions } from "@/hooks/useToast";
import { suggestBeasts } from "@/lib/services/bestiary/librarySuggest";
import type { LibraryEntry } from "@/lib/services/bestiary/librarySuggest";
import { BEAST_LIBRARY } from "@/lib/services/core/beastLibrary";
import type { LibraryBeast } from "@/lib/services/core/beastLibrary";
import { QUICK_START_MAX_HEROES, QUICK_START_NAME_LENGTH } from "@/lib/services/core/packs/quickStart";
import { existingHeroes, runSetup } from "@/lib/services/setup/runSetup";
import { bandOf } from "@/lib/services/setup/setupPlan";
import type { SetupHero } from "@/lib/services/setup/setupPlan";
import { emptyDraft, preTick } from "@/lib/services/setup/setupSteps";
import type { SetupDraft } from "@/lib/services/setup/setupSteps";
import debug from "@/lib/utils/debug";

export const MIN_AGE = 3;
export const MAX_AGE = 17;
/** A new age stepper starts here, near the middle of the kids' chores */
const START_AGE = 8;
/** How many beasts the type-ahead offers at once */
const SUGGEST_LIMIT = 6;
const PARENT_ID = "parent";

const beastById = (id: string) => BEAST_LIBRARY.find((beast) => String(beast.id) === id);

export const useSetupWizard = () => {
  const draft = ref<SetupDraft>(emptyDraft([]));
  const index = ref(0);
  const isBusy = ref(false);
  const error = ref("");
  /** The type-ahead text per hero id */
  const searches = ref<Record<string, string>>({});
  let nextKidId = 1;

  const hasParent = computed(() => draft.value.heroes.some((hero) => hero.isParent));
  const hasNewParent = computed(() => draft.value.heroes.some((hero) => hero.isParent && !hero.existing));
  const canAddHero = computed(() => draft.value.heroes.length < QUICK_START_MAX_HEROES);

  onMounted(async () => {
    play$fx("openMenu");
    const existing = await existingHeroes();
    const next = emptyDraft(existing);
    // No profile on this device: the first hero is the parent, who becomes the Game Master
    if (!existing.length) {
      next.heroes.push({ id: PARENT_ID, name: "", age: null, existing: false, isParent: true });
      next.gameMaster = { name: "", passcode: "" };
    }
    draft.value = next;
  });

  // The parent's one name field feeds both the hero row and the Game Master profile
  watch(
    () => draft.value.gameMaster?.name,
    (name) => {
      const parent = draft.value.heroes.find((hero) => hero.isParent && !hero.existing);
      if (parent) parent.name = name ?? "";
    }
  );

  // Entering the review step ticks the suggested chores for any hero who has none yet; edits are kept
  watch(index, (place) => {
    if (draft.value.heroes.length && place >= 2) draft.value = preTick(draft.value);
  });
  // A change of rooms or ages before the review starts it afresh; after it, a hero's list is theirs
  watch(
    () => [draft.value.rooms.join(), draft.value.heroes.map((hero) => `${hero.id}:${hero.age}`).join()],
    () => {
      if (index.value < 2) draft.value.chores = {};
    }
  );

  const addHero = () => {
    if (!canAddHero.value) return;
    play$fx("cursor");
    draft.value.heroes.push({ id: `kid-${nextKidId++}`, name: "", age: START_AGE, existing: false, isParent: false });
  };

  const removeHero = (hero: SetupHero) => {
    play$fx("cursor");
    draft.value.heroes = draft.value.heroes.filter((entry) => entry.id !== hero.id);
  };

  const stepAge = (hero: SetupHero, by: number) => {
    play$fx("cursor");
    const from = hero.age ?? START_AGE;
    hero.age = Math.min(MAX_AGE, Math.max(MIN_AGE, from + by));
  };

  const toggleRoom = (room: string) => {
    play$fx("cursor");
    const rooms = draft.value.rooms;
    draft.value.rooms = rooms.includes(room) ? rooms.filter((entry) => entry !== room) : [...rooms, room];
  };

  const tickedFor = (hero: SetupHero): LibraryBeast[] =>
    (draft.value.chores[hero.id] ?? []).map(beastById).filter((beast): beast is LibraryBeast => Boolean(beast));

  const toggleChore = (hero: SetupHero, beastId: string) => {
    play$fx("cursor");
    const ticked = draft.value.chores[hero.id] ?? [];
    draft.value.chores = {
      ...draft.value.chores,
      [hero.id]: ticked.includes(beastId) ? ticked.filter((id) => id !== beastId) : [...ticked, beastId],
    };
  };

  /** The beasts the hero has not ticked that fit what they typed */
  const suggestionsFor = (hero: SetupHero): LibraryEntry[] => {
    const text = (searches.value[hero.id] ?? "").trim();
    if (!text) return [];
    return suggestBeasts(text, SUGGEST_LIMIT, { classic: false, exclude: draft.value.chores[hero.id] ?? [] });
  };

  const addSuggested = (hero: SetupHero, beast: LibraryEntry) => {
    toggleChore(hero, String(beast.id));
    searches.value = { ...searches.value, [hero.id]: "" };
  };

  /** The summary's line for a step: tapping it goes back there */
  const goTo = (step: number) => {
    play$fx("cursor");
    index.value = step;
  };

  const close = async () => {
    play$fx("no");
    await modalController.dismiss({ done: false }, "cancel");
  };

  /** Begin: one merge restore; a failure shows its words in the summary and leaves Begin ready for another try */
  const begin = async () => {
    if (isBusy.value) return;
    isBusy.value = true;
    error.value = "";
    try {
      await runSetup(draft.value);
      play$fx("select");
      const toast = await toastController.create(rpgToastOptions("Your world is ready!"));
      await toast.present();
      await modalController.dismiss({ done: true, heroCount: draft.value.heroes.length }, "done");
    } catch (failure) {
      debug.error("Setup could not finish", failure);
      play$fx("no");
      error.value = failure instanceof Error && failure.message ? failure.message : "Setup could not finish. Try again.";
    } finally {
      isBusy.value = false;
    }
  };

  return {
    draft, index, isBusy, error, searches, hasParent, hasNewParent, canAddHero,
    addHero, removeHero, stepAge, toggleRoom, tickedFor, toggleChore, suggestionsFor, addSuggested, goTo, close, begin,
    nameLength: QUICK_START_NAME_LENGTH, bandOf,
  };
};

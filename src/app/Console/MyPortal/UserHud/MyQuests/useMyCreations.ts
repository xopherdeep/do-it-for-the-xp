/**
 * The Beast Maker's opening list (kid-creations design, section 5), wired for the modal. `useMyCreations` holds which
 * screen is up (the list of what the hero already made, or the Maker's own steps) and moves between them; the modal
 * keeps the draft and the step it is on, and this hands them the right ones when the kid starts a new beast or fixes
 * one that came back. `useCreationRows` answers a tap on a row. Every rule is myCreations.ts; these call it, play the
 * sounds and say when something did not work.
 */
import { reactive, ref } from "vue";
import type { Ref } from "vue";
import { play$fx } from "@/assets/fx";
import { draftFromBeast, newBeastDraft } from "@/app/Admin/XpCompendium/views/XpBestiary/beastWizard";
import type { BeastDraft } from "@/app/Admin/XpCompendium/views/XpBestiary/beastWizard";
import { useToast } from "@/hooks/useToast";
import { useCopy } from "@/hooks/useVoice";
import type { Achievement } from "@/lib/databases/AchievementDb";
import type { Beast } from "@/lib/databases/BestiaryDb";
import { deleteCreation, loadMyCreations, resendCreation } from "@/lib/services/creations/myCreations";
import type { MyCreationRow } from "@/lib/services/creations/myCreations";
import debug from "@/lib/utils/debug";

/** "checking" while the stores are read (nothing is drawn yet), then the list when the hero has made things, else the steps */
export type MakerScreen = "checking" | "list" | "steps";

/** What the Maker's screen reads */
export interface MakerListState {
  view: MakerScreen;
  rows: MyCreationRow[];
  /** The hero has as many creations waiting or sent back as they may have */
  isAtCap: boolean;
  /** The beast that came back and is being fixed: its Send is a resend, not a new beast */
  fixing: Beast | null;
  /** The quest whose Beast Card is open over the list (an In the game beast) */
  cardQuest: Achievement | null;
}

const NOTE_MS = 4500;

type ShowToast = ReturnType<typeof useToast>["showToast"];

const sayIn = (showToast: ShowToast, line: string, ms = 2600) => {
  showToast(line, ms).catch((error) => debug.warn("[MyCreations] the toast could not be shown", error));
};

export function useMyCreations(heroId: () => string, draft: Ref<BeastDraft>, position: Ref<number>) {
  const { showToast } = useToast();

  const view = ref<MakerScreen>("checking");
  const rows = ref<MyCreationRow[]>([]);
  const isAtCap = ref(false);
  const fixing = ref<Beast | null>(null);
  const cardQuest = ref<Achievement | null>(null);
  const state: MakerListState = reactive({ view, rows, isAtCap, fixing, cardQuest });

  /**
   * Read the stores again and show the list, or the steps when the hero has made nothing (or the stores cannot be read).
   * Nothing is being fixed after this: the list is where a fix starts, and a fix that finds its beast settled lands here.
   */
  const refresh = async () => {
    fixing.value = null;
    try {
      const mine = await loadMyCreations(heroId());
      rows.value = mine.rows;
      isAtCap.value = mine.isFull;
    } catch (error) {
      debug.warn("[MyCreations] the creations could not be read", error);
      rows.value = [];
    }
    view.value = rows.value.length > 0 ? "list" : "steps";
  };

  /** The Maker opened: no card is up yet, and the list is read */
  const open = (): Promise<void> => {
    cardQuest.value = null;
    view.value = "checking";
    return refresh();
  };

  /** Draw a new beast: the steps on a fresh draft */
  const startNew = () => {
    play$fx("select");
    fixing.value = null;
    draft.value = newBeastDraft();
    position.value = 0;
    view.value = "steps";
  };

  /** Fix it: the steps on the beast that came back, with the Game Master's note said first */
  const startFix = (beast: Beast) => {
    play$fx("select");
    fixing.value = beast;
    draft.value = draftFromBeast(beast);
    position.value = 0;
    view.value = "steps";
    if (beast.proposal?.note) sayIn(showToast, beast.proposal.note, NOTE_MS);
  };

  return { state, open, refresh, startNew, startFix };
}

/** What a tap on a row of the list asks for: Send again, Delete, and opening the Beast Card of one in the game */
export function useCreationRows(state: MakerListState, refresh: () => Promise<void>) {
  const t = useCopy();
  const { showToast } = useToast();

  /** Run an action on a row, then read the list again (it shows what the stores now say, whatever the action did) */
  const act = async (task: () => Promise<{ ok: boolean }>, thanks = "") => {
    try {
      const { ok } = await task();
      play$fx(ok ? "select" : "no");
      const hasThanks = ok && thanks !== "";
      if (hasThanks) sayIn(showToast, thanks);
    } catch (error) {
      debug.warn("[MyCreations] the change could not be saved", error);
      play$fx("no");
      sayIn(showToast, t("beastMaker.error.list"));
    }
    await refresh();
  };

  const sendAgain = (row: MyCreationRow) => act(() => resendCreation(row, new Date()), t("beastMaker.done.title"));

  const removeRow = (row: MyCreationRow) => act(() => deleteCreation(row));

  /** A tap on a row that is in the game opens its Beast Card; a row with no card is plain */
  const openRow = (row: MyCreationRow) => {
    state.cardQuest = row.card ?? null;
  };

  return { sendAgain, removeRow, openRow };
}

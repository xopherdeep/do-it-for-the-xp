import { computed, reactive, ref } from "vue";
import { alertController } from "@ionic/vue";
import { useRouter } from "vue-router";
import { play$fx } from "@/assets/fx";
import type { Achievement } from "@/lib/databases/AchievementDb";
import { creationAp } from "@/lib/services/creations/creations";
import type { CreationRow } from "@/lib/services/creations/creations";
import { approveRow, loadCreationRows, returnRow } from "@/lib/services/creations/creationReview";
import type { ApproveOutcome } from "@/lib/services/creations/creationReview";
import { creationHistoryRow } from "./approvalHistory";
import type { ReviewMessage } from "./useApprovalReviews";

/**
 * The Creations lane of the Approvals screen (kid creations design, section 7): the waiting rows and the reviewed
 * ones, the dialogs (the target chooser, Approve, Send back) and the Edit route. The verdicts themselves are
 * creationReview's; the page only mounts the rows and calls what is returned here (through useApprovalReviews).
 */

/** A profile on the device, as the target chooser lists it */
export interface Profile {
  id: string | number;
}

export interface CreationDeps {
  heroName: (userId: string) => string;
  /** Whether the maker still has a profile: AP goes nowhere without one */
  isKnownHero: (userId: string) => boolean;
  /** Every profile on the device, for the target chooser */
  profiles: () => Profile[];
  /** The signed-in Game Master */
  reviewerId: () => string;
  /** The page's review runner: one review at a time per row, then the lists again and a toast */
  runReview: (entry: { id: string }, review: () => Promise<ReviewMessage>) => Promise<void>;
}

/** The radio value that gives a quest to every profile, as the maker's Everyone tile does */
const EVERYONE = "*";

export const useCreationApprovals = (deps: CreationDeps) => {
  const router = useRouter();
  const pending = ref<CreationRow[]>([]);
  const recent = ref<CreationRow[]>([]);

  /** What the page shows: the rows waiting for a look, and the reviewed ones as History lines */
  const lists = reactive({
    pending,
    history: computed(() => recent.value.map((row) => creationHistoryRow(row, deps.heroName))),
  });

  /**
   * Both lists from storage, kept only while the page still wants them (`isWanted`: a slow earlier read must not
   * write over a fresh one). Throws like the other loaders, so the page can say which list failed.
   */
  const loadCreations = async (isWanted: () => boolean = () => true): Promise<void> => {
    const [waiting, reviewed] = await Promise.all([loadCreationRows(["proposed"]), loadCreationRows(["approved", "returned"])]);
    if (!isWanted()) return;
    pending.value = waiting;
    recent.value = reviewed;
  };

  /** The quest a row approves: its own, or the one sent with the beast */
  const questOf = (row: CreationRow): Achievement | undefined => row.quest ?? row.pairedQuest;

  /** The AP the maker earns for the row: the beast's and, when a quest came with it, the quest's */
  const apOf = (row: CreationRow): number => creationAp(row.kind) + (row.pairedQuest ? creationAp("quest") : 0);

  /**
   * The target chooser: every profile as a radio, plus Everyone, with the kid's choice checked (the maker when the
   * hero they chose is gone). Answers the heroes chosen, or null when the Game Master backed out.
   */
  const chooseTarget = async (row: CreationRow, quest: Achievement): Promise<string[] | null> => {
    const ids = deps.profiles().map((hero) => String(hero.id));
    const asked = quest.assignee.map(String).filter((id) => ids.includes(id));
    const isEveryone = ids.length > 0 && ids.every((id) => asked.includes(id));
    const checked = isEveryone ? EVERYONE : asked[0] ?? row.by;
    const alert = await alertController.create({
      header: `Who is "${quest.achievementName}" for?`,
      inputs: [
        ...ids.map((id) => ({ type: "radio" as const, label: deps.heroName(id), value: id, checked: id === checked })),
        { type: "radio" as const, label: "Everyone", value: EVERYONE, checked: checked === EVERYONE },
      ],
      buttons: [
        { text: "Cancel", role: "cancel" },
        { text: "Next", role: "confirm" },
      ],
    });
    await alert.present();
    const { data, role } = await alert.onDidDismiss<{ values?: string }>();
    const isChosen = role === "confirm";
    if (!isChosen) return null;
    const chosen = String(data?.values ?? checked);
    return chosen === EVERYONE ? ids : [chosen];
  };

  const unsettled = (reason: Extract<ApproveOutcome, { ok: false }>["reason"]): ReviewMessage =>
    reason === "settled"
      ? { message: "That creation is already in the game.", color: "warning" }
      : { message: "That creation is no longer here.", color: "warning" };

  /** Approve a row: the target chooser first for a quest the kid gave to someone but themself, then the confirm */
  const approveCreation = async (row: CreationRow) => {
    const quest = questOf(row);
    const isForSomeoneElse = quest !== undefined && quest.assignee.some((id) => String(id) !== row.by);
    const assignee = isForSomeoneElse ? await chooseTarget(row, quest) : undefined;
    const backedOut = assignee === null;
    if (backedOut) return;
    const maker = deps.heroName(row.by);
    const alert = await alertController.create({
      header: row.kind === "beast" ? "Approve Beast" : "Approve Quest",
      message: `Approve "${row.name}"? ${maker} earns ${apOf(row)} AP.`,
      buttons: [
        { text: "Cancel", role: "cancel" },
        {
          text: "Approve",
          handler: () => {
            void deps.runReview({ id: row.key }, async () => {
              const result = await approveRow(row, deps.reviewerId(), { assignee });
              const isUnsettled = !result.ok;
              if (isUnsettled) return unsettled(result.reason);
              play$fx("select");
              // A maker with no profile any more is paid nothing (recordAPGain skips them), so say only what happened
              const paid = deps.isKnownHero(row.by) && result.ap > 0 ? ` ${maker} earned ${result.ap} AP.` : "";
              return { message: `Approved! "${row.name}" is in the game.${paid}` };
            });
          },
        },
      ],
    });
    await alert.present();
  };

  /** Send a row back with a note, the same sheet as a quest claim's */
  const sendBackCreation = async (row: CreationRow) => {
    const maker = deps.heroName(row.by);
    const alert = await alertController.create({
      header: "Send Creation Back",
      message: `Send "${row.name}" back to ${maker}? They can fix it and send it again.`,
      inputs: [
        {
          name: "note",
          type: "textarea",
          placeholder: "A short note for the maker (optional)",
          attributes: { maxlength: 140 },
        },
      ],
      buttons: [
        { text: "Cancel", role: "cancel" },
        {
          text: "Send back",
          handler: (data) => {
            const note = String(data?.note ?? "").trim();
            void deps.runReview({ id: row.key }, async () => {
              const result = await returnRow(row, deps.reviewerId(), note || undefined);
              if (!result.ok) return { message: "That creation is no longer waiting for a look.", color: "warning" };
              return { message: `Sent back. ${maker} can fix "${row.name}" and send it again.`, color: "medium" };
            });
          },
        },
      ],
    });
    await alert.present();
  };

  /** Edit opens the Game Master's own form on the record; saving there approves it with the edits */
  const editCreation = (row: CreationRow) => {
    play$fx("select");
    const isBeast = row.kind === "beast";
    void router.push(
      isBeast
        ? { name: "xp-create-update-beast", params: { id: row.id } }
        : { name: "xp-achievement-config-dashboard", params: { id: row.id } }
    );
  };

  return { lists, loadCreations, approveCreation, sendBackCreation, editCreation };
};

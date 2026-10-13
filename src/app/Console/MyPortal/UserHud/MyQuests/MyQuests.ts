import { defineComponent, onMounted, reactive, ref, watch } from "vue";
import ionic from "@/lib/mixins/ionic";
import {
  actionSheetController,
  alertController,
  toastController,
} from "@ionic/vue";
import { getQuestEngine } from "@/lib/engine/quests/QuestEngine";
import type { QuestBoardItem } from "@/lib/engine/quests/QuestEngine";
import { getQuestLogDb } from "@/lib/databases/QuestLogDb";
import { checkClaimWindow } from "@/lib/services/quests/QuestClaimGuard";
import { completeQuest } from "@/lib/services/quests/QuestCompletionService";
import type { CompletionResult } from "@/lib/services/quests/QuestCompletionService";
import { nickOf, questListCounts, questListFor } from "@/lib/services/quests/QuestList";
import type { QuestListRow, QuestListStatus } from "@/lib/services/quests/QuestList";
import type { Achievement } from "@/lib/databases/AchievementDb";
import { BestiaryDb, beastStorage } from "@/lib/databases/BestiaryDb";
import type { Beast } from "@/lib/databases/BestiaryDb";
import { arrowBack, checkmarkDone, close } from "ionicons/icons";
import { play$fx } from "@/assets/fx";
import { useGameStore } from "@/lib/store/stores/game";
import { useUserStore } from "@/lib/store/stores/user";

import XpBeastCardModal from "./components/XpBeastCardModal.vue";
import XpQuickTaskModal from "./components/XpQuickTaskModal.vue";
import XpQuestWizardModal from "./components/XpQuestWizardModal.vue";
import { questLogActions } from "./questLogActions";
import type { QuestLogActionId } from "./questLogActions";
import { prefillQueryFor, questPrefill } from "@/lib/services/quests/questPrefill";
import XpAppBottomNav from "@/components/organisms/BottomNav/XpAppBottomNav.vue";
import type { AppNavTab } from "@/components/organisms/BottomNav/appBottomNav";
import { appSheet, useAppSkin } from "@/components/organisms/XpApp/useAppSkin";
import { beastPortraitUrl } from "@/app/Admin/XpCompendium/views/XpTemples/components/XpTempleCreator/components/beastPortrait";
import debug from "@/lib/utils/debug";
import { useTimers } from "@/hooks/useTimers";
import { useCopy } from "@/hooks/useVoice";
import { sectionsByWindow, toLogRow } from "./questLogRows";
import type { QuestLogRow } from "./questLogRows";

// The quest log has two faces: the card board (the RPG view) and the plain to-do list
type QuestLogView = "board" | "list";
const VIEW_KEY = "xp.questLogView";
// How long a finished row wears its stamp before the board reloads, and how long it flashes in its new section
const CELEBRATE_MS = 750;
const CELEBRATE_REDUCED_MS = 350;
const LANDED_MS = 1400;

const prefersReducedMotion = (): boolean =>
  typeof window !== "undefined" && Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

const savedView = (): QuestLogView => {
  try {
    return localStorage.getItem(VIEW_KEY) === "list" ? "list" : "board";
  } catch {
    return "board";
  }
};

export default defineComponent({
  props: ["userId"],
  name: "my-quests",
  components: {
    XpBeastCardModal,
    XpQuickTaskModal,
    XpQuestWizardModal,
    XpAppBottomNav,
  },
  data() {
    return {
      activeModal: 0,
      // the row whose quest the beast card shows, kept so a reload underneath can't pull the card away
      activeRow: null as QuestListRow | null,
      view: savedView() as QuestLogView,
      addOpen: false,
      wizardOpen: false,
      // the list row whose Done tap is being recorded, so a double tap can't claim twice
      finishing: "",
      // the row that just paid out (or went to the Game Master): it wears a stamp for a beat, then lands in Done
      celebrating: null as { id: string; pending: boolean } | null,
      landed: "",
    };
  },
  mixins: [ionic],
  activated() {
    this.$fx.ui[this.$fx.theme.ui].openPage.play();
    // const mp3 = this.$requireAudio('./take_item.mp3')
    // this.nativeAudio.preloadSimple('openTask', mp3).then(onSuccess, onError)
    // this.nativeAudio.preloadSimple('openTask', '../src/assets/audio/click.mp3').then(onSuccess, onError)
  },
  computed: {
    xp_achievement() {
      return (this as any).gameStore.xp_achievement;
    },
    searchText: {
      get() {
        return this.params.search;
      },
      set(text) {
        this.params.search = text;
      },
    },
    // The board as a plain to-do list: every quest with its assignee, due time and status
    listRows(): QuestListRow[] {
      const effects = (this as any).userStore.getUserById(this.userId)?.questEffects;
      return questListFor(String(this.userId), new Date(), this.board, (this as any).userStore.users, effects);
    },
    listCounts(): Record<QuestListStatus, number> {
      return questListCounts(this.listRows);
    },
    // What still needs doing today, shown on the List tab
    todoCount(): number {
      return this.listCounts.overdue + this.listCounts.open;
    },
    questTabs(): AppNavTab[] {
      return [
        { id: "board", label: "Board", faIcon: "th-large" },
        { id: "list", label: "List", faIcon: "tasks", badge: this.todoCount },
      ];
    },
    // The app bar's meta: what still needs doing
    headerMeta(): string {
      return this.isLoading ? "" : `${this.todoCount} due`;
    },
    // The rows as the app draws them: the Board in due windows, the List as one flat group
    sections(): { key: string; label: string; rows: QuestLogRow[] }[] {
      const hero = String(this.userId);
      const context = {
        beasts: this.familyBeasts,
        heroNick: nickOf((this as any).userStore.users[hero], hero),
        portraitUrl: beastPortraitUrl,
      };
      const draw = (rows: QuestListRow[]) => rows.map((row) => toLogRow(row, context));
      if (this.view === "list") {
        return this.listRows.length ? [{ key: "list", label: "", rows: draw(this.listRows) }] : [];
      }
      return sectionsByWindow(this.listRows, new Date()).map(({ key, label, rows }) => ({ key, label, rows: draw(rows) }));
    },
    // The Quest Wizard opens on today for the hero whose log this is
    wizardPrefill(): ReturnType<typeof questPrefill> {
      return questPrefill(prefillQueryFor(new Date(), "all", String(this.userId)));
    },
    emptyLine(): string {
      if (this.params.search) return this.t("quests.empty.search");
      return this.view === "list" ? this.t("quests.empty.list") : this.t("quests.empty.board");
    },
  },
  methods: {
    clickItem(item: any) {
      this.activeModal = item.id;
    },
    // A row tap, Board or List: the quest's beast card opens (the List's Done button still marks it done in one tap)
    openRow(row: QuestLogRow) {
      this.activeRow = row.source;
      this.clickItem(row.source.quest);
    },
    // A claim made on the card changes today's board, so reload it once the card closes
    onTaskDismissed() {
      this.activeModal = 0;
      this.activeRow = null;
      void this.loadBoard();
    },
    isModalOpen(id: any) {
      return this.activeModal == id;
    },
    clickComplete() {
      this.activeModal = 0;
      this.presentAlertMultipleButtons();
    },
    async presentAlertMultipleButtons() {
      const alert = await alertController.create({
        cssClass: "my-custom-class",
        header: "Points Rewarded",
        subHeader: "Subtitle",
        message: "This is an alert message.",
        buttons: ["Collect Loot"],
      });
      return alert.present();
    },
    resetTextSound() {
      this.$fx.rpg[this.$fx.theme.rpg].text.pause();
      this.$fx.rpg[this.$fx.theme.rpg].text.currentTime = 0;
      this.$fx.rpg[this.$fx.theme.rpg].text.play();
    },
    playTextSound() {
      this.$fx.rpg[this.$fx.theme.rpg].text.play();
    },

    segmentChanged() {
      // debug.log("Segment changed");
    },

    // --- the List view ---
    // The dock's v-model has already set the view when this fires, so the choice is always saved
    onViewChange(view: QuestLogView) {
      this.view = view;
      try {
        localStorage.setItem(VIEW_KEY, view);
      } catch (error) {
        debug.warn("[MyQuests] could not remember the quest log view", error);
      }
    },
    viewChanged(ev: CustomEvent) {
      const view: QuestLogView = ev.detail.value === "list" ? "list" : "board";
      if (view === this.view) return;
      this.view = view;
      this.$fx.ui[this.$fx.theme.ui].select.play();
      try {
        localStorage.setItem(VIEW_KEY, view);
      } catch (error) {
        // a private window forgets the choice; the board is the default
        debug.warn("[MyQuests] could not remember the quest log view", error);
      }
    },
    // One tap, one confirm sheet, then the quest goes through completeQuest like a claim from the card
    async confirmDone(row: QuestListRow) {
      const { xp, gp, ap } = row.rewards;
      const sheet = await actionSheetController.create({
        ...appSheet("quests"),
        header: row.title,
        subHeader: row.requiresApproval ? this.t("quests.done.approvalNote") : this.t("beastCard.toast.loot", { xp, gp, ap }),
        buttons: [
          {
            text: row.requiresApproval ? this.t("quests.done.sendButton") : this.t("quests.done.button"),
            icon: checkmarkDone,
            handler: () => {
              void this.finishRow(row);
            },
          },
          {
            text: this.t("quests.done.notYet"),
            role: "cancel",
            handler: () => {
              this.$fx.ui[this.$fx.theme.ui].no.play();
            },
          },
        ],
      });
      this.$fx.ui[this.$fx.theme.ui].alert.play();
      await sheet.present();
    },
    async finishRow(row: QuestListRow) {
      if (this.finishing) return;
      this.finishing = row.id;
      try {
        // The quest log is the source of truth, so a stale row can never pay out twice. Every hero's log: another
        // assignee's clear of a shared quest (Team Effort, Rat Race) already used the window up
        const heroId = String(this.userId);
        const entries = await getQuestLogDb().getEntries();
        const effects = (this as any).userStore.getUserById(this.userId)?.questEffects;
        const check = checkClaimWindow(row.quest, entries, heroId, new Date(), effects);
        if (!check.canClaim) {
          // The row was out of date: show the board as the log has it
          await this.loadBoard();
          this.say(row.title, check.notice, 2200);
          return;
        }
        const result = await completeQuest(row.quest, heroId, "claim");
        await this.celebrate(row, result.awaitingApproval);
        await this.loadBoard();
        this.land(row);
        this.announceDone(row, result);
      } catch {
        this.say(this.t("beastCard.error.log"), undefined, 2200);
      } finally {
        this.finishing = "";
      }
    },
    // The row answers the tap before the board moves: a stamp over its Done button, held for a beat
    celebrate(row: QuestListRow, pending: boolean): Promise<void> {
      this.celebrating = { id: row.id, pending };
      const wait = prefersReducedMotion() ? CELEBRATE_REDUCED_MS : CELEBRATE_MS;
      return new Promise((resolve) => {
        this.timers.startTimeout(wait, () => {
          this.celebrating = null;
          resolve();
        });
      });
    },
    // In its new section the row flashes once, so the eye finds where it went
    land(row: QuestListRow) {
      this.landed = row.id;
      this.timers.startTimeout(LANDED_MS, () => {
        this.landed = "";
      });
    },
    announceDone(row: QuestListRow, { awaitingApproval, levelUp, paid }: CompletionResult) {
      const nick = (this as any).userStore.getUserById(this.userId)?.name?.nick || "The hero";
      if (awaitingApproval) {
        this.say(this.t("quests.toast.pending"), this.t("quests.toast.pendingBody", { nick, quest: row.title }), 2200);
        return;
      }
      this.$fx.ui[this.$fx.theme.ui].select.play();
      const { xp, gp, ap } = paid ?? row.rewards;
      this.say(this.t("beastCard.toast.tamed", { nick, quest: row.title }), this.t("beastCard.toast.loot", { xp, gp, ap }));
      if (!levelUp?.didLevelUp) return;
      const { newLevel } = levelUp;
      this.timers.startTimeout(2000, () => {
        this.$fx.rpg[this.$fx.theme.rpg].levelUp.play();
        this.say(this.t("beastCard.toast.levelUp", { level: newLevel }), nick, 2400);
      }); // let the rewards toast clear first
    },
    async say(header: string, message?: string, duration = 2000) {
      const toast = await toastController.create({
        header,
        message,
        cssClass: "rpg-toast",
        position: "top",
        duration,
      });
      await toast.present();
    },
    // The FAB's sheet: a new quest through the wizard, or the small to-do form
    async presentActionSheet() {
      const sheet = await actionSheetController.create({
        ...appSheet("quests"),
        header: "Beast Log",
        buttons: [
          ...questLogActions().map(({ id, text }) => ({
            text,
            handler: () => {
              this.runAction(id);
            },
          })),
          { text: "Cancel", icon: close, role: "cancel" },
        ],
      });
      play$fx("openMenu");
      await sheet.present();
    },
    runAction(id: QuestLogActionId) {
      if (id === "new-quest") {
        this.wizardOpen = true;
        return;
      }
      this.addOpen = true;
    },
    // A quest made with the wizard is on the board as soon as it is saved; reload so it shows with its status
    onQuestSaved() {
      void this.loadBoard();
    },
    // A new task is on the board as soon as it is saved; reload so it shows with its status
    onTaskSaved(task: Achievement) {
      void this.loadBoard();
      const forMe = (task.assignee || []).map(String).includes(String(this.userId));
      const first = task.assignee?.[0];
      const who = forMe ? "" : ` for ${(first && (this as any).userStore.users[first]?.name?.nick) || "a hero"}`;
      this.say(this.t("quests.toast.taskPosted"), `${task.achievementName}${who}`);
    },
  },
  setup(props) {
    const gameStore = useGameStore();
    const userStore = useUserStore();
    const timers = useTimers();
    const t = useCopy();
    const { rootClass, rootStyle } = useAppSkin("quests");

    const board = ref<QuestBoardItem[]>([]);
    const isLoading = ref(true);
    // The family's own beasts: the tile of a quest wears its beast's portrait
    const familyBeasts = ref<Beast[]>([]);

    const params = reactive({
      search: "",
    });

    // Only the newest request may update the board, so a slow reload can't overwrite a fresher one
    let latestRequest = 0;
    const loadBoard = async () => {
      const request = ++latestRequest;
      try {
        // The hero's item effects (snoozes, pull-ins, extensions) shape their own board
        const effects = userStore.getUserById(props.userId)?.questEffects;
        const items = await getQuestEngine().getQuestBoardForUser(props.userId, new Date(), {
          search: params.search,
        }, effects);
        if (request === latestRequest) board.value = items;
      } finally {
        if (request === latestRequest) isLoading.value = false;
      }
    };

    const loadBeasts = async () => {
      try {
        familyBeasts.value = await new BestiaryDb(beastStorage).getBeasts();
      } catch (error) {
        // the tiles fall back to the library's portraits and the status icons
        debug.warn("[MyQuests] could not read the bestiary", error);
      }
    };

    onMounted(() => {
      void loadBeasts();
      return loadBoard();
    });
    watch(() => params.search, loadBoard);

    return {
      gameStore,
      userStore,
      timers,
      t,
      params,
      board,
      loadBoard,
      isLoading,
      familyBeasts,
      rootClass,
      rootStyle,
      arrowBack,
    };
  },
});

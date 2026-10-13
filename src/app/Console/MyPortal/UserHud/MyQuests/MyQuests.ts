import { defineComponent, onMounted, reactive, ref, watch } from "vue";
import ionic from "@/lib/mixins/ionic";
import {
  actionSheetController,
  alertController,
  IonicSlides,
  toastController,
} from "@ionic/vue";
import { getQuestEngine } from "@/lib/engine/quests/QuestEngine";
import type { QuestBoardItem } from "@/lib/engine/quests/QuestEngine";
import { getQuestLogDb } from "@/lib/databases/QuestLogDb";
import { checkClaimWindow } from "@/lib/services/quests/QuestClaimGuard";
import { completeQuest } from "@/lib/services/quests/QuestCompletionService";
import type { CompletionResult } from "@/lib/services/quests/QuestCompletionService";
import { questListCounts, questListFor } from "@/lib/services/quests/QuestList";
import type { QuestListRow, QuestListStatus } from "@/lib/services/quests/QuestList";
import type { Achievement } from "@/lib/databases/AchievementDb";
import {
  ribbonOutline,
  arrowBack,
  chevronBack,
  chevronForward,
  stop,
  play,
  pause,
  colorWand,
  colorWandOutline,
  lockClosedOutline,
  lockOpenOutline,
  sunnyOutline,
  partlySunnyOutline,
  moonOutline,
  cloudyNightOutline,
  medalOutline,
  bagOutline,
  checkmarkDone,
  hourglassOutline,
  add,
  shieldCheckmarkOutline,
} from "ionicons/icons";
import { useGameStore } from "@/lib/store/stores/game";
import { useUserStore } from "@/lib/store/stores/user";

import MyTask from "../MyTask/MyTask.vue";
import XpQuickTaskModal from "./components/XpQuickTaskModal.vue";
// import { useSwiper } from "swiper/vue";
import { Controller, Navigation, Swiper as SwiperClass } from "swiper";
import { formatQuestName } from "@/lib/utils/format";
import { sanitizeHtml } from "@/lib/utils/sanitizeHtml";
import debug from "@/lib/utils/debug";
import { useTimers } from "@/hooks/useTimers";

// The quest log has two faces: the card board (the RPG view) and the plain to-do list
type QuestLogView = "board" | "list";
const VIEW_KEY = "xp.questLogView";

const savedView = (): QuestLogView => {
  try {
    return localStorage.getItem(VIEW_KEY) === "list" ? "list" : "board";
  } catch {
    return "board";
  }
};

// The boxed icon at the head of a list row, per status
const ROW_ICONS: Record<QuestListStatus, string> = {
  overdue: "fad fa-alarm-exclamation",
  open: "fad fa-scroll",
  later: "fad fa-calendar-day",
  pending: "fad fa-hourglass-half",
  done: "fad fa-check-double",
};

const ROW_COLORS: Record<QuestListStatus, string> = {
  overdue: "danger",
  open: "success",
  later: "tertiary",
  pending: "warning",
  done: "medium",
};

export default defineComponent({
  props: ["userId"],
  name: "my-quests",
  components: {
    MyTask,
    XpQuickTaskModal,
  },
  data() {
    return {
      activeModal: 0,
      view: savedView() as QuestLogView,
      addOpen: false,
      // the list row whose Done tap is being recorded, so a double tap can't claim twice
      finishing: "",
      swiperNavigation: {
        nextEl: "#swiper-forward",
        prevEl: "#swiper-back",
      },
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
        this.params.page = 1;
      },
    },
    // Open quests first, then the ones already tamed; quests that are not due stay hidden
    filteredTasks(): QuestBoardItem[] {
      const shown = this.board.filter(({ status }) => status !== "notDue");
      return [
        ...shown.filter(({ status }) => status === "open"),
        ...shown.filter(({ status }) => status === "done"),
      ];
    },
    // Paginated tasks for the swiper
    tasks() {
      const start = (this.params.page - 1) * this.params.per_page;
      const end = start + this.params.per_page;
      return this.filteredTasks.slice(start, end);
    },
    nTotalTasks() {
      return this.filteredTasks.length;
    },
    nTotalPages() {
      return Math.ceil(this.nTotalTasks / this.params.per_page) || 1;
    },
    hasNextPage() {
      return this.params.page < this.nTotalPages;
    },
    pageNumbers() {
      const min = (this.params.page - 1) * this.params.per_page + 1;
      const max = Math.min(this.params.page * this.params.per_page, this.nTotalTasks);
      return { min: this.nTotalTasks === 0 ? 0 : min, max };
    },
    // Alias for page to use in template
    page() {
      return this.params.page;
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
    listEmptyLine(): string {
      return this.params.search
        ? "No quest answers to that name."
        : "Nothing on the list. Tap + to post a task.";
    },
  },
  methods: {
    clickItem(item: any) {
      this.activeModal = item.id;
    },
    // A claim made in the modal changes today's board, so reload it once the modal closes
    onTaskDismissed() {
      this.activeModal = 0;
      void this.loadBoard();
    },
    isModalOpen(id: any) {
      return this.activeModal == id;
    },
    clickComplete() {
      this.activeModal = 0;
      this.presentAlertMultipleButtons();
    },
    slidePrev() {
      if (this.params.page > 1) this.params.page--;
    },
    slideNext() {
      if (this.params.page < this.nTotalPages) this.params.page++;
    },
    // Get tasks for a specific page number (for swiper slides)
    getTasksForPage(pageNum: number) {
      const start = (pageNum - 1) * this.params.per_page;
      const end = start + this.params.per_page;
      return this.filteredTasks.slice(start, end);
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
    getFeaturedImg(item: any) {
      const hasFeaturedImage = Boolean(item.localImage || item.imageUrl);
      if (hasFeaturedImage) {
        return {
          src: item.localImage || item.imageUrl,
          alt: item.achievementName,
        };
      }
      return {
        src: "",
        alt: item.achievementName,
      };
    },
    searchChanged() {
      if (this.controlledSwiper) {
        this.controlledSwiper.slideTo(0);
      }
      this.params.page = 1;
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
    rowIcon(row: QuestListRow): string {
      return ROW_ICONS[row.status];
    },
    rowColor(row: QuestListRow): string {
      return ROW_COLORS[row.status];
    },
    // The assignee's picture: the snapshot of their look, else their avatar
    avatarFor(id: string | null): string {
      if (!id) return "";
      return (this as any).$getUserAvatar((this as any).userStore.users[id]) || "";
    },
    tapRow(row: QuestListRow) {
      switch (row.status) {
        case "open":
        case "overdue":
          return this.confirmDone(row);
        case "pending":
          return this.say("Pending the Game Master", `${row.title} waits for approval.`);
        case "later":
          return this.say("Not due yet", `${row.title} is due ${row.dueLabel}.`);
        default:
          return this.say("Already tamed", row.title);
      }
    },
    // One tap, one confirm sheet, then the quest goes through completeQuest like a claim from the card
    async confirmDone(row: QuestListRow) {
      const { xp, gp, ap } = row.rewards;
      const sheet = await actionSheetController.create({
        header: row.title,
        subHeader: row.requiresApproval
          ? "The Game Master must approve this one; the loot waits."
          : `+${xp} XP · +${gp} GP · +${ap} AP`,
        buttons: [
          {
            text: row.requiresApproval ? "Done, send for approval" : "Done!",
            icon: checkmarkDone,
            handler: () => {
              void this.finishRow(row);
            },
          },
          {
            text: "Not yet",
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
        await this.loadBoard();
        this.announceDone(row, result);
      } catch {
        this.say("The quest log did not respond. Try again.", undefined, 2200);
      } finally {
        this.finishing = "";
      }
    },
    announceDone(row: QuestListRow, { awaitingApproval, levelUp, paid }: CompletionResult) {
      const nick = (this as any).userStore.getUserById(this.userId)?.name?.nick || "The hero";
      if (awaitingApproval) {
        this.say("Pending the Game Master", `${nick} sent ${row.title} for approval.`, 2200);
        return;
      }
      this.$fx.ui[this.$fx.theme.ui].select.play();
      const { xp, gp, ap } = paid ?? row.rewards;
      this.say(`${nick} tamed ${row.title}!`, `+${xp} XP · +${gp} GP · +${ap} AP`);
      if (!levelUp?.didLevelUp) return;
      const { newLevel } = levelUp;
      this.timers.startTimeout(2000, () => {
        this.$fx.rpg[this.$fx.theme.rpg].levelUp.play();
        this.say(`LEVEL UP! Now level ${newLevel}`, nick, 2400);
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
    openAddTask() {
      this.$fx.ui[this.$fx.theme.ui].openMenu.play();
      this.addOpen = true;
    },
    // A new task is on the board as soon as it is saved; reload so it shows with its status
    onTaskSaved(task: Achievement) {
      void this.loadBoard();
      const forMe = (task.assignee || []).map(String).includes(String(this.userId));
      const first = task.assignee?.[0];
      const who = forMe ? "" : ` for ${(first && (this as any).userStore.users[first]?.name?.nick) || "a hero"}`;
      this.say("Task posted", `${task.achievementName}${who}`);
    },
  },
  setup(props) {
    const gameStore = useGameStore();
    const userStore = useUserStore();
    const timers = useTimers();
    const controlledSwiper = ref<SwiperClass | null>(null);
    const setControlledSwiper = (swiper: SwiperClass) => {
      controlledSwiper.value = swiper;
    };

    const board = ref<QuestBoardItem[]>([]);
    const isLoading = ref(true);

    const params = reactive({
      page: 1,
      search: "",
      per_page: 4,
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

    onMounted(loadBoard);
    watch(() => params.search, loadBoard);

    return {
      gameStore,
      userStore,
      timers,
      params,
      board,
      loadBoard,
      isLoading,
      controlledSwiper,
      setControlledSwiper,
      modules: [IonicSlides, Navigation, Controller],
      chevronBack,
      chevronForward,
      stop,
      play,
      pause,
      arrowBack,
      colorWand,
      colorWandOutline,
      lockClosedOutline,
      lockOpenOutline,
      bagOutline,
      sunnyOutline,
      partlySunnyOutline,
      moonOutline,
      cloudyNightOutline,
      medalOutline,
      ribbonOutline,
      checkmarkDone,
      hourglassOutline,
      add,
      shieldCheckmarkOutline,
      formatQuestName,
      sanitizeHtml,
    };
  },
});

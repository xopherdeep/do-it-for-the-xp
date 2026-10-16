import { defineComponent, ref, computed, watch, onMounted } from "vue";
import { useRouter } from "vue-router";
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonFooter,
  IonButtons,
  IonButton,
  IonIcon,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonChip,
  IonFab,
  IonFabButton,
} from "@ionic/vue";
import {
  businessOutline,
  newspaperOutline,
  clipboardOutline,
  calendarOutline,
  megaphoneOutline,
  addOutline,
  chatbubblesOutline,
} from "ionicons/icons";
import XpRevealPrompt from "@/components/organisms/RevealPrompt/XpRevealPrompt.vue";
import { useRevealPrompt } from "@/components/organisms/RevealPrompt/useRevealPrompt";
import { courierLatePrompt } from "@/lib/services/hometown/hometownPrompts";
import debug from "@/lib/utils/debug";
import Ionic from "@/lib/mixins/ionic";
import { useUserStore } from "@/lib/store/stores/user";
import { useTownHallStore } from "@/lib/store/stores/townHall";
import { getQuestEngine } from "@/lib/engine/quests/QuestEngine";
import type { QuestBoardItem } from "@/lib/engine/quests/QuestEngine";
import { formatQuestName } from "@/lib/utils/format";
import { sanitizeHtml } from "@/lib/utils/sanitizeHtml";
import { canAccessGameMaster } from "@/router/_Guards/gm.guard";
import { TOWN_HALL_BOARDS, type TownHallBoardSlug } from "@/lib/services/townhall/townHallSite";
import { signingName } from "@/lib/services/townhall/townHallPosts";
import type { BoardInfo } from "@/lib/services/townhall/townHallFeed";
import TownHallNews from "./components/TownHallNews.vue";
import TownHallBoard from "./components/TownHallBoard.vue";
import TownHallCompose from "./components/TownHallCompose.vue";
import TownHallEvents from "./components/TownHallEvents.vue";
import TownHallUpdates from "./components/TownHallUpdates.vue";
import type { TownEvent, TownHallTab, TownStats } from "./components/townHallShared";
import { useTownHallClerk } from "./components/useTownHallClerk";

/** How many days ahead the events board looks */
const EVENT_HORIZON_DAYS = 7;

type TabId = "news" | "board" | "events" | "updates";

/** The Town Hall's tabs, in the order they sit along the bottom of the screen */
const TABS: ReadonlyArray<{ id: TabId; label: string; icon: string }> = [
  { id: "news", label: "News", icon: newspaperOutline },
  { id: "board", label: "Board", icon: clipboardOutline },
  { id: "events", label: "Events", icon: calendarOutline },
  { id: "updates", label: "Updates", icon: megaphoneOutline },
];

export default defineComponent({
  name: "TownHall",
  components: {
    IonPage,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonFooter,
    IonButtons,
    IonButton,
    IonIcon,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonChip,
    IonFab,
    IonFabButton,
    XpRevealPrompt,
    TownHallNews,
    TownHallBoard,
    TownHallCompose,
    TownHallEvents,
    TownHallUpdates,
  },
  mixins: [Ionic],
  props: {
    userId: {
      type: String,
      required: true,
    },
  },
  setup(props) {
    const router = useRouter();
    const route = router.currentRoute.value;
    // ?tab=board&board=feature-requests opens a tab (and a board) directly: the Help Desk links here
    const linkedTab = TABS.find((tab) => tab.id === route.query.tab)?.id;
    const selectedTab = ref<TabId>(linkedTab ?? "news");
    const userStore = useUserStore();
    const townHall = useTownHallStore();
    const questEngine = getQuestEngine();

    // A tab loads the first time it is opened and is kept after that
    const opened = ref<TabId[]>([selectedTab.value]);
    const isOpened = (id: TabId) => opened.value.includes(id);
    watch(selectedTab, (id) => {
      if (!isOpened(id)) opened.value = [...opened.value, id];
    });

    // The Board: the picker in the footer lists the boards the site has, the Board tab shows the one picked
    const boards = ref<BoardInfo[]>([]);
    const linkedBoard = TOWN_HALL_BOARDS.find((slug) => slug === route.query.board);
    const boardSlug = ref<TownHallBoardSlug>(linkedBoard ?? TOWN_HALL_BOARDS[0]);
    const onBoards = (found: BoardInfo[]) => {
      boards.value = found;
      const pickedBoardIsMissing = found.length > 0 && !found.some((board) => board.slug === boardSlug.value);
      if (pickedBoardIsMissing) boardSlug.value = found[0].slug;
    };

    // Events: the hero's quests scheduled over the coming week, read from the same board as the quest log
    const events = ref<TownEvent[]>([]);
    const openToday = ref(0);
    const pendingApprovals = ref(0);
    const questsPosted = ref(0);

    const dayKey = (date: Date) => date.toISOString().slice(0, 10);

    const toEvent = (item: QuestBoardItem, date: Date): TownEvent => ({
      id: `${item.quest.id}-${dayKey(date)}`,
      title: formatQuestName(item.quest.achievementName || "Untitled Quest"),
      description: item.pending ? "Awaiting the Game Master's approval" : `${item.quest.xp || 0} XP | ${item.quest.gp || 0} GP`,
      date: dayKey(date),
      time: item.quest.dueByTime ? `Due by ${item.quest.dueByTime}` : "Any time",
      type: questEngine.isOpenBounty(item.quest) ? "bounty" : "quest",
    });

    const loadQuestBoard = async () => {
      try {
        const today = new Date();
        const days = Array.from({ length: EVENT_HORIZON_DAYS }, (_, i) => {
          const d = new Date(today);
          d.setDate(today.getDate() + i);
          return d;
        });
        const [all, ...boardsOfDays] = await Promise.all([
          questEngine.getAllQuests(),
          ...days.map((d) => questEngine.getQuestBoardForUser(props.userId, d)),
        ]);
        questsPosted.value = all.length;
        const todayBoard = boardsOfDays[0];
        openToday.value = todayBoard.filter((item) => item.status === "open").length;
        pendingApprovals.value = todayBoard.filter((item) => item.pending).length;
        events.value = boardsOfDays.flatMap((board, i) =>
          board.filter((item) => item.status !== "notDue").map((item) => toEvent(item, days[i]))
        );
      } catch (err) {
        debug.error("Town Hall could not read the quest board:", err);
        events.value = [];
      }
    };

    const stats = computed<TownStats>(() => ({
      heroes: Object.keys(userStore.users).length,
      quests: questsPosted.value,
      openToday: openToday.value,
      pendingApprovals: pendingApprovals.value,
    }));

    const groupedEvents = computed(() => {
      // Group events by date
      return events.value.reduce((groups: Record<string, TownEvent[]>, event) => {
        (groups[event.date] ||= []).push(event);
        return groups;
      }, {});
    });

    const reveal = useRevealPrompt();

    // The clerk's counter: the menu, the compose sheet, the hero's waiting list, and sending the queue whenever there is a chance to
    // Posts are signed on the public site: a nickname of the hero's own, never their real name (see signingName)
    const heroName = () => signingName(userStore.getUserById(props.userId)?.name);
    const clerk = useTownHallClerk({
      store: townHall,
      reveal,
      userId: () => props.userId,
      heroName,
      isGameMaster: () => canAccessGameMaster(),
      route: () => router.currentRoute.value.path,
      currentBoard: () => boardSlug.value,
      // App.ts reads the profiles without waiting, so a cold start at the Town Hall may not know its Game Master yet
      profilesReady: async () => {
        const hasNoProfiles = Object.keys(userStore.users).length === 0;
        if (hasNoProfiles) await userStore.loadUsers();
      },
    });

    // The courier is late: the clerk says so and offers to ask again. One answer at a time, whatever else is talking.
    const newsTab = ref<TownHallTab | null>(null);
    const boardTab = ref<TownHallTab | null>(null);
    const eventsTab = ref<TownHallTab | null>(null);
    const updatesTab = ref<TownHallTab | null>(null);
    const tabRefs: Record<TabId, typeof newsTab> = { news: newsTab, board: boardTab, events: eventsTab, updates: updatesTab };

    const onTrouble = async (id: TabId) => {
      const isClerkBusy = Boolean(reveal.prompt.value);
      if (isClerkBusy) return;
      const pick = await reveal.showPrompt(courierLatePrompt());
      const isRetrying = pick === "retry";
      if (isRetrying) await tabRefs[id].value?.reload();
    };

    const openFamilyChat = () => router.push({ name: "town-hall-chat", params: { userId: props.userId } });

    onMounted(loadQuestBoard);
    onMounted(clerk.completeLinkReturn);

    return {
      tabs: TABS,
      selectedTab,
      isOpened,
      boards,
      boardSlug,
      onBoards,
      groupedEvents,
      stats,
      onTrouble,
      waiting: clerk.posting.waiting,
      composeSpec: clerk.posting.composeSpec,
      composeOpen: clerk.posting.composeOpen,
      composeSending: clerk.posting.sending,
      composeTrouble: clerk.posting.trouble,
      openComment: clerk.posting.openComment,
      openEdit: clerk.posting.openEdit,
      closeCompose: clerk.posting.closeCompose,
      openClerkMenu: clerk.posting.openClerkMenu,
      sendDraft: clerk.posting.sendDraft,
      dismissPost: clerk.posting.dismissPost,
      openFamilyChat,
      newsTab,
      boardTab,
      eventsTab,
      updatesTab,
      prompt: reveal.prompt,
      respond: reveal.submitAnswer,
      // Icons
      businessOutline,
      addOutline,
      chatbubblesOutline,
      sanitizeHtml,
    };
  },
});

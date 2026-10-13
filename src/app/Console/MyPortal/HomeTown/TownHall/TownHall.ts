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
import { Capacitor } from "@capacitor/core";
import { useVoice } from "@/hooks/useVoice";
import {
  CLERK_ERRANDS,
  clerkMenuPrompt,
  comingSoonPrompt,
  courierLatePrompt,
  linkResultNotice,
  linkedStatusPrompt,
  phoneAppRegistrationNotice,
  registrationPrompt,
  unlinkResultNotice,
  type RegistrationMenuId,
} from "@/lib/services/hometown/hometownPrompts";
import debug from "@/lib/utils/debug";
import Ionic from "@/lib/mixins/ionic";
import { useUserStore } from "@/lib/store/stores/user";
import { useTownHallStore, type LinkResult } from "@/lib/store/stores/townHall";
import { getQuestEngine } from "@/lib/engine/quests/QuestEngine";
import type { QuestBoardItem } from "@/lib/engine/quests/QuestEngine";
import { formatQuestName } from "@/lib/utils/format";
import { sanitizeHtml } from "@/lib/utils/sanitizeHtml";
import { canAccessGameMaster } from "@/router/_Guards/gm.guard";
import { authorizeUrl, readLinkReturn, strippedUrl, townHallReturnUrl } from "@/lib/services/townhall/townHallLink";
import { SIGNUP_URL, TOWN_HALL_BOARDS, connectionName, townHallSiteUrl, type TownHallBoardSlug } from "@/lib/services/townhall/townHallSite";
import { usesHashHistory } from "@/router/historyMode";
import type { BoardInfo } from "@/lib/services/townhall/townHallFeed";
import TownHallNews from "./components/TownHallNews.vue";
import TownHallBoard from "./components/TownHallBoard.vue";
import TownHallEvents from "./components/TownHallEvents.vue";
import TownHallUpdates from "./components/TownHallUpdates.vue";
import type { TownEvent, TownHallTab, TownStats } from "./components/townHallShared";

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
    const selectedTab = ref<TabId>("news");
    const userStore = useUserStore();
    const townHall = useTownHallStore();
    const questEngine = getQuestEngine();

    // A tab loads the first time it is opened and is kept after that
    const opened = ref<TabId[]>(["news"]);
    const isOpened = (id: TabId) => opened.value.includes(id);
    watch(selectedTab, (id) => {
      if (!isOpened(id)) opened.value = [...opened.value, id];
    });

    // The Board: the picker in the footer lists the boards the site has, the Board tab shows the one picked
    const boards = ref<BoardInfo[]>([]);
    const boardSlug = ref<TownHallBoardSlug>(TOWN_HALL_BOARDS[0]);
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
    const { voice } = useVoice();

    // The courier is late: the clerk says so and offers to ask again. One answer at a time, whatever else is talking.
    const newsTab = ref<TownHallTab | null>(null);
    const boardTab = ref<TownHallTab | null>(null);
    const eventsTab = ref<TownHallTab | null>(null);
    const updatesTab = ref<TownHallTab | null>(null);
    const tabRefs: Record<TabId, typeof newsTab> = { news: newsTab, board: boardTab, events: eventsTab, updates: updatesTab };

    const onTrouble = async (id: TabId) => {
      if (reveal.prompt.value) return;
      const pick = await reveal.ask(courierLatePrompt());
      if (pick === "retry") await tabRefs[id].value?.reload();
    };

    /** The device's saved link is read once; a storage failure leaves the family unregistered here and the page working */
    const loadLink = async () => {
      try {
        await townHall.init();
      } catch (err) {
        debug.error("Town Hall could not read this device's link:", err);
      }
    };

    /**
     * Coming back from WordPress's "authorize this app" page, the new password rides in the address. It leaves the address
     * bar and the history first, before anything is awaited, then the clerk checks it and says how it went.
     */
    const finishLinkReturn = async () => {
      const search = window.location.search;
      const returning = readLinkReturn(search).kind !== "none";
      if (returning) window.history.replaceState(window.history.state, "", strippedUrl(window.location));
      await loadLink();
      if (!returning) return;
      let result: LinkResult;
      try {
        result = await townHall.completeLink(search);
      } catch (err) {
        debug.error("Town Hall could not finish the registration:", err);
        result = "failed";
      }
      if (result === "none") return;
      await reveal.ask(linkResultNotice(result, townHall.activeLink?.displayName));
    };

    /** "I have an account": the web version leaves for the site's authorize page, which sends the parent back here */
    const goToAuthorizePage = async () => {
      if (Capacitor.isNativePlatform()) {
        await reveal.ask(phoneAppRegistrationNotice());
        return;
      }
      window.location.assign(
        authorizeUrl({
          site: townHallSiteUrl(),
          appName: connectionName(navigator.userAgent, Capacitor.getPlatform()),
          returnUrl: townHallReturnUrl(props.userId, window.location, usesHashHistory()),
        })
      );
    };

    /** A registered family sees whom it is registered as and may unlink this device; an unregistered one is asked to register */
    const registerFamily = async () => {
      await loadLink();
      const link = townHall.activeLink;
      if (link) {
        const pick = await reveal.ask(linkedStatusPrompt(link.displayName));
        if (pick !== "unlink") return;
        try {
          await reveal.ask(unlinkResultNotice(await townHall.unlink()));
        } catch (err) {
          debug.error("Town Hall could not unlink this device:", err);
        }
        return;
      }
      const pick = (await reveal.ask(registrationPrompt(townHall.signedInThroughWebsite))) as RegistrationMenuId;
      if (pick === "create") window.open(SIGNUP_URL, "_blank", "noopener");
      if (pick === "have") await goToAuthorizePage();
    };

    // The clerk takes the errand in the game's own dialog; the board cannot post any of them yet
    const talkToClerk = async () => {
      const pick = await reveal.ask(clerkMenuPrompt(canAccessGameMaster(), voice.value));
      if (pick === "never") return;
      if (pick === "registration") return registerFamily();
      const what = CLERK_ERRANDS[pick as keyof typeof CLERK_ERRANDS];
      if (what) await reveal.ask(comingSoonPrompt(what, voice.value));
    };

    const openFamilyChat = () => router.push({ name: "town-hall-chat", params: { userId: props.userId } });

    onMounted(loadQuestBoard);
    onMounted(finishLinkReturn);

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
      talkToClerk,
      openFamilyChat,
      newsTab,
      boardTab,
      eventsTab,
      updatesTab,
      prompt: reveal.prompt,
      respond: reveal.respond,
      // Icons
      businessOutline,
      addOutline,
      chatbubblesOutline,
      sanitizeHtml,
    };
  },
});

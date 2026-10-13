import { computed, defineComponent, ref, onBeforeMount, onMounted, onBeforeUnmount } from "vue";
// import requireImg from "@/assets/js/requireImg";
import ionic from "@/lib/mixins/ionic";
import components from "./UserHud/components";
import XpPortalPage from "@/components/templates/pages/XpPortalPage.vue";
import "swiper/css";
import { modalController } from "@ionic/vue";

import { useItemFetcher } from "@/hooks/useItemFetcher";
import { useUserActions } from "@/hooks/useUserActions";
import { useHeroEquipment } from "@/hooks/useHeroEquipment";
import { useEquipmentItems } from "./UserHud/components/equipment/EquipmentItems";
import { actionSheetController, toastController } from "@ionic/vue";
import { format } from "date-fns";
import { play$fx } from "@/assets/fx";
import { getQuestEngine } from "@/lib/engine/quests/QuestEngine";
import type { QuestBoardItem } from "@/lib/engine/quests/QuestEngine";
import { dueTimeOn, isQuestActiveOn } from "@/lib/engine/quests/QuestSchedule";
import { applyBoardEffect, boardEffectOf } from "@/lib/services/quests/ItemEffects";
import { startQuestWatch } from "@/lib/services/notifications/questWatch";
import { canFly } from "@/lib/services/travel/flight";
import { useNotificationsStore } from "@/lib/store/stores/notifications";
import XpBottomNav from "@/components/organisms/BottomNav/XpBottomNav.vue";

// Define interface for equipment items
interface EquipmentItem {
  faIcon?: string;
  hand?: string;
  slotIndex?: number;
  click?: () => void; // Replaced Function with a more specific function signature
  [key: string]: any; // Allow for additional properties
}

// import XpFabUserHud  from "./components/XpFabUserHud.vue"

import {
  sparklesOutline,
  calendar,
  peopleCircle,
  home,
  chatbox,
  wallet,
  personCircle,
  fitnessOutline,
  storefrontOutline,
  medkitOutline,
  medalOutline,
  accessibilityOutline,
  colorWand,
  walletOutline,
} from "ionicons/icons";

import { useRoute, useRouter } from "vue-router";
import { useAudioStore } from "@/lib/store/stores/audio";
import { useUserStore } from "@/lib/store/stores/user";
import { heroAvatarSrc } from "@/lib/hero-look/look";
import { useGameStore } from "@/lib/store/stores/game";
import { useBattleStore } from "@/lib/store/stores/battle";

export default defineComponent({
  components: { ...components, XpPortalPage, XpBottomNav },
  mixins: [ionic],
  name: "my-portal",
  data() {
    return {
      debug: false,
      now: new Date(),
      battleInterval: null,
      isRPGBoxOpen: false,
      isUserProfileModalOpen: false,
      currentTerrain: "plains",
    };
  },

  computed: {
    battleState() {
      return (key: string) => (this as any).battleStore[key];
    },
    getUserById() {
      return (id: string) => (this as any).userStore.getUserById(id);
    },
    theme() { return (this as any).gameStore.theme },
    bgm() { return (this as any).audioStore.bgm },
    battleCounter() {
      return this.battleState("steps").counter;
    },
    pageName() {
      return this.compass?.name;
    },
    isUserFabOn() {
      return !this.route.meta.hideUserFab;
    },
    pageLink() {
      return this.compass?.link;
    },
    routeName() {
      return this.route.name;
    },
    isImpersonating() {
      return (this as any).userStore.currentUser.isImpersonating;
    },
    activeNavTab(): "profile" | "area" | "party" | "" {
      if (this.isUserProfileModalOpen) return "profile";
      const currentRouteName = String(this.route?.name || "");
      const currentRoutePath = String(this.route?.path || "");
      const isPartyRoute = currentRouteName === "my-party" || currentRoutePath.endsWith("/my-party");
      if (isPartyRoute) return "party";
      return "area";
    },
  },
  methods: {
    loginUser(user: any) { return (this as any).userStore.loginUser(user) },
    getUserAvatar(user) {
      return heroAvatarSrc(user, (key: string) => this.$requireAvatar(key));
    },
    async dismissRPGBox() {
      this.isRPGBoxOpen = false;
      this.play$fx("closeMenu");
      await modalController.dismiss();
    },
    closeModal() {
      this.dismissRPGBox();
    },
    openUserProfileModal() { // Method to open the modal
      this.isUserProfileModalOpen = true;
    },
    closeUserProfileModal() {
      this.isUserProfileModalOpen = false;
    },
    // The Area tab opens the equipment (or returns to the area if viewing party)
    openAreaMenu() {
      const isViewingParty = this.route?.name === "my-party" || this.route?.path?.endsWith("/my-party");
      if (isViewingParty) {
        const targetLink = this.compass?.link || `/my-portal/${this.userId}/my-home`;
        this.router.push(targetLink);
        return;
      }
      this.isRPGBoxOpen = true;
      this.play$fx('openMenu');
    },

    stopImpersonating() {
      (this as any).userStore.stopImpersonating();
      this.play$fx("start");
      this.router.push({ name: "xp-dashboard" });
    },
  },
  setup() {
    const router = useRouter();
    const route = useRoute();
    const audioStore = useAudioStore();
    const userStore = useUserStore();
    const gameStore = useGameStore();
    const battleStore = useBattleStore();

    const { userId } = route.params;
    const {
      request,
      items,
      getItems,
      nTotalPages,
      getImgObj
    } = useItemFetcher("xp_achievement", { per_page: 8 });

    const {
      userActions: actions,
      setUserActions,
      setActions
    } = useUserActions();

    const user = computed(() => userStore.getUserById(userId as string));

    onBeforeMount(async () => {
      if (!user.value) {
        await userStore.loadUsers();
        if (!user.value) {
          router.push({ name: 'xp-profile' });
        }
      }
    });

    // The quest watch: the hero's feed (and the device, on a phone) hears about quests due within two
    // hours and quests overdue, once per quest per day, on mount and every five minutes while the portal is up
    const notificationsStore = useNotificationsStore();
    let stopQuestWatch: (() => void) | null = null;
    onMounted(() => {
      if (!userId) return;
      void notificationsStore.load(String(userId));
      stopQuestWatch = startQuestWatch(String(userId));
    });
    onBeforeUnmount(() => {
      stopQuestWatch?.();
      stopQuestWatch = null;
    });
    // The hero's hands: read from the profile, saved on every change (shared with the temples)
    const { equipment, leftHandItem, rightHandItem, clickItem } = useHeroEquipment(String(userId));

    const say = async (message: string, duration = 1800) => {
      const toast = await toastController.create({ message, duration, position: "top", cssClass: "rpg-toast" });
      await toast.present();
    };

    /** The quests a pick-quest item may target today: the open ones, or (Hook Shot) the ones not due yet. */
    const questChoices = async (picks: "open" | "future"): Promise<QuestBoardItem[]> => {
      const now = new Date();
      const board = await getQuestEngine().getQuestBoardForUser(String(userId), now, undefined, user.value?.questEffects);
      return picks === "future"
        ? board.filter((entry) => entry.status === "notDue" && isQuestActiveOn(entry.quest, now))
        : board.filter((entry) => entry.status === "open");
    };

    const resolveScheduleLabel = (entry: QuestBoardItem, now: Date): string => {
      const isNotDue = entry.status === "notDue";
      if (isNotDue) {
        return entry.quest.basicSchedule;
      }
      const due = dueTimeOn(entry.quest.dueByTime, now);
      if (due) {
        return `due ${format(due, "h:mma")}`;
      }
      return "";
    };

    /** An action sheet of quests (title and due time); resolves with the picked quest id, or null on cancel. */
    const pickQuest = (choices: QuestBoardItem[], header: string): Promise<string | null> =>
      new Promise((resolve) => {
        const now = new Date();
        const buttons = choices.map((entry) => {
          const when = resolveScheduleLabel(entry, now);
          return {
            text: when ? `${entry.quest.achievementName} · ${when}` : entry.quest.achievementName,
            handler: () => resolve(String(entry.quest.id)),
          };
        });
        actionSheetController
          .create({
            header,
            cssClass: "rpg-sheet",
            buttons: [...buttons, { text: "Cancel", role: "cancel", handler: () => resolve(null) }],
          })
          .then((sheet) => {
            sheet.onDidDismiss().then(() => resolve(null));
            return sheet.present();
          })
          .catch(() => resolve(null));
      });

    const isPegasusModalOpen = ref(false);
    const openPegasusModal = () => {
      isPegasusModalOpen.value = true;
      play$fx("openMenu");
    };
    const closePegasusModal = () => {
      isPegasusModalOpen.value = false;
    };

    const { specialItems } = useEquipmentItems({ onOpenPegasusModal: openPegasusModal });

    // Tapping an equipped item outside a temple: navigation items navigate, board items act on the quest
    // board (docs/Items-And-Classes-Contract.md section B), the rest wait for a temple or a fight
    const useHand = async (item: EquipmentItem | null) => {
      if (!item) return;
      play$fx("select");
      const live = specialItems.find((candidate: EquipmentItem) =>
        (item.faIcon && candidate.faIcon === item.faIcon) ||
        (item.name && candidate.name === item.name)
      );
      if (live?.click) {
        live.click();
        return;
      }
      const name = String(item.name ?? live?.name ?? "");
      const effect = boardEffectOf(name);

      let questId: string | undefined;
      if (effect.kind === "pick-quest") {
        const choices = await questChoices(effect.picks ?? "open");
        if (!choices.length) {
          play$fx("no");
          return say(effect.picks === "future" ? "No future quests to pull in." : "No open quests on the board.");
        }
        const picked = await pickQuest(choices, `${name}: ${effect.describe}`);
        if (!picked) return;
        questId = picked;
      }
      const result = await applyBoardEffect({ name, faIcon: item.faIcon, desc: String(item.desc ?? "") }, {
        userId: String(userId),
        questId,
        now: new Date(),
      });
      play$fx(result.sound);
      await say(result.line, result.ok ? 2600 : 1800);
    };

    const openParty = () => router.push(`/my-portal/${userId}/my-party`);

    const compass = computed(() => {
      const currentName = String(route.name || "");
      const currentPath = String(route.path || "");
      const heroId = String(userId || "");

      const worlds: Record<string, { name: string; icon: string; link: string }> = {
        "world-map": {
          name: "The World",
          icon: "pegasus",
          // On foot there is no overworld to return to: the Plains is as far as the hero's feet go
          link: `/my-portal/${heroId}/${canFly(user.value) ? "world-map" : "plains"}`,
        },
        "home-town": {
          name: "Hometown",
          icon: "archway",
          link: `/my-portal/${heroId}/home-town`,
        },
        "my-home": {
          name: "My Home",
          icon: "house-user",
          link: `/my-portal/${heroId}/my-home`,
        },
        "world-plains": {
          name: "Plains",
          icon: "tornado",
          link: `/my-portal/${heroId}/plains`,
        },
        "world-islands": {
          name: "Islands",
          icon: "island-tropical",
          link: `/my-portal/${heroId}/islands`,
        },
        "world-forest": {
          name: "Forests",
          icon: "trees",
          link: `/my-portal/${heroId}/forest`,
        },
        "world-swamps": {
          name: "Swamps",
          icon: "skull-crossbones",
          link: `/my-portal/${heroId}/swamps`,
        },
        "world-mountains": {
          name: "Mountains",
          icon: "mountains",
          link: `/my-portal/${heroId}/mountains`,
        },
        "world-sands": {
          name: "Sands",
          icon: "cactus",
          link: `/my-portal/${heroId}/sands`,
        },
        "world-ice": {
          name: "Tundras",
          icon: "igloo",
          link: `/my-portal/${heroId}/world-ice`,
        },
        "world-clouds": {
          name: "Clouds",
          icon: "cloud",
          link: `/my-portal/${heroId}/clouds`,
        },
        "the-moon": {
          name: "The Moon",
          icon: "moon",
          link: `/my-portal/${heroId}/the-moon`,
        },
        "my-party": {
          name: "Party",
          icon: "fort-awesome",
          link: `/my-portal/${heroId}/my-party`,
        },
        "my-profile": {
          name: "Profile",
          icon: "user-circle",
          link: `/my-portal/${heroId}/my-profile`,
        },
      };

      if (worlds[currentName]) {
        return worlds[currentName];
      }

      for (const world of Object.values(worlds)) {
        const isCurrentWorld = Boolean(world.link) && (currentPath === world.link || currentPath.endsWith(world.link));
        if (isCurrentWorld) {
          return world;
        }
      }

      const pathSegments = currentPath.split("/").filter(Boolean);
      const lastSegment = pathSegments[pathSegments.length - 1];
      const isWorldSegment = Boolean(lastSegment && worlds[lastSegment]);
      if (isWorldSegment) {
        return worlds[lastSegment];
      }

      if (route.meta?.faIcon) {
        const rawName = typeof route.name === "string"
          ? route.name.replace(/^(world-|my-)/, "").replace(/-/g, " ")
          : "Area";
        return {
          name: rawName.charAt(0).toUpperCase() + rawName.slice(1),
          icon: String(route.meta.faIcon),
          link: currentPath,
        };
      }

      return {
        name: "My Home",
        icon: "house-user",
        link: `/my-portal/${heroId}/my-home`,
      };
    });

    const pageIcon = computed(() => route.meta.faIcon);
    const fabStyle = computed(() => gameStore.fabStyle);

    return {
      userId,
      clickItem,
      leftHandItem,
      rightHandItem,
      useHand,
      openParty,
      isPegasusModalOpen,
      openPegasusModal,
      closePegasusModal,
      compass,
      pageIcon,
      fabStyle,
      accessibilityOutline,
      calendar,
      chatbox,
      colorWand,
      equipment,
      fitnessOutline,
      home,
      medalOutline,
      medkitOutline,
      peopleCircle,
      personCircle,
      // requireImg,
      route,
      router,
      audioStore,
      userStore,
      gameStore,
      battleStore,
      sparklesOutline,
      storefrontOutline,
      user,
      wallet,
      walletOutline,
      request,
      items,
      getItems,
      nTotalPages,
      getImgObj,
      userActions: actions,
      setUserActions,
      setActions,
    };
  },
});

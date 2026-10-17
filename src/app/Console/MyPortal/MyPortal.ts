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
import { toastController } from "@ionic/vue";
import { play$fx } from "@/assets/fx";
import { itemCardLine } from "@/lib/services/items/ItemRules";
import { lanternOverdue } from "@/lib/services/quests/ItemEffects";
import { startQuestWatch } from "@/lib/services/notifications/questWatch";
import { startApprovalWatch } from "@/lib/services/notifications/approvalWatch";
import { startReminderTaps } from "@/lib/services/notifications/reminderTaps";
import { canFly } from "@/lib/services/travel/flight";
import { useNotificationsStore } from "@/lib/store/stores/notifications";
import XpBottomNav from "@/components/organisms/BottomNav/XpBottomNav.vue";
import XpPowerTimerBar from "@/components/organisms/PowerTimers/XpPowerTimerBar.vue";
import XpFirstRunTour from "@/components/organisms/FirstRunTour/XpFirstRunTour.vue";
import XpGuide from "@/components/organisms/Guide/XpGuide.vue";
import { hasSeenTour } from "@/lib/services/tutorial/firstRunTour";
import { areaTabFor, isPartyRoute, navTabFor } from "./areaTab";

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
  components: { ...components, XpPortalPage, XpBottomNav, XpPowerTimerBar, XpFirstRunTour, XpGuide },
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
      return navTabFor(this.route, this.isUserProfileModalOpen);
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
    // The Area tab opens the equipment, or walks back to the remembered place when Party is open
    openAreaMenu() {
      if (isPartyRoute(this.route)) {
        this.router.push(this.compass.link);
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
    let stopReminderTaps: (() => void) | null = null;
    let stopApprovalWatch: (() => void) | null = null;
    onMounted(() => {
      if (!userId) return;
      void notificationsStore.load(String(userId));
      stopQuestWatch = startQuestWatch(String(userId));
      // A Game Master hears of claims waiting on their word (a hero's run finds nothing and stays quiet)
      stopApprovalWatch = startApprovalWatch(String(userId));
      // A tap on a phone reminder opens the quest it was about
      stopReminderTaps = startReminderTaps((link) => void router.push(link));
    });
    onBeforeUnmount(() => {
      stopQuestWatch?.();
      stopQuestWatch = null;
      stopReminderTaps?.();
      stopReminderTaps = null;
      stopApprovalWatch?.();
      stopApprovalWatch = null;
    });
    // The hero's hands: read from the profile, saved on every change (shared with the temples)
    const { equipment, leftHandItem, rightHandItem, setHandItem: clickItem } = useHeroEquipment(String(userId));

    const say = async (message: string, duration = 1800) => {
      const toast = await toastController.create({ message, duration, position: "top", cssClass: "rpg-toast" });
      await toast.present();
    };

    const isPegasusModalOpen = ref(false);
    const openPegasusModal = () => {
      isPegasusModalOpen.value = true;
      play$fx("openMenu");
    };
    const closePegasusModal = () => {
      isPegasusModalOpen.value = false;
    };

    const { specialItems } = useEquipmentItems({ onOpenPegasusModal: openPegasusModal });

    // Tapping an equipped item outside a temple: navigation items navigate, the Lantern lists the overdue quests,
    // and every other tool shows its card (its temple use, fight use and MP). Items bend no real chore: that is
    // the real-life Powers' job (docs/superpowers/specs/2026-10-13-equipment-rules-design.md, 1)
    const useHand = async (item: EquipmentItem | null) => {
      if (!item) return;
      play$fx("select");
      const live = specialItems.find((candidate: EquipmentItem) =>
        (item.faIcon && candidate.faIcon === item.faIcon) ||
        (item.name && candidate.name === item.name)
      );
      const liveClick = live?.click;
      if (liveClick) {
        liveClick.call(live);
        return;
      }
      const name = String(item.name ?? live?.name ?? "");
      if (!name) return;
      const isLantern = name === "Lantern";
      if (isLantern) {
        const result = await lanternOverdue(String(userId));
        play$fx(result.sound);
        return say(result.line, 2600);
      }
      return say(itemCardLine(name), 4000);
    };

    // The Guide speaks once the tour is over (or straight away for a hero who saw it before); the avatar menu reopens it
    const guide = ref<InstanceType<typeof XpGuide> | null>(null);
    const guideReady = ref(hasSeenTour(String(userId || "")));
    const openGuide = () => {
      guideReady.value = true;
      guide.value?.open();
    };

    const openParty = () => router.push(`/my-portal/${userId}/my-party`);

    // The Area tab: where the hero stands, or the last place they stood while Party or Profile is open
    // (on foot the overworld is the Plains: the first Pegasus unlocks it)
    const compass = computed(() => areaTabFor(route, canFly(user.value), String(userId || "")));

    const pageIcon = computed(() => route.meta.faIcon);
    const fabStyle = computed(() => gameStore.fabStyle);

    return {
      userId,
      clickItem,
      leftHandItem,
      rightHandItem,
      useHand,
      openParty,
      guide,
      guideReady,
      openGuide,
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

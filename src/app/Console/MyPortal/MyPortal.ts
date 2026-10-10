import { computed, defineComponent, reactive, onBeforeMount } from "vue";
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
      isPegasusModalOpen: false,  // Wind Whistle modal
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
    // The Area tab opens the equipment (what used to be the quick-draw FAB)
    openAreaMenu() {
      this.isRPGBoxOpen = true;
      this.play$fx('openMenu');
    },
    openPegasusModal() {
      this.isPegasusModalOpen = true;
      this.play$fx('openMenu');
    },
    closePegasusModal() {
      this.isPegasusModalOpen = false;
    },
    updateCompass(name) {
      const { userId } = this;
      const worlds = {
        "world-map": {
          name: "The World",
          icon: "pegasus",
          link: `/my-portal/${userId}/world-map`,
        },
        "home-town": {
          name: "Hometown",
          icon: "archway",
          link: `/my-portal/${userId}/home-town`,
        },
        "my-home": {
          name: "My Home",
          icon: "house-user",
          link: `/my-portal/${userId}/my-home`,
        },
        "world-plains": {
          name: "Plains",
          icon: "tornado",
          link: `/my-portal/${userId}/plains`,
        },
        "world-islands": {
          name: "Islands",
          icon: "island-tropical",
          link: `/my-portal/${userId}/islands`,
        },
        "world-forest": {
          name: "Forests",
          icon: "trees",
          link: `/my-portal/${userId}/forest`,
        },
        "world-swamps": {
          name: "Swamps",
          icon: "skull-crossbones",
          link: `/my-portal/${userId}/world-ice`,
        },
        "world-mountains": {
          name: "Mountains",
          icon: "mountains",
          link: `/my-portal/${userId}/mountains`,
        },
        "world-sands": {
          name: "Sands",
          icon: "cactus",
          link: `/my-portal/${userId}/desert`,
        },
        "world-ice": {
          name: "Tundras",
          icon: "igloo",
          link: `/my-portal/${userId}/world-ice`,
        },
        "world-clouds": {
          name: "Clouds",
          icon: "cloud",
          link: `/my-portal/${userId}/world-clouds`,
        },
        "the-moon": {
          name: "The Moon",
          icon: "moon",
          link: `/my-portal/${userId}/the-moon`,
        },
      };
      const world = worlds[name];
      if (world) this.compass = world;
    },

    stopImpersonating() {
      (this as any).userStore.stopImpersonating();
      this.play$fx("start");
      this.router.push({ name: "xp-dashboard" });
    },
  },
  created() {
    this.updateCompass(this.routeName);
  },
  watch: {
    routeName(name) {
      this.updateCompass(name);
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
      console.log('MyPortal: Checking user hydration...');
      if (!user.value) {
        await userStore.loadUsers();
        if (!user.value) {
          router.push({ name: 'xp-profile' });
        }
      }
    });
    // The hero's hands: read from the profile, saved on every change (shared with the temples)
    const { equipment, leftHandItem, rightHandItem, clickItem } = useHeroEquipment(String(userId));

    // Tapping an equipped item outside a temple: navigation items navigate, the rest wait for a temple or a fight
    const useHand = async (item: EquipmentItem | null) => {
      if (!item) return;
      play$fx("select");
      let live: EquipmentItem | undefined;
      try {
        live = useEquipmentItems().specialItems.find((candidate: EquipmentItem) => candidate.faIcon === item.faIcon);
      } catch {
        live = undefined;
      }
      if (live?.click) {
        live.click();
        return;
      }
      const toast = await toastController.create({
        message: `${item.name}: use it in a temple or a fight.`,
        duration: 1800,
        position: "top",
        cssClass: "rpg-toast",
      });
      await toast.present();
    };

    const openParty = () => router.push(`/my-portal/${userId}/my-party`);

    const compass = reactive({
      name: "Home",
      icon: "house-user",
      link: `/my-portal/${userId}/my-home`,
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

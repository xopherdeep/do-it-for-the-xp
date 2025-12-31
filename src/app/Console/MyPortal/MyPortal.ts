import { computed, defineComponent, reactive, ref, onBeforeMount } from "vue";
// import requireImg from "@/assets/js/requireImg";
import ionic from "@/lib/mixins/ionic";
import components from "./UserHud/components";
import XpPortalPage from "@/components/templates/pages/XpPortalPage.vue";
import "swiper/css";
import { modalController } from "@ionic/vue";

import { useItemFetcher } from "@/hooks/useItemFetcher";
import { useUserActions } from "@/hooks/useUserActions";

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
import { useGameStore } from "@/lib/store/stores/game";
import { useBattleStore } from "@/lib/store/stores/battle";

export default defineComponent({
  components: { ...components, XpPortalPage },
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
    resetBattleTimer() { return (this as any).battleStore.resetBattleTimer() },
    stopBattleTimer() { return (this as any).battleStore.stopBattleTimer() },
    loginUser(user: any) { return (this as any).userStore.loginUser(user) },
    ACTIVATE_BATTLE() { return (this as any).battleStore.setActive(true) },
    getUserAvatar(user) {
      // console.log(user.avatar);
      const avatar = `./${user.avatar}.svg`;
      // console.log(avatar);
      return this.$requireAvatar(avatar);
    },
    enterBattle() {
      // Type assertion for outlet ref
      const outlet = this.$refs?.outlet as { enterBattle: () => void } | undefined;
      outlet?.enterBattle();
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
    battleCounter(
      /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
      counter
    ) {
      /* eslint-disable @typescript-eslint/no-unused-vars */
      const {
        router,
        userId,
        ACTIVATE_BATTLE,
        stopBattleTimer,
        resetBattleTimer
      } = this;
      /* eslint-enable @typescript-eslint/no-unused-vars */

      // UNCOMMENT TO TURN ON BATTLES
      // if (counter <= 0) {
      //   // return false;
      //   this.play$fx("enterBattle");
      //   router
      //     .push({
      //       name: "battle-field",
      //       params: { userId },
      //     })
      //     .then(stopBattleTimer)
      //     .then(resetBattleTimer)
      //     .then(ACTIVATE_BATTLE);
      // }
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
          router.push('/switch-profile');
        }
      }
    });
    const equipment = ref<EquipmentItem[]>([]); // Use the defined interface
    const clickItem = (item: EquipmentItem | null, hand: string, index = 0) => {
      // If we're removing an item from a specific slot
      if (item === null && hand) {
        equipment.value = equipment.value.filter(
          (i) => !(i.hand === hand && i.slotIndex === index)
        );
        return;
      }

      // Item is not null at this point, so we can safely use it
      // First, check if this item is already equipped somewhere else
      const alreadyEquippedIndex = equipment.value.findIndex(
        (i) => i.faIcon === item?.faIcon
      );

      // If it's already equipped, remove it first
      if (alreadyEquippedIndex !== -1) {
        equipment.value.splice(alreadyEquippedIndex, 1);
      }

      // Check if there's already an item in the target slot
      const slotOccupiedIndex = equipment.value.findIndex(
        (i) => i.hand === hand && i.slotIndex === index
      );

      // If the slot is occupied, remove that item
      if (slotOccupiedIndex !== -1) {
        equipment.value.splice(slotOccupiedIndex, 1);
      }

      // Create a copy of the item with the click handler preserved
      const itemToEquip = { ...item, hand, slotIndex: index } as EquipmentItem;

      // Ensure the click handler is properly preserved
      // Functions don't get copied with spread operator, so we need to explicitly assign it
      if (item?.click && typeof item.click === "function") {
        itemToEquip.click = item.click;
      }

      // Add the new item
      equipment.value.push(itemToEquip);
    };

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
      actions,
      setUserActions,
      setActions,
    };
  },
});

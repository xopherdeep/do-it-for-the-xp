import { computed, defineComponent, reactive, ref } from "vue";
// import requireImg from "@/assets/js/requireImg";
import fetchItems from "@/mixins/fetchItems";
import ionic from "@/mixins/ionic";
import components from "./components";
import UserProfileModal from "./components/UserProfileModal.vue"; // Import the new component
import userActions from "@/mixins/userActions";
import "swiper/css";
import { modalController } from "@ionic/vue";

// import XpFabUserHud  from "./components/XpFabUserHud.vue"

import {
  sparklesOutline,
  calendar,
  peopleCircle,
  home,
  chatbox,
  wallet,
  personCircle,
  // const route = useRoute()
  fitnessOutline,
  storefrontOutline,
  medkitOutline,
  medalOutline,
  accessibilityOutline,
  colorWand,
  walletOutline,
} from "ionicons/icons";

import { mapActions, mapGetters, mapMutations, mapState, useStore } from "vuex";
import { useRoute, useRouter } from "vue-router";

export default defineComponent({
  components: { ...components, UserProfileModal }, // Register the new component
  mixins: [fetchItems, ionic, userActions],
  name: "my-portal",
  data() {
    return {
      debug: false,
      now: new Date(),
      battleInterval: null,
      isRPGBoxOpen: false,
      isUserProfileModalOpen: false, // Add state for the new modal
      currentTerrain: "plains",
      request: {
        type: "xp_achievement",
        per_page: 8,
      },
    };
  },

  computed: {
    ...mapGetters(["battleState", "getUserById"]),
    ...mapState(["theme", "bgm", "actions"]),
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
  },
  methods: {
    ...mapActions(["resetBattleTimer", "stopBattleTimer", "loginUser"]),
    ...mapMutations(["ACTIVATE_BATTLE"]),
    getUserAvatar(user) {
      // console.log(user.avatar);
      const avatar = `./${user.avatar}.svg`;
      // console.log(avatar);
      return this.$requireAvatar(avatar);
    },
    enterBattle() {
      this.$refs?.outlet?.enterBattle();
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
    closeUserProfileModal() { // Method to close the modal
      this.isUserProfileModalOpen = false;
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
          name: "Forest",
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
          name: "Desert",
          icon: "cactus",
          link: `/my-portal/${userId}/desert`,
        },
        "world-ice": {
          name: "Frozen Tundra",
          icon: "igloo",
          link: `/my-portal/${userId}/world-ice`,
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
  },
  created() {
    this.updateCompass(this.routeName);
  },
  watch: {
    routeName(name) {
      this.updateCompass(name);
    },
    battleCounter(counter) {
      const {
        router,
        userId,
        ACTIVATE_BATTLE,
        stopBattleTimer,
        resetBattleTimer,
      } = this;

      // UNCOMMENT TO TURN ON BATTLES
      // if (counter <= 0) {
      //   // return false;
      //   this.play$fx("enterBattle");
      //   router
      //     .push({
      //       name: "battle-ground",
      //       params: { userId },
      //     })
      //     .then(stopBattleTimer)
      //     .then(resetBattleTimer)
      //     .then(ACTIVATE_BATTLE);
      // }
    },
  },
  setup() {
    const store = useStore();
    const router = useRouter();
    const route = useRoute();
    const { userId } = route.params;
    const user = computed(() => store.getters.getUserById(userId));
    const equipment = ref([]);
    const clickItem = (item, hand, index = 0) => {
      // If we're removing an item from a specific slot
      if (item === null && hand) {
        equipment.value = equipment.value.filter(
          (i) => !(i.hand === hand && i.slotIndex === index)
        );
        return;
      }

      // First, check if this item is already equipped somewhere else
      const alreadyEquippedIndex = equipment.value.findIndex(
        (i) => i.faIcon === item.faIcon
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
      const itemToEquip = { ...item, hand, slotIndex: index };

      // Ensure the click handler is properly preserved
      // Functions don't get copied with spread operator, so we need to explicitly assign it
      if (item.click && typeof item.click === "function") {
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

    // Method to handle equipment updates from the modal
    const handleEquipmentUpdate = (updatedEquipment) => {
      equipment.value = updatedEquipment;
    };

    return {
      userId,
      clickItem,
      compass,
      pageIcon,
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
      sparklesOutline,
      storefrontOutline,
      user,
      wallet,
      walletOutline,
      handleEquipmentUpdate,
    };
  },
});

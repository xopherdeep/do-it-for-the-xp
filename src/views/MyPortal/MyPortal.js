import { computed, defineComponent, handleError, reactive, ref } from "vue";
// import requireImg from "@/assets/js/requireImg";
import fetchItems from "@/mixins/fetchItems";
import ionic from "@/mixins/ionic";
import userActions from "@/mixins/userActions";
import "swiper/css";
import { toastController, modalController } from "@ionic/vue";
import components from "./components"


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
  walletOutline
} from "ionicons/icons";

import { mapActions, mapGetters, mapMutations, mapState, useStore } from "vuex";
import { useRoute, useRouter } from "vue-router";

export default defineComponent({
  components,
  mixins: [fetchItems, ionic, userActions],
  name: "my-portal",
  data() {
    return {
      debug: false,
      now: new Date(),
      battleInterval: null,
      isRPGBoxOpen: false,
      currentTerrain: "plains",
      request: {
        type: "xp_achievement",
        per_page: 8,
      },
    };
  },

  computed: {
    ...mapGetters(["battleState"]),
    ...mapState(["theme", "bgm", "actions"]),
    battleCounter() {
      return this.battleState("steps").counter;
    },
    pageName() {
      return this.compass?.name;
    },
    isUserFabOn(){
      return !this.route.meta.hideUserFab 
    },
    pageLink(){
      return this.compass?.link
    },
    routeName(){
      return this.route.name
    },
  },
  methods: {
    ...mapActions(["resetBattleTimer", "stopBattleTimer"]),
    ...mapMutations(["ACTIVATE_BATTLE"]),
    getUserAvatar(user) {
      // console.log(user.avatar);
      const avatar = `./${user.avatar}.svg`;
      console.log(avatar);
      return this.$requireAvatar(avatar);
    },
    enterBattle() {
      this.$refs.outlet.enterBattle();
    },
    dismissRPGBox() {
      this.isRPGBoxOpen = false;
      modalController.dismiss();
    },
    closeModal() {
      this.dismissRPGBox()
    },
    updateCompass(name){
      const { user: {id: userId }} = this
      const worlds = {
        "world-map": {
          name: 'The World',
          icon: 'pegasus',
          link: `/my-portal/${userId}/world-map`
        },
        "home-town": {
          name: 'Hometown',
          icon: 'archway',
          link: `/my-portal/${userId}/home-town`
        },
        "my-home": {
          name: 'My Home',
          icon: 'house-user',
          link: `/my-portal/${userId}/my-home`
        },
        "world-plains": {
          name: 'Plains',
          icon: 'tornado',
          link: `/my-portal/${userId}/plains`
        },
        "world-islands": {
          name: 'Islands',
          icon: 'island-tropical',
          link: `/my-portal/${userId}/islands`
        },
        "world-forest": {
            name: 'Forest',
            icon: 'trees',
            link: `/my-portal/${userId}/forest`
        },
        "world-swamps": {
            name: 'Swamps',
            icon: 'skull-crossbones',
            link: `/my-portal/${userId}/world-ice`
        },
        "world-mountains": {
            name: 'Mountains',
            icon: 'mountains',
            link: `/my-portal/${userId}/mountains`
        },
        "world-sands": {
            name: 'Desert',
            icon: 'cactus',
            link: `/my-portal/${userId}/desert`
        },
        "world-ice": {
            name: 'Frozen Tundra',
            icon: 'igloo',
            link: `/my-portal/${userId}/world-ice`
        },
        "the-moon": {
            name: 'The Moon',
            icon: 'moon',
            link: `/my-portal/${userId}/the-moon`
        },
      } 
      const world = worlds[name]
      if(world)
        this.compass = world 
    }
  },
  created(){
    this.updateCompass(this.routeName)
  },
  watch: {
    routeName(name){
      this.updateCompass(name)
    },
    battleCounter(counter) {
      const {
        router,
        userId,
        ACTIVATE_BATTLE,
        stopBattleTimer,
        resetBattleTimer,
        theme,
        bgm: { $fx },
      } = this;
      const route = { name: "my-dashboard", props: { userId } };
      // UNCOMMENT TO TURN ON BATTLES
      // if (counter <= 0) {
      //   $fx.rpg[theme.rpg].enterBattle.play();
      //   router
      //     .push(route)
      //     .then(stopBattleTimer)
      //     .then(resetBattleTimer)
      //     .then(ACTIVATE_BATTLE);
      // }
    },
  },
  setup(props) {
    const store = useStore();
    const router = useRouter();
    const route = useRoute();
    const { userId } = route.params;
    const user = computed(() => store.getters.getUserById(userId));
    const equipment = ref([]);
    const clickItem = (item, hand) => {
      const existingItemIndex = equipment.value.findIndex((i) => i.icon === item.icon);

      if (existingItemIndex !== -1) {
        // If the item with the same hand already exists, update it
        equipment.value[existingItemIndex] = {...item, hand};
      } else {
        // Otherwise, add the new item
        equipment.value.push({...item, hand});
      }
    };

    const compass = reactive({
      name: 'Home',
      icon: 'house-user',
      link: `/my-portal/${userId}/my-home`
    })

    const pageIcon = computed( () => route.meta.faIcon )

    return {
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
    };
  },
});

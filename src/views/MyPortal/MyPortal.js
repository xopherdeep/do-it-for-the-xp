import { computed, defineComponent, handleError, reactive, ref } from "vue";
import requireImg from "@/assets/js/requireImg";
import fetchItems from "@/assets/js/mixins/fetchItems.js";
import ionic from "@/assets/js/mixins/ionic";
import userActions from "@/assets/js/mixins/userActions";
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
      info: {
        name: "Choose item...",
        faIcon: "question",
        desc: "Hover/Touch an item to learn more.",
      },
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
    displayInfo(item) {
      this.info = item;
    },
    changeBG() {
      //remove
    },
    closeModal() {
      modalController.dismiss();
    },
    didDismissRPGBox() {
      this.isRPGBoxOpen = false;
    },
    getUserAvatar(user) {
      // console.log(user.avatar);
      const avatar = `./${user.avatar}.svg`;
      console.log(avatar);
      return this.$requireAvatar(avatar);
    },
    enterBattle() {
      this.$refs.outlet.enterBattle();
    },
    updateCompass(name){
      const { user: {id: userId }} = this
      const worlds = {
        "world-map": {
          name: 'The World',
          icon: 'pegasus',
          link: `/my-portal/${userId}/world-map`
        },
        "the-city": {
          name: 'Hometown',
          icon: 'archway',
          link: `/my-portal/${userId}/the-city`
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
      if (counter <= 0) {
        $fx.rpg[theme.rpg].enterBattle.play();
        router
          .push(route)
          .then(stopBattleTimer)
          .then(resetBattleTimer)
          .then(ACTIVATE_BATTLE);
      }
    },
  },
  setup(props) {
    const store = useStore();
    const router = useRouter();
    const route = useRoute();
    const { userId } = route.params;
    const user = computed(() => store.getters.getUserById(userId));
    const equipment = ref([]);
    const clickItem = (item) => equipment.value.push(item);

    const clickAction = (action) => action.click() || null;

    const compass = reactive({
      name: 'Home',
      icon: 'house-user',
      link: `/my-portal/${userId}/my-home`
    })

    const pageIcon = computed( () => route.meta.faIcon )

    return {
      compass,
      pageIcon,
      accessibilityOutline,
      calendar,
      chatbox,
      clickAction,
      clickItem,
      colorWand,
      equipment,
      fitnessOutline,
      home,
      medalOutline,
      medkitOutline,
      peopleCircle,
      personCircle,
      requireImg,
      route,
      router,
      sparklesOutline,
      storefrontOutline,
      user,
      wallet,
      walletOutline,
      specialItems: [
        // {
        //   faIcon: "staff quest",
        //   name: "My Quests",
        //   desc: "5HP | Open My Quests...",
        //   click(){
        //     router.push({name: 'my-tasks', params: {userId}})
        //   }
        // },
        // {
        //   faIcon: "book-spells",
        //   name: "Book Of Spells",
        //   desc: "It does stuff...",
        //   click(){
        //     router.push({name: 'my-abilities', params: {userId}})
        //   }
        // },
        // {
        //   faIcon: "backpack",
        //   name: "Goods",
        //   desc: "Open currently held inventory.",
        //   click(){
        //     router.push({name: 'my-inventory', params: {userId}})
        //   }
        // },

        // {
        //   faIcon: "wallet",
        //   name: "Wallet",
        //   desc: "Open wallet to see GP earnings",
        //   click(){
        //     router.push({name: 'my-gold-points', params: {userId}})
        //   }
        // },
        {
          faIcon: "flame",
          name: "Sol's Flare",
          desc: "100MP | Set everything ablaze! All tasks take 100HP damage.",
        },
        {
          faIcon: "bolt",
          name: "Tesla's Bolt",
          desc: "100MP | Move like lightning for 1hr and take your turns instantly. Takes 2hr to recharge. ",
        },
        {
          faIcon: "wave-sine",
          name: "Gaia's Quake",
          desc: "100MP | Shuffle all tasks. Takes 24 Hour to recharge.",
        },
        {
          faIcon: "flux-capacitor",
          name: "Chronos' Clock",
          desc: "100MP | Pause time for 1hr... (wouldn't that make infinity?)",
        },
        {
          faIcon: "moon-stars",
          name: "Night's Light",
          desc: "100MP | Removes any bedtime curfew for the night. Takes 3 days to recharge",
        },
        // {
        //   faIcon: 'waveform',
        //   name: 'Satori\'s Vibe',
        //   desc: 'It does stuff...'
        // },
        {
          faIcon: "wind",
          name: "Gale's Wind",
          desc: "300MP | Blow off all chores for the next 24 hours. Takes 7days to recharge.",
        },
        {
          faIcon: "shield-virus",
          name: "Yve's Shield",
          desc: "300MP | Protects against all attacks for the next 24 hours. Takes 2days to recharge.",
        },
        {
          faIcon: "hat-wizard",
          name: "X's Invisibility",
          desc: "300MP | Avoid random encounters for the next 24 hours. Takes 2 days to recharge.",
        },
        {
          faIcon: "wand-magic fire",
          name: "Fire Wand",
          desc: "It does stuff...",
        },
        {
          faIcon: "wand-magic ice",
          name: "Ice Wand",
          desc: "It does stuff...",
        },
        {
          faIcon: "staff fire",
          name: "",
          desc: "It does stuff...",
        },
        {
          faIcon: "bow-arrow",
          name: "Silver Arrow",
          desc: "25MP | Immediately removes task from battle",
        },
        {
          faIcon: "expand-alt",
          name: "Hook Shot",
          desc: "It does stuff...",
        },
        {
          faIcon: "bomb",
          name: "Bombs",
          desc: "It does stuff...",
        },
        {
          faIcon: "hammer-war",
          name: "Thor's Hammer",
          desc: "It does stuff...",
        },
        {
          faIcon: "flashlight",
          name: "Lantern",
          desc: "It does stuff...",
        },
        {
          faIcon: "flask-potion",
          name: "Bottles",
          desc: "Quick access to your potions and ethers",
        },
        {
          name: "Portal Home",
          faIcon: "portal-enter",
          desc: "10MP | Open portal to go directly home. Takes 15min to recharge.",
          click($ev){
            router.push({name: 'my-home', params: {userId}})
          }
        },
      ],
    };
  },
});

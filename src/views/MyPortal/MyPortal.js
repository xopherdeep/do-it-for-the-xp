import { computed, defineComponent, handleError, ref } from "vue";
import requireImg from "@/assets/js/requireImg";
import fetchItems from "@/assets/js/mixins/fetchItems.js";
import ionic from "@/assets/js/mixins/ionic";
import userActions from "@/assets/js/mixins/userActions";
import CardUserStats from "@/views/CardUserStats/CardUserStats.vue";
import { Swiper, SwiperSlide } from "swiper/vue";
import "swiper/css";
import { toastController, modalController } from "@ionic/vue";

import {
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
} from "ionicons/icons";

import { mapActions, mapGetters, mapMutations, mapState, useStore } from "vuex";
import { useRoute, useRouter } from "vue-router";

export default defineComponent({
  name: "my-portal",
  mixins: [fetchItems, ionic, userActions],
  components: {
    Swiper,
    SwiperSlide,
    CardUserStats,
  },
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
      compass: {
        name: 'Home',
        icon: 'house-user',
        link: `/my-portal/`
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
      return this.compass.name;
    },
    pageIcon(){
      return this.route.meta.faIcon
    },
    isUserFabOn(){
      return !this.route.meta.hideUserFab 
    },
    pageLink(){
      return this.compass.link
    }
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
    updateNav(icon){
      switch (icon) {
        case 'pegasus':
          this.compass = {
            icon,
            name: 'The World',
            link: `/my-portal/${this.user.id}/world-map`
          }
          break;
        case 'archway':
          this.compass = {
            icon,
            name: 'Hometown',
            link: `/my-portal/${this.user.id}/the-city`
          }
          break;
      
        case 'house-user':
          this.compass = {
            ...this.compass,
            link: `/my-portal/${this.user.id}/my-home`
          }
      }
      console.log(this.compass);
    }

  },
  created(){
    this.updateNav()
  },
  watch: {
    pageIcon(icon){
      this.updateNav(icon)
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
        // $fx.rpg[theme.rpg].enterBattle.play();
        // router
        //   .push(route)
        //   .then(stopBattleTimer)
        //   .then(resetBattleTimer)
        //   .then(ACTIVATE_BATTLE);
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

    return {
      clickItem,
      equipment,
      clickAction,
      route,
      router,
      user,
      accessibilityOutline,
      calendar,
      medalOutline,
      fitnessOutline,
      home,
      peopleCircle,
      personCircle,
      requireImg,
      storefrontOutline,
      medkitOutline,
      chatbox,
      wallet,
      specialItems: [
        // {
        //   faIcon: "staff quest",
        //   name: "Quest Log",
        //   desc: "5HP | Open Quest Log...",
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
      staticActions: [
        {
          label: "Talk",
          id: "talk-to",
          faIcon: "comment",
        },
        {
          label: "Notifications",
          id: "notifications",
          faIcon: "bell-exclamation",
        },
        {
          id: "abilities",
          label: "My Abilities",
          faIcon: "book-spells",
          click($ev) {
            router.push({ name: "my-abilities", params: { userId } });
          },
        },
        {
          label: "Quest Log",
          id: "staff",
          faIcon: "medal quest",
          click(){
            router.push({name: 'my-tasks', params: {userId}})
          }
        },
        {
          label: "My Items",
          id: "my-inventory",
          faIcon: "backpack",
          click($ev) {
            router.push({ name: "my-inventory", params: { userId } });
          },
        },
        {
          label: "Stats",
          id: "user-profile",
          faIcon: "hand-holding-seedling",
        },
        {
          label: "My Wallet",
          id: "wallet",
          faIcon: "wallet",
          click(){
            router.push({name: 'my-gold-points', params: {userId}})
          }
        },
        {
          label: "Save & Quit",
          id: 'save-quit',
          faIcon: "save",
        },
        // {
        //   label: "Inventory Screen",
        //   id: "toolbox",
        //   faIcon: "compass",
        //   // link: 'storage',
        //   click($ev) {
        //     this.isRPGBoxOpen = true;
        //   },
        // },
        // {
        //   label: "Gold Points",
        //   id: "gold-points",
        //   faIcon: "hand-holding-usd",
        //   click($ev) {
        //     router.push({ name: "my-gold-points", params: { userId } });
        //     // console.log($ev.preventDefault());
        //   },
        // },
        // {
        //   label: "Settings",
        //   id: "settings",
        //   faIcon: "cogs",
        // },
      ],
    };
  },
});

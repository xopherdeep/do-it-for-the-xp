import { BackgroundLayer, Engine } from "earthbound-battle-backgrounds";
import { computed, ref, onMounted, reactive } from "vue";
import { mapGetters, mapState, useStore } from "vuex";
import { useRouter } from "vue-router";
import alienMonster from "@/assets/fonts/font-awesome/svgs/duotone/medal.svg";
import backgrounds from "../../assets/backgrounds/parallax/index";
import CardUserStats from "@/views/CardUserStats/CardUserStats.vue";
import fetchItems from "@/assets/js/mixins/fetchItems.js";
import ionic from "@/assets/js/mixins/ionic"
import MyTask from "@/views/MyTask/MyTask.vue";
import requireImg from "@/assets/js/requireImg.js";
import users from "@/assets/js/users.js";
import userActions from "@/assets/js/mixins/userActions";

import {
  toastController,
  modalController,
} from "@ionic/vue";
import {
  today,
  calendarNumber,
  calendar,
  hourglass,
  calendarClear,
  time,
  heart,
  colorWand,
  card,
  server,
  sparkles,
  medal,
  personCircle,
  camera,
  bookmark,
  diceOutline,
  colorWandOutline,
  medalOutline,
  bagOutline,
  accessibilityOutline,
  chevronBack,
  fitnessOutline,
  sparklesOutline,
  infinite,
  happyOutline,
  serverOutline,
  arrowBack,
} from "ionicons/icons";

import { Swiper, SwiperSlide, useSwiper } from "swiper/vue";
import "swiper/css";

const requireAvatar = require.context("@/assets/images/avatars/");

export default {
  name: "my-dashboard",
  props: {
    userId: {
      default: 1,
    },
  },
  mixins: [fetchItems, ionic, userActions],
  components: {
    CardUserStats,
    MyTask,
    Swiper,
    SwiperSlide,
  },
  data() {
    return {
      // bgm: new Audio("https://smashcustommusic.net/wav/45266"),

      areas: {
        physical: {
          open: true,
          color: "danger",
          icon: fitnessOutline,
          stats: {
            strength: "Use less HP when completing a task",
            defense: "Influences max HP",
            endurance: "Influences HP restore rate",
          },
        },
        mental: {
          open: false,
          color: "tertiary",
          icon: colorWand,
          stats: {
            intelligence: "Use less MP when casting abilities",
            perception: "Influences max MP",
            wisdom: "Influences MP restore rate",
          },
        },
        social: {
          color: "warning",
          icon: serverOutline,
          stats: {
            charisma: "Gain more GP when completing tasks",
            charm: "Influences GP discounts on items",
            presence: "Influences GP to $ conversion rate",
          },
        },
        misc: {
          color: "success",
          icon: sparklesOutline,
          stats: {
            agility: "Gain more AP when completing tasks",
            guts: "Gain more XP when completing tasks",
            luck: "Influence chances of receiving bonus points",
          },
        },
      },
      swiper: null,
      users,
      isUserModalOpen: false,
      initialBreakpoint: 0.1,
      activeModal: 0,
      toggleBGDirection: 0,
      currentBG: 0,
      icons: {
        medal,
        server,
        sparkles,
        card,
        today,
        calendar,
        calendarNumber,
        hourglass,
        calendarClear,
        time,
        heart,
        colorWand,
      },
      dashboardItems: {
        achievements: {},
        abilities: {},
        accessories: {},
        badges: {},
        gold: {},
        alerts: {},
      },
    };
  },
  computed: {
    ...mapState(["xp_achievement"]),

  },
  mounted() {
    this.changeBG();
    this.$fx.ui[this.$fx.theme.ui].chooseUser.play();
    this.openToast();
    this.enterBattle();
    setTimeout(() => {
      this.$fx.ui[this.$fx.theme.ui].chooseUser.pause();
      this.isUserModalOpen = this.user.id;
      // this.$refs.page.el.style.backgroundPosition = "0 100%, 0 100%";
    }, 1250);
  },
  watch: {
    activeModal(taskId) {
      const task = this.items.filter((i) => i.id == taskId)[0];
      this.openTaskToast(task);
    },
    bgmTrack() {
      this.bgm.pause();
      this.loadBGM();
      this.enterBattle();

      this.bgm.load();
      this.bgm.play();
    },
  },
  methods: {

    onSwiper(swiper) {
      this.swiper = swiper;
    },

    handleSlideTo() {
      // this.swiper.slideTo(1);
    },
    clickStats() {
      this.swiper.slideTo(1);
    },
    closeModal() {
      modalController.dismiss();
    },
    setBGStyle(key, value) {
      this.$refs.page.$el.style[key] = value;
    },
    changeBG() {
      if (this.$fx.theme.rpg == "earthbound") {
        this.enterBattle();
        return false;
      }
      const { setBGStyle } = this;
      this.currentBG = Math.floor(Math.random() * 10);
      const values = Object.values(backgrounds);
      let prop = false;
      while (prop == false) {
        prop = Math.floor(Math.random() * values.length);
        prop = prop == this.currentBG ? false : values[prop];
      }
      setBGStyle("backdropFilter", "blur(10px)");
      setBGStyle(
        "background",
        ` 
        url("${prop[0]}"),
        url("${prop[1]}")
      `
      );
      setBGStyle("backgroundSize", `cover`);
      this.toggleBGDirection = !this.toggleBGDirection;

      if (this.toggleBGDirection)
        setBGStyle("backgroundPosition", `right center, left center`);
      else setBGStyle("backgroundPosition", `left center, right center`);

      setTimeout(() => setBGStyle("backdropFilter", "blur(0px)"), 3000);
    },
    enterBattle() {
      if (this.$fx.theme.rpg != "earthbound") return false;

      const bg1 = Math.floor(Math.random() * 326);
      const bg2 = Math.floor(Math.random() * 326);
      /* Create two layers */
      const layer1 = new BackgroundLayer(bg1);
      const layer2 = new BackgroundLayer(bg2);
      /* Create animation engine  */
      const engine = new Engine([layer1, layer2], {
        aspectRatio: 48,
        canvas: document.querySelector("canvas.battle-bg"),
      });
      engine.animate();
    },
    clickBGMTrack(inc = 1) {
      const length = this.$fx.rpg[this.$fx.theme.rpg].bgm.length;
      const next = this.bgmTrack + inc;
      this.bgmTrack = next == length - 1 ? 0 : next < 0 ? length - 1 : next;
    },
    clickTask(task) {
      this.activeModal = task.id;
    },
    clickUserChip(user) {
      this.isUserModalOpen = user.id;
      this.initialBreakpoint = 0.55;
    },
    didDismissUserModal() {
      this.isUserModalOpen = false;
    },
    willPresent() {
      this.$fx.ui[this.$fx.theme.ui].chooseUser.currentTime = 1.25;
      this.$fx.ui[this.$fx.theme.ui].chooseUser.play();
    },
    // clickAction(action){
    //   const user = this.user;
    //   this.$fx.ui[this.$fx.theme.ui].openPage.play()
    //   this.router.push(`/${action}/${user.id}/`);
    // },
    getUserAvatar(user) {
      const avatar = `./${user.avatar}.svg`;
      return requireAvatar(avatar);
    },
    segmentChanged(ev) {
      console.log("Segment changed", ev);
    },

    async openToast() {
      const toast = await toastController.create({
        message: `${this.user.name.nick} has entered the battle!`,
        cssClass: this.$fx.theme.rpg,
        position: "top",
        duration: 2800,
      });
      const numAchievements = Object.keys(this.xp_achievement).length;
      // alert(numAchievements)
      if (numAchievements == 0) setTimeout(this.openToastOptions, 3200);
      return toast.present();
    },
    async openToastOptions() {
      const toast = await toastController.create({
        header: "It's pretty quiet",
        cssClass: this.$fx.theme.rpg,
        message: "You should search for some quests!",
        icon: alienMonster,
        position: "top",
        buttons: [
          {
            icon: alienMonster,
            text: "Load Quests",
            color: "light",
            cssClass: this.$fx.theme.rpg,
            handler: () => {
              this.request.type = "xp_achievement";
              this.getItems();
            },
          },
          // {
          //   text: "No Thanks",
          //   role: "cancel",
          //   handler: () => {
          //     console.log("Cancel clicked");
          //   },
          // },
        ],
      });
      await toast.present();

      const { role } = await toast.onDidDismiss();
      console.log("onDidDismiss resolved with role", role);
    },
    async openMagicToast(magic) {
      const { nick } = this.user.name;
      const toast = await toastController.create({
        header: `${nick} Casts ${magic}...`,
        message: `becomes slower`,
        cssClass: this.$fx.theme.rpg,
        position: "top",
        duration: 3200,
      });
      return toast.present();
    },

    async openTaskToast(task) {
      const { nick } = this.user.name;
      if (task) {
        const toast = await toastController.create({
          header: `${nick} looks at ${task.title.rendered}...`,
          message: `...hmm, what now?`,
          cssClass: this.$fx.theme.rpg,
          position: "top",
          duration: 3200,
        });
        return toast.present();
      }
    },
  },
  ionViewDidEnter(){
    this.setUserActions(this.userActions)
  },
  
  setup(props) {
    const store = useStore();
    const router = useRouter();
    // const mySwiper = useSwiper();

    const slideOpts = {
      initialSlide: 1,
      speed: 400,
    };
    console.log(props.userId);
    const user = computed(() => store.getters.getUserById(props.userId));
    const xp_achievement = computed(() => store.state.xp_achievement);
    console.log(store.state.users);

    async function clickRoll($ev){
      let newActions = []
      Object.values(xp_achievement.value).forEach( item => {
        newActions[item.id] = {
          label: item.title.rendered,
          id: item.id,
          click(){
            // this.rollId(item.id)
            // this.setUserActions()
            store.dispatch('setUserActions', userActions)
          }
        }
      });

      store.dispatch('setUserActions', newActions)
        // const toast = await toastController.create({
        //   header: `${user.value.name.nick} throws their die...`,
        //   message: `...hmm, what now?`,
        //   position: "top",
        //   duration: 3200,
        // });
        // toast.present();

      // console.log("new actions",newActions);
      $ev.stopPropagation();
    //
    }

    const userActions = [
        {
          label: "Roll",
          faIcon: "dice-d8",
          click: clickRoll
        },
        {
          label: "Goods",
          faIcon: "backpack",
        },
        {
          label: "Abilities",
          faIcon: "hand-holding-magic",
        },
        {
          label: "Defend",
          faIcon: "shield",
        },
        {
          label: "Run Away",
          faIcon: "running",
        },
      ]


    return {
      // mySwiper,
      user,
      accessibilityOutline,
      router,
      slideOpts,
      calendar,
      personCircle,
      requireImg,
      camera,
      bookmark,
      colorWandOutline,
      medalOutline,
      bagOutline,
      diceOutline,
      userActions,
      xp_achievement,
      chevronBack,
      fitnessOutline,
      sparklesOutline,
      infinite,
      happyOutline,
      serverOutline,
      arrowBack,
    };
  },
};

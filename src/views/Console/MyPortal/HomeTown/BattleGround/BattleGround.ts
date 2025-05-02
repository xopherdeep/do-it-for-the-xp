import { defineComponent, computed } from "vue";
import { mapState, useStore } from "vuex";
import { useRouter } from "vue-router";
import { backgroundManager } from "@/lib/engine/core/BackgroundManager";
import backgrounds from "@/assets/images/backgrounds/parallax/index";
import CardUserStats from "@/components/CardUserStats/CardUserStats.vue";
import fetchItems from "@/mixins/fetchItems";
import ionic from "@/mixins/ionic";
import MyTask from "@/views/Console/MyDialogBox/MyTask/MyTask.vue";
// import requireImg from "@/assets/js/requireImg.js";
import users from "@/lib/api/users.api";
import userActions from "@/mixins/userActions";
import XpFabBattleActions from "@/views/Console/MyPortal/components/XpFabBattleActions.vue";

// Define a unique ID for this page for background management
const PAGE_ID = 'battle-ground';

import { toastController, modalController } from "@ionic/vue";
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

import { Swiper, SwiperSlide } from "swiper/vue";
import "swiper/css";
import XpHpMpHud from "@/components/XpHpMpHud/XpHpMpHud.vue";

const requireAvatar = require.context("@/assets/images/avatars/");

export default defineComponent({
  name: "battle-ground",
  props: ["userId"],
  mixins: [fetchItems, ionic, userActions],
  components: {
    CardUserStats,
    MyTask,
    Swiper,
    SwiperSlide,
    XpHpMpHud,
    XpFabBattleActions,
  },
  data() {
    return {
      currentBg: 0,
      backgrounds,
      bg1: 1,
      bg2: 1,

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
      users,
      isUserModalOpen: false,
      initialBreakpoint: 0.1,
      activeModal: 0,
      toggleBGDirection: false,
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
  methods: {
    onSwiper() {
      // this.swiper = swiper;
    },
    handleBattleAction({ action }) {
      // Handle different battle actions based on the action type
      switch(action) {
        case 'attack':
          // Handle attack action
          this.$fx.ui[this.$fx.theme.ui].confirm.play();
          this.openMagicToast('Attack');
          // You might want to set active enemy, calculate damage, etc.
          break;
        case 'goods':
          // Open goods/inventory menu
          this.$fx.ui[this.$fx.theme.ui].openPage.play();
          this.router.push({
            name: "my-inventory",
            params: { userId: this.userId },
          });
          break;
        case 'abilities':
          // Open abilities menu
          this.$fx.ui[this.$fx.theme.ui].openPage.play();
          this.router.push({
            name: "my-abilities",
            params: { userId: this.userId },
          });
          break;
        case 'defend':
          // Handle defend action
          this.$fx.ui[this.$fx.theme.ui].confirm.play();
          this.openMagicToast('Defense');
          // You might want to increase defense for next turn
          break;
        case 'run':
          // Handle run away action
          this.$fx.ui[this.$fx.theme.ui].cancel.play();
          // Maybe show a confirmation dialog before actually running away
          setTimeout(() => {
            this.router.push({
              name: "hometown",
              params: { userId: this.userId },
            });
          }, 1500);
          break;
        default:
          console.warn(`Unhandled battle action: ${action}`);
      }
    },
    getBattleActionIcon(label) {
      switch(label.toLowerCase()) {
        case 'roll': return diceOutline;
        case 'attack': return 'sword-outline';
        case 'goods': return bagOutline;
        case 'abilities': return colorWandOutline;
        case 'defend': return 'shield-outline';
        case 'run away': return 'walk-outline';
        default: return 'help-outline';
      }
    },
    getBattleActionColor(label) {
      switch(label.toLowerCase()) {
        case 'roll': return 'primary';
        case 'goods': return 'success';
        case 'abilities': return 'tertiary';
        case 'defend': return 'warning';
        case 'run away': return 'danger';
        default: return 'medium';
      }
    },
    handleSlideTo() {
      // this.swiper.slideTo(1);
    },
    clickStats() {
      // this.swiper.slideTo(1);
    },
    closeModal() {
      modalController.dismiss();
    },
    setBGStyle(key: string, value: string) {
      // Add safety check to prevent errors when this.$refs.page is undefined
      const pageRef = this.$refs.page as { $el?: { style: Record<string, string> } } | undefined;
      if (pageRef && pageRef.$el) {
        pageRef.$el.style[key] = value;
      } else {
        // Fall back to using document.body when in development environment
        const element = document.querySelector('.battle-bg') as HTMLElement;
        if (element) {
          element.style[key as any] = value;
        }
      }
    },
    changeBg() {
      if (this.$fx.theme.rpg == "earthbound") {
        this.enterBattle();
        return false;
      }
      
      // Check if we're even able to set bg styles
      if (!this.$refs.page && !document.querySelector('.battle-bg')) {
        console.warn('No suitable element found to set background styles');
        this.enterBattle(); // Just try to enter battle directly
        return;
      }
      
      const { setBGStyle, backgrounds } = this;
      this.currentBg = Math.floor(Math.random() * 10);
      const values = Object.values(backgrounds);
      let prop = {};
      while (!prop) {
        const rand = Math.floor(Math.random() * values.length);
        prop = prop == this.currentBg ? {} : values[rand] || {};
      }
      setBGStyle("backdropFilter", "blur(5px)");
      setBGStyle(
        "background", 
        `linear-gradient(0deg, rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url(${prop})`
      );
      setBGStyle("backgroundSize", "cover");
      this.toggleBGDirection = !this.toggleBGDirection;

      if (this.toggleBGDirection)
        setBGStyle("backgroundPosition", "0 100%, 0 100%");
      else
        setBGStyle("backgroundPosition", "0 0%, 0 0%");

      setTimeout(() => setBGStyle("backdropFilter", "blur(0px)"), 3000);
    },
    enterBattle() {
      const { $fx } = this;
      // First check if we should be using the Earthbound background
      if ($fx && $fx.theme.rpg != "earthbound") {
        return false;
      }
      
      // Clean up previous background if active
      if (backgroundManager.isActiveFor(PAGE_ID)) {
        backgroundManager.cleanupBackground();
      }

      // Get the canvas element using the ref
      const canvasElement = this.$refs.battleBackground as HTMLCanvasElement;
      
      if (!canvasElement) {
        // Try with querySelector as fallback
        const canvasSelector = "canvas.battle-bg";
        
        backgroundManager.initBackground({
          canvasSelector,
          bg1: this.bg1,
          bg2: this.bg2,
          aspectRatio: 48, // More common aspect ratio value
          handleResize: true,
          page: PAGE_ID
        });
      } else {
        // Use the direct canvas element reference
        backgroundManager.initBackground({
          canvasElement,
          bg1: this.bg1,
          bg2: this.bg2, 
          aspectRatio: 48, // More common aspect ratio value
          handleResize: true,
          page: PAGE_ID
        });
      }
      
      return true;
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
    //   this.router.push(`/${action}/${userId}/`);
    // },
    getUserAvatar(user) {
      const avatar = `./${user.avatar}.svg`;
      return requireAvatar(avatar);
    },
    segmentChanged() {
      // console.log("Segment changed", ev);
    },

    async openToast() {
      const { user } = this;

      const toast = await toastController.create({
        message: `${user?.name?.nick} has entered the battle!`,
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
        // icon: alienMonster,
        position: "top",
        buttons: [
          {
            // icon: alienMonster,
            text: "Load Quests",
            // color: "light",
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
          //     // console.log("Cancel clicked");
          //   },
          // },
        ],
      });
      // await toast.present();

      await toast.onDidDismiss();
      // console.log("onDidDismiss resolved with role", role);
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
  mounted() {
    this.changeBg();
    this.$fx.ui[this.$fx.theme.ui].chooseUser.play();
    this.openToast();
    this.enterBattle();
    setTimeout(() => {
      this.$fx.ui[this.$fx.theme.ui].chooseUser.pause();
      this.isUserModalOpen = this.userId;
    }, 1250);
  },
  unmounted() {
    backgroundManager.cleanupBackground();
  },
  watch: {
    activeModal(taskId) {
      const task = this.items.filter((i) => i.id == taskId)[0];
      this.openTaskToast(task);
    },
    // bgmTrack() {
    //   this.bgm.pause();
    //   this.loadBGM();
    //   this.enterBattle();

    //   this.bgm.load();
    //   this.bgm.play();
    // },
  },
  ionViewDidEnter() {
    this.setUserActions(this.userActions);
  },

  setup(props) {
    const store = useStore();
    const router = useRouter();
    // const { userId } = props;

    const slideOpts = {
      initialSlide: 1,
      speed: 400,
    };

    const user = computed(() => store.getters.getUserById(props.userId));
    const xp_achievement = computed(() => store.state.xp_achievement);

    async function clickRoll($ev) {
      // const counter = 0; // Possible unused variable from error message
      // const ACTIVATE_BATTLE = () => {}; // Possible unused variable from error message
      // const stopBattleTimer = () => {}; // Possible unused variable from error message 
      // const resetBattleTimer = () => {}; // Possible unused
      
      const newActions = [] as UserAction[];
      Object.values(xp_achievement.value).forEach((item: any) => {
        newActions[item.id] = {
          label: item.title.rendered,
          id: item.id,
          click() {
            // this.rollId(item.id)
            // this.setUserActions()
            store.dispatch("setUserActions", userActions);
          },
        };
      });

      store.dispatch("setUserActions", newActions);
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
        label: "Attack",
        faIcon: "sword",
        click: clickRoll, // Keeping the same handler for now
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
    ];

    return {
      user,
      accessibilityOutline,
      router,
      slideOpts,
      calendar,
      personCircle,
      // requireImg,
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
});


interface UserAction {
  label: string
  id: string
  click: () => void
}
import { defineComponent, ref } from "vue";
import ionic from "@/assets/js/mixins/ionic"
import { IonicSlides, modalController } from "@ionic/vue";
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonMenuButton,
  IonTitle,
  IonContent,
  IonBackdrop,
  alertController,
  IonSegment,
  IonSegmentButton,
  toastController,
  createAnimation,
} from "@ionic/vue";

import { Swiper, SwiperSlide } from "swiper/vue";
 // Import Swiper styles
import 'swiper/css';

/* eslint-disable */
// eslint-disable-next-line to

// import rabbitFast from "@/assets/fonts/font-awesome/svgs/duotone/rabbit-fast.svg";
// import comment from "@/assets/fonts/font-awesome/svgs/duotone/comment.svg";
// import wandMagic from "@/assets/fonts/font-awesome/svgs/duotone/wand-magic.svg";
// import sack from "@/assets/fonts/font-awesome/svgs/duotone/sack.svg";

import { NativeAudio } from "@awesome-cordova-plugins/native-audio";
import CardUserStats from "@/components/CardUserStats/CardUserStats.vue";
import fetchItems from "@/mixins/fetchItems";
import AnimatedNumber from "@/components/AnimatedNumber.vue";
import { mapActions } from "vuex";
import { useRouter } from "vue-router";
import { Controller, Navigation } from "swiper";

export default defineComponent({
  props: ["taskId", "item"],
  name: "my-task",
  components: {
    alertController,
    AnimatedNumber,
    CardUserStats,
    IonBackdrop,
    IonButtons,
    IonContent,
    IonHeader,
    IonMenuButton,
    IonPage,
    IonSegment,
    IonSegmentButton,
    IonTitle,
    IonToolbar,
    Swiper,
    SwiperSlide,
  },
  data() {
    return {
      debug: false,
      nativeAudio: NativeAudio,
      isOpen: false,
      // slider: IonSlides,
      userMenuActive: false,
      itemsDropped: [
        {
          label: "Potion",
          quantity: 2,
        },
      ],
      itemsLooted: [],
      segment: 0,
      request: {
        type: "xp_achievement",
        params: {
          page: 1,
          search: "",
          per_page: 4,
        },
      },

      temp: {
        gp: {
          wallet: 0,
          gained: 0,
        },
      },
    };
  },
  created() {
    this.temp.gp.wallet = this.user.stats.gp.wallet;
  },
  computed: {
    // item(){
    //   const { taskId: id } = this
    //   return this.singleById({ type: "xp_achievement", id })
    // }
    gpBar() {
      const { gp } = this.user.stats;
      return this.temp.gp.wallet / gp.limit;
    },
  },
  methods: {
    ...mapActions(["leaveBattle"]),
    addUpGP() {
      this.temp.gp.wallet = this.user.stats.gp.wallet;
      this.$fx.rpg[this.$fx.theme.rpg].countCoins.play();
      setTimeout(() => {
        this.$fx.rpg[this.$fx.theme.rpg].countCoins.pause();
      }, 4000);
      this.startCounting();
      this.temp.gp.wallet += 100;
      this.temp.gp.gained = this.temp.gp.wallet;
      // this.$store.dispatch("addToWallet", 100 )
    },
    startCounting() {
      if(this.$refs.length){
        // this.$refs.countXPGained.start();
        // this.$refs.countAPGained.start();
        // this.$refs.countGPGained.start();
        // this.$refs.countWallet.start();
      }
    },
    finishedCounting() {
      // alert()
      this.$fx.rpg[this.$fx.theme.rpg].countCoins.pause();
      this.$fx.rpg[this.$fx.theme.rpg].fillPoints.pause();
      this.$fx.rpg[this.$fx.theme.rpg].fillPoints.currentTime = 0;
    },
    didPresent() {
      setTimeout(() => (this.userMenuActive = true), 500);
    },
    willPresent() {
      this.$fx.ui[this.$fx.theme.ui].openTask.play();
    },
    willDismiss() {
      this.$fx.ui[this.$fx.theme.ui].closeTask.play();
    },
    focusUserMenu() {
      this.$fx.ui[this.$fx.theme.ui].select.play();
    },
    getItemLabel(item) {
      return `${item.quantity.toString()}x ${item.label}`;
    },
    filterList(list, item) {
      this[list] =  this[list] 
        ? this[list].filter((i) => i.label != item.label) 
        : [];
    },
    slideLootItem(item) {
      this.$fx.rpg[this.$fx.theme.rpg].lootItem.play();
      this.itemsLooted.push(item);
      this.filterList("itemsDropped", item);
    },
    slideDropItem(item) {
      this.$fx.rpg[this.$fx.theme.rpg].dropItem.play();
      this.itemsDropped.push(item);
      this.filterList("itemsLooted", item);
    },
    clickDropAll() {
      this.$fx.rpg[this.$fx.theme.rpg].dropItem.play();
      this.itemsDropped = this.itemsLooted;
      this.itemsLooted = [];
    },
    clickLootAll() {
      this.$fx.rpg[this.$fx.theme.rpg].lootItem.play();
      this.itemsLooted = this.itemsDropped;
      this.itemsDropped = [];
    },
    clickLoot() {
      this.$fx.ui[this.$fx.theme.ui].select.play();
      this.$fx.rpg[this.$fx.theme.rpg].loot.play();
      this.controlledSwiper.slideNext();
    },

    async segmentChanged(ev) {
      console.log(ev);
      this.segment = ev.detail.value;

      await this.$refs.slides.slideTo(this.segment);
    },

    async slideChanged() {
      this.segment = await this.$refs.slides.getActiveIndex();
    },
    getUserAvatar(user) {
      if (user.avatar) {
        const avatar = `./avatars/${user.avatar}.svg`;
        return this.$requireImg(avatar);
      }
    },
    async clickMagic() {
      const alert = await alertController.create({
        cssClass: "my-custom-class",
        header: "Magic & Abilities",
        inputs: [
          {
            label: "Slow",
            type: "radio",
          },
          {
            label: "Slowga",
          },
          {
            label: "Slowga",
          },
          {
            label: "Bribe",
          },
        ],
        buttons: [
          {
            text: "Cancel",
            role: "cancel",
            cssClass: "secondary",
            handler: () => {
              this.$fx.ui[this.$fx.theme.ui].no.play();
              console.log("Confirm Cancel");
            },
          },
          {
            text: "Cast",
            handler: (value) => {
              this.$fx.rpg[this.$fx.theme.rpg].useMP.play();
              this.$fx.ui[this.$fx.theme.ui].yes.play();
              console.log(value);

              this.createToast({
                header: `${this.user.name.nick} uses a spell...`,
                message: "Ha! Take that",
                // icon: wandMagic,
              });
            },
          },
        ],
      });
      alert.addEventListener("click", () => {
        this.$fx.ui[this.$fx.theme.ui].select.play();
      });
      return alert.present();
    },
    async clickInventory() {
      const alert = await alertController.create({
        cssClass: "my-custom-class",
        header: "Inventory",
        inputs: [
          {
            label: "Neigh Card",
            type: "radio",
          },
          {
            label: "Get-Out-of-Jail-Free",
          },
        ],
        buttons: [
          {
            text: "Cancel",
            role: "cancel",
            cssClass: "secondary",
            handler: () => {
              this.$fx.ui[this.$fx.theme.ui].no.play();

              console.log("Confirm Cancel");
            },
          },
          {
            text: "Use",
            handler: () => {
              this.$fx.ui[this.$fx.theme.ui].yes.play();
              this.$fx.rpg[this.$fx.theme.rpg].useItem.play();
              console.log("Confirm Ok");
              this.createToast({
                header: `${this.user.name.nick} took out something from their bag...`,
                message: "...nothing happened.",
                // icon: sack,
              });
            },
          },
        ],
      });
      this.$fx.ui[this.$fx.theme.ui].options.play();
      alert.addEventListener("click", () => {
        this.$fx.ui[this.$fx.theme.ui].select.play();
      });
      return alert.present();
    },
    async clickClaim() {
      const { controlledSwiper } = this
      const { slides } = this.$refs
      const alert = await alertController.create({
        cssClass: "my-custom-class",
        header: "Claim Achievement?",
        // subHeader: 'Adds Mark in Quest log',
        message: "Would you like claim this achievement in your quest log?",
        buttons: [
          {
            text: "No",
            role: "cancel",
            cssClass: "secondary",
            handler: () => {
              this.$fx.ui[this.$fx.theme.ui].no.play();
              this.createToast({
                header: `${this.user.name.nick}:`,
                message: `"I'll come back to that later..."`,
                duration: 1800,
                // icon: comment,
              });
            },
          },
          {
            text: "Yes",
            handler: () => {
              this.$fx.ui[this.$fx.theme.ui].yes.play();
              console.log(slides);
              controlledSwiper.slideNext();
              this.createToast({
                header: `${this.user.name.nick} tamed ${this.item.title.rendered}!`,
                message: `Gained 2AP`,
                duration: 1800,
                // icon: comment,
              })
              setTimeout(
                () =>
                  this.createToast({
                    header: `Do-it-for-the-XP!`,
                    message: `${this.user.name.nick} Gained 200XP`,
                    duration: 1800,
                    // icon: comment,
                  }),
                2500
              );
            },
          },
        ],
      });
      this.$fx.ui[this.$fx.theme.ui].alert.play();
      return alert.present();
    },
    async clickRun() {
      const alert = await alertController.create({
        cssClass: "my-custom-class",
        header: "Roll 1d8 to Run Away",
        // subHeader: 'Adds Mark in Quest log',
        message:
          "Running away will take -1d8 from your HP. Click Roll to continue.",
        buttons: [
          {
            text: "No",
            role: "cancel",
            cssClass: "secondary",
            handler: () => {
              this.$fx.ui[this.$fx.theme.ui].no.play();
              console.log("Confirm Cancel");
            },
          },
          {
            text: "Roll",
            handler: () => {
              const { $fx, closeModal, leaveBattle, router, user } = this

              const roll = Math.floor(Math.random() * 7) + 1;
              leaveBattle().then( afterLeaveBattle )

              function afterLeaveBattle(){
                router.push({
                  name: 'world-map',
                  params: { userId: user.id }
                }).then(leaveBattleMessage)
              }

              async function leaveBattleMessage(){
                $fx.rpg[$fx.theme.rpg].attack.play();

                const toast = await toastController.create({
                  header  : user.name.nick + " Ran Away ",
                  cssClass: $fx.theme.rpg,
                  message : `-${roll} HP`,
                  // icon    : rabbitFast,
                  duration: 2000,
                  position: "top",
                });

                closeModal();

                await toast.present();
              }
            },
          },
        ],
      });
      this.$fx.ui[this.$fx.theme.ui].alert.play();
      return alert.present();
    },
    async closeModal() {
      await modalController.dismiss();
    },
    async createToast({ header, message, icon, duration }) {
      const toast = await toastController.create({
        header,
        cssClass: this.$fx.theme.rpg,
        message,
        icon,
        duration: duration ? duration : 1750,
        position: "top",
      });

      await toast.present();
    },
    typewriter(el) {
      return createAnimation()
        .addElement(el)
        .duration(2000)
        .iterations(Infinity)
        .fromTo("width", "0", "100%");
    },
    blinkTextCursor(el) {
      return createAnimation()
        .addElement(el)
        .duration(500)
        .iterations(Infinity)
        .fromTo("border-color", "transparent", "white");
    },
  },
  watch: {
    segment(segment) {
      switch (segment) {
        case 0:
          this.didPresent();
          this.$fx.ui[this.$fx.theme.ui].openTask.play();
          break;
        case 1:
          this.$fx.rpg[this.$fx.theme.rpg].fillPoints.play();
          if (this.$refs.userCard) this.$refs.userCard.beginCounter();
          this.startCounting();
          this.$fx.rpg[this.$fx.theme.rpg].gainXP.play();
          // setTimeout(()=>this.$refs.slides.slideNext(), 5000)
          break;
        case 2:
          this.addUpGP();
          break;

        default:
          break;
      }
    },
  },

  mixins: [fetchItems, ionic],
  setup() {
    const router = useRouter();
    const controlledSwiper = ref(null);
    const setControlledSwiper = (swiper) => {
      controlledSwiper.value = swiper;
    };
    return {
      controlledSwiper,
      setControlledSwiper,
      modules: [IonicSlides, Navigation, Controller],
      router
    };
  },
});

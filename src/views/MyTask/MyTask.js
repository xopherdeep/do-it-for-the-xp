import { defineComponent } from "vue";
import { modalController } from "@ionic/vue";
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
toastController
} from "@ionic/vue";

import { arrowBack, informationCircle } from "ionicons/icons";

import { NativeAudio } from "@awesome-cordova-plugins/native-audio";
import CardUserStats from "@/views/CardUserStats/CardUserStats.vue";
import fetchItems from "@/assets/js/mixins/fetchItems.js";
import AnimatedNumber from "@/assets/js/components/AnimatedNumber.vue"

export default defineComponent({
  props: ["taskId", "item", "user"],
  name: "my-task",
  components: {
    AnimatedNumber,
    IonSegment,
    CardUserStats,
    alertController,
    IonSegmentButton,
    IonBackdrop,
    IonPage,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonMenuButton,
    IonTitle,
    IonContent,
  },
  data() {
    return {
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
      slideOpts: {
        initialSlide: 0,
        speed: 400,
      },
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
          gained: 0
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
    addUpGP() {
      this.temp.gp.wallet = this.user.stats.gp.wallet;
      this.$fx.rpg[this.$fx.theme.rpg].countCoins.play();
      setTimeout(()=>{
        this.$fx.rpg[this.$fx.theme.rpg].countCoins.pause();
      },4000)
      this.startCounting();
      this.temp.gp.wallet += 100;
      this.temp.gp.gained = this.temp.gp.wallet
      // this.$store.dispatch("addToWallet", 100 )
    },
    startCounting() {
      this.$refs.countXPGained.start();
      this.$refs.countAPGained.start();
      this.$refs.countGPGained.start();
      this.$refs.countWallet.start();
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
      this[list] = this[list].filter((i) => i.label != item.label);
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
      this.$refs.slides.slideNext();
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
            handler: () => {
              this.$fx.rpg[this.$fx.theme.rpg].useMP.play();
              this.$fx.ui[this.$fx.theme.ui].yes.play();
              console.log("Confirm Ok");
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
              console.log("Confirm Cancel");
            },
          },
          {
            text: "Yes",
            handler: () => {
              this.$fx.ui[this.$fx.theme.ui].yes.play();
              this.$refs.slides.slideNext();
            },
          },
        ],
      });
      this.$fx.ui[this.$fx.theme.ui].alert.play();
      return alert.present();
    },
    async closeModal() {
const toast = await toastController
        .create({
          header: this.user.name.nick + 'Ran Away',
          message: 'Click to Close',
          icon: informationCircle,
          duration: 2000,
          position: 'top',
          // buttons: [
          //   {
          //     side: 'start',
          //     icon: 'star',
          //     text: 'Favorite',
          //     handler: () => {
          //       console.log('Favorite clicked');
          //     }
          //   }, {
          //     text: 'Done',
          //     role: 'cancel',
          //     handler: () => {
          //       console.log('Cancel clicked');
          //     }
          //   }
          // ]
        })
      await toast.present();
      await modalController.dismiss();

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
          break;
        case 2:
          this.addUpGP();
          break;

        default:
          break;
      }
    },
  },

  mixins: [fetchItems],
  setup() {
    // code
    return {};
  },
});

import { defineComponent, ref } from "vue";
import ionic from "@/assets/js/mixins/ionic";

import {
  arrowBack,
  arrowDownCircleOutline,
  arrowUpCircleOutline,
  removeCircleOutline,
  addCircleOutline,
  walletOutline,
  cashOutline,
  chevronBack,
  chevronForward,
  stop,
  play,
  pause,
  colorWand,
  colorWandOutline,
  lockClosedOutline,
  lockOpenOutline,
  sunnyOutline,
  partlySunnyOutline,
  moonOutline,
  cloudyNightOutline,
  fitnessOutline,
  sparklesOutline,
  keyOutline,
  cartOutline,
  starSharp,
  storefrontOutline,
  banOutline,
  bagOutline,
  trash,
  share,
  caretForwardCircle,
  heart,
  close
  
} from "ionicons/icons";
import fetchItems from "@/assets/js/mixins/fetchItems.js"
import { actionSheetController } from "@ionic/vue";

export default defineComponent({
  props: ["userId"],
  name: "gold-bank",
  mixins: [ionic,fetchItems],
  data() {
    return {
      isLoading: false,
      shelves: ['affordable'], 
      request: {
        type: "xp_accessory",
        params: {
          page: 1,
          search: "",
          per_page: 4,
        },
      },
    };
  },
  methods: {
    selectShelf($ev) {
      this.shelves = $ev.detail.value
    },
    async presentActionSheet() {
      const actionSheet = await actionSheetController
        .create({
          header: 'Yeeessss....?',
          cssClass: 'my-custom-class',
          buttons: [
            // {
            //   text: 'Save Cash',
            //   icon: cashOutline,
            //   id: 'delete-button', 
            //   data: {
            //     type: 'delete'
            //   },
            //   handler: () => {
            //     console.log('Delete clicked')
            //   },
            // },
            {
              text: 'Deposit GP',
              icon: addCircleOutline,
              data: 'Data value',
              handler: () => {
                console.log('Play clicked')
              },
            },
            {
              text: 'Withdrawl GP',
              icon: removeCircleOutline,
              data: 10,  
              handler: () => {
                console.log('Share clicked')
              },
            },
            {
              text: 'Cash Out GP',
              icon: walletOutline,
              handler: () => {
                console.log('Favorite clicked')
              },
            },
            {
              text: 'Cancel',
              icon: close,
              role: 'cancel',
              handler: () => {
                console.log('Cancel clicked')
              },
            },
          ],
        });
      await actionSheet.present();

      const { role, data } = await actionSheet.onDidDismiss();
      console.log('onDidDismiss resolved with role and data', role, data);
    },
  },
  mounted() {
    // const { ui, theme: {ui: uiTheme} } = this.fx
    // ui[uiTheme].openShop.play()
    // this.$fx.ui[this.$fx.theme.ui].openShop.play()
  },

  setup() {
      return {
        storefrontOutline,
        banOutline,
        chevronBack,
        chevronForward,
        stop,
        play,
        pause,
        arrowBack,
        colorWand,
        colorWandOutline,
        lockClosedOutline,
        lockOpenOutline,
        bagOutline,
        sunnyOutline,
        partlySunnyOutline,
        moonOutline,
        cloudyNightOutline,
        fitnessOutline,
        sparklesOutline,
        keyOutline,
        cartOutline,
        starSharp,

      }
  },
});

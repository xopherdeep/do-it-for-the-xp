import { defineComponent } from "vue";
import ionic from "@/mixins/ionic";

import {
  arrowBack,
  chevronBack,
  chevronForward,
  stop,
  close,
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
  heartHalfOutline,
  calendarOutline,
  starSharp,
  storefrontOutline,
  banOutline,
  bedOutline,
  bagOutline,
} from "ionicons/icons";
import fetchItems from "@/mixins/fetchItems"
import { actionSheetController } from "@ionic/vue";

export default defineComponent({
  props: ["userId"],
  name: "hotel-hub",
  mixins: [ionic, fetchItems],
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
          header: 'Welcome, Traveler! How may we assist you today?',
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
            //     // console.log('Delete clicked')
            //   },
            // },
            {
              text: 'Rest & Recover',
              icon: heartHalfOutline,
              data: 'Data value',
              handler: () => {
                // console.log('Play clicked')
              },
            },
            {
              text: 'Community Events',
              icon: calendarOutline,
              data: 10,
              handler: () => {
                // console.log('Share clicked')
              },
            },
            {
              text: 'Rent a Room',
              icon: bedOutline,
              handler: () => {
                // console.log('Favorite clicked')
              },
            },
            {
              text: 'Cancel',
              icon: close,
              role: 'cancel',
              handler: () => {
                // console.log('Cancel clicked')
              },
            },
          ],
        });
      await actionSheet.present();

      await actionSheet.onDidDismiss().then();
      // const { role, data } = ;
      // console.log('onDidDismiss resolved with role and data', role, data);
    },
  },
  mounted() {
    // this.$fx.ui[this.$fx.theme.ui].openShop.play()
  },
  setup() {
    const customAlertOptions = {
      header: 'Pizza Toppings',
      subHeader: 'Select your toppings',
      message: '$1.00 per topping',
      translucent: true
    };
    return {
      customAlertOptions,
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
      bedOutline,
    };
  },
});

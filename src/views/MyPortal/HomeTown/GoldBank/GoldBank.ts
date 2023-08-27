import { defineComponent } from "vue";
import { mapGetters } from "vuex";
import ionic from "@/mixins/ionic";

import {
  arrowBack,
  removeCircleOutline,
  addCircleOutline,
  walletOutline,
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
  close

} from "ionicons/icons";
import fetchItems from "@/mixins/fetchItems"
import { actionSheetController } from "@ionic/vue";

export default defineComponent({
  props: ["userId"],
  name: "gold-bank",
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
  computed: {
    ...mapGetters(["getUserById"]),
    user() {
      return this.getUserById(this.userId)
    }

  },
  methods: {
    async presentActionSheet() {
      const actionSheet = await actionSheetController
        .create({
          header: 'Welcome to the Automatic Teller Machine.',
          cssClass: 'my-custom-class',
          buttons: [
            {
              text: 'Use Atm',
              // icon: cashOutline,
              id: 'bank-atm',
              data: {
                type: 'delete'
              },
              handler: () => {
                // console.log('Delete clicked')
              },
            },
            {
              text: 'Withdrawl',
              icon: removeCircleOutline,
              data: 10,
              handler: () => {
                // console.log('Share clicked')
              },
            },
            {
              text: 'Deposit',
              icon: addCircleOutline,
              data: 'Data value',
              handler: () => {
                // console.log('Play clicked')
              },
            },
            {
              text: 'Cash Out GP',
              icon: walletOutline,
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

      const { role, data } = await actionSheet.onDidDismiss();
      // console.log('onDidDismiss resolved with role and data', role, data);
    },
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

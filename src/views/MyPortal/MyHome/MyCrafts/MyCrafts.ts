import { defineComponent } from "vue";
import ionic from "@/mixins/ionic";

import {
  calendarOutline,
  addCircleOutline,
  removeCircleOutline,
  close,
  arrowBack,
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
} from "ionicons/icons";
import fetchItems from "@/mixins/fetchItems.js"
import { actionSheetController } from "@ionic/vue";

export default defineComponent({
  props: ["userId"],
  name: "my-foods",
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
    segmentChanged(ev) {
      console.log("Segment changed", ev);
    },
    selectShelf($ev) {
      this.shelves = $ev.detail.value
    },
    async presentActionSheet() {
      const actionSheet = await actionSheetController
        .create({
          header: 'Look at the time!',
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
              text: 'Add Quest',
              icon: addCircleOutline,
              data: 'Data value',
              handler: () => {
                console.log('Play clicked')
              },
            },
            {
              text: 'Request Time Off',
              icon: removeCircleOutline,
              data: 10,  
              handler: () => {
                console.log('Share clicked')
              },
            },
            {
              text: 'Some other action...',
              icon: calendarOutline,
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
      actionSheet.present();

      const { role, data } = await actionSheet.onDidDismiss();
      console.log('onDidDismiss resolved with role and data', role, data);
    },
  },
  mounted() {
    // this.$fx.ui[this.$fx.theme.ui].openShop.play()
  },
  setup() {
    const customAlertOptions = {
      header: 'View Quests',
      subHeader: 'Select what quests to view',
      message: '',
      translucent: true
    };
    return {
      calendarOutline,
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
      addCircleOutline,
      removeCircleOutline,
      close,
    };
  },
});

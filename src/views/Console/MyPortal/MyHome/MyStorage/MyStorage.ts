import { defineComponent } from "vue";
import ionic from "@/mixins/ionic";

import {
  close,
  cubeOutline,
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
  addCircleOutline,
  storefrontOutline,
  removeCircleOutline,
  banOutline,
  bagOutline,
} from "ionicons/icons";
import fetchItems from "@/mixins/fetchItems"
import { actionSheetController } from "@ionic/vue";

export default defineComponent({
  props: ["userId"],
  name: "my-storage",
  mixins: [ionic, fetchItems],
  data() {
    return {
      isLoading: false,
      boxes: [
        'hp-items',
        'mp-items',
        'misc-items',
        'key-items'
      ],
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
      this.boxes = $ev.detail.value
    },
    async presentActionSheet() {
      const actionSheet = await actionSheetController
        .create({
          header: 'What would you like to do...?',
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
              text: 'Add Items to Storage',
              icon: addCircleOutline,
              data: 'Data value',
              handler: () => {
                // console.log('Play clicked')
              },
            },
            {
              text: 'Remove Items From Storage',
              icon: removeCircleOutline,
              data: 10,
              handler: () => {
                // console.log('Share clicked')
              },
            },
            {
              text: 'Some other action...',
              icon: cubeOutline,
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
      await actionSheet.onDidDismiss();
      // const { role, data } = 
      // console.log('onDidDismiss resolved with role and data', role, data);
    },
  },
  mounted() {
    // this.$fx.ui[this.$fx.theme.ui].openShop.play()
  },
  setup() {
    const customAlertOptions = {
      header: 'Storage Categories',
      subHeader: 'Categorized by type',
      message: 'What would you like to view?',
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
    };
  },
});

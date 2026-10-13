import { defineComponent } from "vue";
import ionic from "@/lib/mixins/ionic";

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
import { ref } from "vue";
import { useItemFetcher } from "@/hooks/useItemFetcher";
import { actionSheetController } from "@ionic/vue";
import { sanitizeHtml } from "@/lib/utils/sanitizeHtml";
import XpAppBottomNav from "@/components/organisms/BottomNav/XpAppBottomNav.vue";
import type { AppNavTab } from "@/components/organisms/BottomNav/appBottomNav";

const STORAGE_TABS: AppNavTab[] = [
  { id: "all", label: "All", ionIcon: bagOutline },
  { id: "hp", label: "HP", ionIcon: fitnessOutline },
  { id: "mp", label: "MP", ionIcon: colorWandOutline },
  { id: "misc", label: "Misc", ionIcon: sparklesOutline },
  { id: "key", label: "Key", ionIcon: keyOutline },
];

export default defineComponent({
  props: ["userId"],
  name: "my-storage",
  components: {
    XpAppBottomNav,
  },
  mixins: [ionic],
  data() {
    return {
      isLoading: false,
      boxes: [
        'hp-items',
        'mp-items',
        'misc-items',
        'key-items'
      ],
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
  setup(props) {
    const {
      request,
      items,
      getItems,
      getImgObj,
      nTotalPages
    } = useItemFetcher("xp_accessory", { per_page: 4 }, props.userId);

    const activeShelf = ref("all");
    const onShelfChange = (val: string) => {
      activeShelf.value = val;
      request.params.filter = val === "all" ? "" : val;
      request.params.page = 1;
    };

    return {
      activeShelf,
      storageTabs: STORAGE_TABS,
      onShelfChange,
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
      request,
      items,
      getItems,
      getImgObj,
      nTotalPages,
      sanitizeHtml,
    };
  },
});

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
  cubeOutline,
  bookOutline,
  videocamOutline,
  appsOutline,
  bedOutline

} from "ionicons/icons";
import fetchItems from "@/mixins/fetchItems"

export default defineComponent({
  props: ["userId"],
  name: "my-foods",
  mixins: [ionic, fetchItems],
  data() {
    return {
      isLoading: false,
      actionSheetOpen: false,
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
    segmentChanged() {
      // console.log("Segment changed", ev);
    },
    handleInventoryClick() {
      // Navigate to Materials Inventory or execute related function
      // console.log('Materials Inventory clicked')
      this.$router.push({
        name: 'my-inventory',
        params: {
          userId: this.user.id
        }
      })
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
      cubeOutline,
      bookOutline,
      videocamOutline,
      appsOutline,
      bedOutline
    };
  },
});

import { defineComponent } from "vue";
import ionic from "@/mixins/ionic";

import {
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
import { useItemFetcher } from "@/hooks/useItemFetcher";

export default defineComponent({
  props: ["userId"],
  name: "accessory-shop",
  mixins: [ionic],
  data() {
    return {
      shelves: ['affordable'], 
    };
  },
  methods: {
    selectShelf($ev) {
      this.shelves = $ev.detail.value
    }
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
      request,
      items,
      getItems,
      getImgObj,
      nTotalPages
    };
  },
});

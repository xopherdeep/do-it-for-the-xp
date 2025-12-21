import { defineComponent } from "vue";
import ionic from "@/mixins/ionic"

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

  bagOutline
} from "ionicons/icons";
import { useUserStore } from "@/lib/store/stores/user";
import debug from "@/lib/utils/debug";

export default defineComponent({
  props: ["userId"],
  name: "my-inventory",
  mixins: [ionic],
  computed: {
    userStore() { return useUserStore() },
    user() {
      return (this as any).userStore.getUserById(this.userId);
    },
  },
  methods: {
    segmentChanged(ev) {
      debug.log("Segment changed", ev);
    },
  },
  setup() {
    return {
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

    };
  },
});

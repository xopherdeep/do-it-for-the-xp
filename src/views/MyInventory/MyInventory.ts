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
  bagOutline,
} from "ionicons/icons";
import { mapGetters } from "vuex";

export default defineComponent({
  props: ["userId"],
  name: "my-inventory",
  mixins: [ionic],
  computed: {
    ...mapGetters(["getUserById"]),
    user() {
      return this.getUserById(this.userId);
    },
  },
  methods: {
    segmentChanged(ev) {
      console.log("Segment changed", ev);
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

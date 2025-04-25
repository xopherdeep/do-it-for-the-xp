import { computed, defineComponent } from "vue";
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
import { mapGetters, useStore } from "vuex";
import debug from "@/utils/debug";

export default defineComponent({
  props: ["userId"],
  name: "my-inventory",
  mixins: [ionic],
  computed: {
    ...mapGetters(["getUserById"]),
  },
  methods: {
    segmentChanged(ev) {
      debug.log("Segment changed", ev);
    },
  },
  setup(props) {
    const store = useStore()
    const user = computed(() => store.getters.getUserById(props.userId));

    return {
      user,
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

import { defineComponent } from "vue";
import ionic from "@/lib/mixins/ionic";
import XpIcon from "@/components/atoms/Icon/XpIcon.vue";
import XpInventorySheet from "./XpInventorySheet.vue";

export default defineComponent({
  props: ["userId"],
  name: "my-inventory",
  components: {
    XpIcon,
    XpInventorySheet,
  },
  mixins: [ionic],
});

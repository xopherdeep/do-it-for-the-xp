import { defineComponent } from 'vue'
import ionic from "@/mixins/ionic";
import { arrowBack, lockClosedOutline, lockClosedSharp } from "ionicons/icons";

export default defineComponent({
  mixins: [ionic],
  setup() {
    return {
      arrowBack,
      lockClosedOutline,
      lockClosedSharp
    };
  }
})
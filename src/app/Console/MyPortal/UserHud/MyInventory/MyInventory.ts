import { computed, defineComponent } from "vue";
import ionic from "@/lib/mixins/ionic";
import XpAppHeader from "@/components/organisms/XpApp/XpAppHeader.vue";
import { useAppSkin } from "@/components/organisms/XpApp/useAppSkin";
import { useUserStore } from "@/lib/store/stores/user";
import { bagUsage } from "@/lib/services/inventory/Storage";
import XpInventorySheet from "./XpInventorySheet.vue";

export default defineComponent({
  props: ["userId"],
  name: "my-inventory",
  components: {
    XpAppHeader,
    XpInventorySheet,
  },
  mixins: [ionic],
  setup(props) {
    // The Goods app skin (red accent) follows the Retro / Modern toggle.
    const { rootClass, rootStyle } = useAppSkin("goods");

    const userStore = useUserStore();
    // The header shows the bag slots in use: "7/20", in the warning colour when the bag is full (keys do not count).
    const bag = computed(() => {
      const hero = props.userId ? userStore.getUserById(props.userId) : userStore.currentUser;
      return bagUsage(hero);
    });
    const meta = computed(() => `${bag.value.used}/${bag.value.max}`);
    const isBagFull = computed(() => bag.value.used >= bag.value.max);

    return { rootClass, rootStyle, meta, isBagFull };
  },
});

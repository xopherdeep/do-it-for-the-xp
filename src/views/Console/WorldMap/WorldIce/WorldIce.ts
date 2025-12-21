import { defineComponent } from "vue";
import ionic from "@/mixins/ionic";
import { arrowBack } from "ionicons/icons";
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useUserStore } from "@/lib/store/stores/user";
import userActions from "@/mixins/userActions";
import travelingMerchant from "@/mixins/travelingMerchant"
import type { DefineUserActionComponent } from "@/mixins/userActions";

export default defineComponent<DefineUserActionComponent>({
  name: "world-ice",
  mixins: [ionic, userActions, travelingMerchant],

  ionViewDidEnter() {
    this.setActions( this.$options.name )
  },
  setup() {
    const route = useRoute();
    const router = useRouter();
    const userStore = useUserStore();
    const { userId } = route.params;
    const user = computed(() => userStore.getUserById(userId as string));

    const userActions = [
      {
        label: "Snow Shack",
        faIcon: "igloo",
        side: "bottom",
        click() {
          const merchant = "snow-shack"
          router.push({ name: "shop", params: { merchant }})
        },
      },
      {
        label: "Frozen Fortress",
        id: "frozen-fortress",
        faIcon: "place-of-worship",
        side: "top",
        click() {
          router.push({ name: "temple", params: { userId, temple: 'frozen-fortress' } });
        },
      },
      {
        label: "Travel World",
        faIcon: "pegasus",
        side: "start",
        click() {
          router.push({ name: "world-map", params: { userId } });
        },
      },
    ];
    return {
      userActions,
      user,
      userId,
      arrowBack,
    };
  },
});
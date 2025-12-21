import { defineComponent } from "vue";
import ionic from "@/mixins/ionic";
import { arrowBack } from "ionicons/icons";
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useUserStore } from "@/lib/store/stores/user";
import userActions from "@/mixins/userActions";

import type { DefineUserActionComponent } from "@/mixins/userActions";

export default defineComponent<DefineUserActionComponent>({
  name: "world-swamps",
  mixins: [ionic, userActions],

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
        label: "Witch's Hut",
        faIcon: "cauldron",
        side: "top",
        click() {
          const merchant = "witchs-hut"
          router.push({ name: "shop", params: { merchant }})
        },
      },
      {
        label: "Moon Temple",
        id: "moon-temple",
        faIcon: "place-of-worship",
        side: "bottom",
        click() {
          router.push({ name: "temple", params: { userId, temple: 'moon-temple' } });
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
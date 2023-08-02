import { defineComponent } from "vue";
import ionic from "@/mixins/ionic";
import { arrowBack } from "ionicons/icons";
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useStore } from "vuex";
import userActions from "@/mixins/userActions";
import type { DefineUserActionComponent } from "@/mixins/userActions";

export default defineComponent<DefineUserActionComponent>({
  name: "world-mountains",
  mixins: [ionic, userActions],

  ionViewDidEnter() {
    this.setActions( this.$options.name )
  },
  setup() {
    const route = useRoute();
    const router = useRouter();
    const store = useStore();
    const { userId } = route.params;
    const user = computed(() => store.getters.getUserById(userId));

    const userActions = [
      {
        label: "Crystal Caverns",
        faIcon: "dungeon",
        side: "top",
        click() {
          const merchant = "crystal-caverns"
          router.push({ name: "shop", params: { merchant }})
        },
      },
      {
        label: "Fire Fortress",
        id: "fire-temple",
        faIcon: "place-of-worship",
        side: "bottom",
        click() {
          router.push({ name: "temple", params: { userId } });
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
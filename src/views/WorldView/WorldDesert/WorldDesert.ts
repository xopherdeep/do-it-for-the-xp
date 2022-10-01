import { defineComponent } from "vue";
import ionic from "@/assets/js/mixins/ionic";
import { arrowBack } from "ionicons/icons";
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useStore } from "vuex";
import userActions from "@/assets/js/mixins/userActions";

export default defineComponent<userActions>({
  name: "world-sands",
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
        // label: "Oasis",
        label: "Pond of Life",
        faIcon: "island-tropical",
        side: "start",
        click() {
          const merchant = "pond-of-life"
          router.push({ name: "shop", params: { merchant }})
        },
      },
      {
        label: "Sun Temple",
        id: "sun-temple",
        faIcon: "place-of-worship",
        side: "end",
        click() {
          router.push({ name: "temple", params: { userId } });
        },
      },
      {
        label: "Travel World",
        faIcon: "pegasus",
        side: "top",
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

import { defineComponent } from "vue";
import ionic from "@/mixins/ionic";
import { arrowBack } from "ionicons/icons";
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useStore } from "vuex";
import userActions from "@/mixins/userActions";

export default defineComponent({
  name: "world-desert",
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
        side: "top",
        click() {
          const merchant = "pond-of-life"
          router.push({ name: "shop", params: { merchant }})
        },
      },
      {
        label: "Sun Temple",
        id: "sun-temple",
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
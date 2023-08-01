import { defineComponent } from "vue";
import createGlobe from "cobe";
import ionic from "@/mixins/ionic";
import { arrowBack } from "ionicons/icons";
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useStore } from "vuex";
import userActions from "@/mixins/userActions";
import { onIonViewDidEnter } from "@ionic/vue";

export default defineComponent({
  name: "world-forest",
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
        label: "Hermit's Tent",
        faIcon: "campground",
        side: "top",
        click() {
          const merchant = "hermits-tent"
          router.push({ name: "shop", params: { merchant }})
        },
      },
      {
        label: "Forest Temple",
        id: "forest-temple",
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

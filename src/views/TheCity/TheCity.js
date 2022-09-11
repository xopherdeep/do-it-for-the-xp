import { defineComponent } from "vue";
import createGlobe from "cobe";
import ionic from "@/assets/js/mixins/ionic";
import { arrowBack } from "ionicons/icons";
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useStore } from "vuex";
import userActions from "@/assets/js/mixins/userActions";

export default defineComponent({
  name: "the-city",
  mixins: [ionic, userActions],
  ionViewDidEnter(){
    this.setUserActions(this.userActions)
  },
  setup() {
    const router = useRouter();
    const route = useRoute();
    const store = useStore();
    const { userId } = route.params;
    const user = computed(() => store.getters.getUserById(userId));

    const userActions = [
      {
        label: "Home",
        faIcon: "house-user",
        click() {
          router.push({ name: "my-home", params: { userId } });
        },
      },
      {
        label: "Shop",
        faIcon: "store",
        click() {
          router.push({ name: "shop", params: { userId } });
        },
      },
      {
        label: "Hotel",
        faIcon: "hotel",
      },
      {
        label: "Hospital",
        faIcon: "hospital",
      },
      {
        label: "Temple",
        faIcon: "place-of-worship",
      },
      {
        label: "Bank",
        faIcon: "piggy-bank",
      },
      {
        label: "Town Hall",
        id: "town-hall",
        faIcon: "university",
        click($ev) {
          router.push({ name: "town-hall", params: { userId } });
          console.log($ev.preventDefault());
        },
      },
      {
        label: "Travel World",
        faIcon: "pegasus",
        click() {
          router.push({ name: "world-map", params: { userId } });
        },
      },
    ];
    return {
      user,
      userId,
      arrowBack,
      userActions,
    };
  },
});

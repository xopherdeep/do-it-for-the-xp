import { defineComponent } from "vue";
import createGlobe from "cobe";
import ionic from "@/mixins/ionic";
import { arrowBack } from "ionicons/icons";
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useStore } from "vuex";
import userActions from "@/mixins/userActions";

export default defineComponent({
  name: "home-town",
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
        side: "start",
        faIcon: "house-user",
        click() {
          router.push({ name: "my-home", params: { userId } });
        },
      },
      {
        label: "Shop",
        side: "top",
        faIcon: "store",
        click() {
          router.push({ name: "shop", params: { userId } });
        },
      },
      {
        label: "Hotel",
        faIcon: "hotel",
        side: "bottom",
        click() {
          router.push({ name: "hotel", params: { userId } });
        },
      },
      {
        label: "Hospital",
        faIcon: "hospital-alt",
        side: "bottom",
        click() {
          router.push({ name: "hospital", params: { userId } });
        },
      },
      {
        label: "Temple",
        faIcon: "place-of-worship",
        side: "bottom",
        click() {
          router.push({ name: "temple", params: { userId } });
        },
      },
      {
        label: "Bank",
        faIcon: "piggy-bank",
        side: "top",
        click() {
          router.push({ name: "bank", params: { userId } });
        },
      },
      {
        label: "Town Hall",
        id: "town-hall",
        faIcon: "university",
        side: "top",
        click($ev) {
          router.push({ name: "town-hall", params: { userId } });
          console.log($ev.preventDefault());
        },
      },
      {
        label: "The Plains",
        faIcon: "tornado",
        side: "start",
        click() {
          router.push({ name: "world-plains", params: { userId } });
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

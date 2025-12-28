import { defineComponent } from "vue";
import ionic from "@/mixins/ionic";
import { arrowBack } from "ionicons/icons";
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useUserStore } from "@/lib/store/stores/user";
import userActions from "@/mixins/userActions";
import type { DefineUserActionComponent } from "@/mixins/userActions";

export default defineComponent<DefineUserActionComponent>({
  name: "home-town",
  mixins: [ionic, userActions],
  ionViewDidEnter() {
    this.setUserActions(this.userActions)
  },
  setup() {
    const userStore = useUserStore();
    const router = useRouter();
    const route = useRoute();
    const { userId } = route.params;
    const user = computed(() => userStore.getUserById(userId as string));

    const userActions = [
      {
        label: "Home",
        side: "bottom",
        faIcon: "house-user",
        click() {
          router.push({ name: "my-home", params: { userId } });
        },
      },
      {
        label: "Shop",
        side: "start",
        faIcon: "store",
        click() {
          router.push({ name: "shop", params: { userId } });
        },
      },
      {
        label: "Hospital",
        faIcon: "hospital-alt",
        side: "end",
        click() {
          router.push({ name: "hospital", params: { userId } });
        },
      },
      {
        label: "Hotel",
        faIcon: "hotel",
        side: "end",
        click() {
          router.push({ name: "hotel", params: { userId } });
        },
      },
      // TODO: Uncomment when temple is implemented
      // {
      //   label: "Temple",
      //   faIcon: "place-of-worship",
      //   side: "bottom",
      //   click() {
      //     router.push({ name: "temple", params: { userId } });
      //   },
      // },
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
        faIcon: "podium",
        side: "start",
        click() {
          router.push({ name: "town-hall", params: { userId } });
          // console.log($ev.preventDefault());
        },
      },
      {
        label: "The Plains",
        faIcon: "tornado",
        side: "top",
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

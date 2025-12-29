import { defineComponent as dC } from "vue";
import { arrowBack } from "ionicons/icons";
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useUserStore } from "@/lib/store/stores/user";
import { useUserActions } from "@/hooks/useUserActions";
import { IonPage, IonContent, onIonViewDidEnter } from "@ionic/vue";

export default dC({
  name: "world-moon",
  components: { IonPage, IonContent },

  setup() {
    const route = useRoute();
    const router = useRouter();
    const userStore = useUserStore();
    const { setActions } = useUserActions();

    const { userId } = route.params;
    const user = computed(() => userStore.getUserById(userId as string));

    const userActions = [
      {
        label: "Theia City",
        faIcon: "chess-rook",
        side: "start",
        click() {
          const merchant = "theia-city"
          router.push({ name: "shop", params: { merchant } })
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
      {
        label: "Moon Temple",
        id: "moon-temple",
        faIcon: "place-of-worship",
        side: "end",
        click() {
          const temple = 'moon-temple'
          router.push({
            name: "temple",
            params: {
              userId,
              temple
            }
          });
        },
      },
    ];

    onIonViewDidEnter(() => {
      setActions("world-moon", userActions);
    })

    return {
      userActions,
      user,
      userId,
      arrowBack,
    };
  },
});
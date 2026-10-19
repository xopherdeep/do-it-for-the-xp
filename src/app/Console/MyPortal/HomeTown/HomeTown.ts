import { defineComponent as dC } from "vue";
import { arrowBack } from "ionicons/icons";
import { computed, ref } from "vue";
import { TempleDb, templeStorage } from "@/lib/databases/TempleDb";
import { MOVING_TEMPLE_ID } from "@/lib/services/core/packs/movingTemple";
import debug from "@/lib/utils/debug";
import { useRoute, useRouter } from "vue-router";
import { useUserStore } from "@/lib/store/stores/user";
import { useUserActions } from "@/hooks/useUserActions";
import { IonPage, IonContent, IonCard, IonCardHeader, IonCardTitle, IonModal, onIonViewDidEnter } from "@ionic/vue";

export default dC({
  name: "home-town",
  components: { IonPage, IonContent, IonCard, IonCardHeader, IonCardTitle, IonModal },

  setup() {
    const userStore = useUserStore();
    const router = useRouter();
    const route = useRoute();
    const { setActions } = useUserActions();

    const userId = computed(() => String(route.params.userId));
    const user = computed(() => userStore.getUserById(userId.value));

    const userActions = [
      {
        label: "Home",
        side: "bottom",
        faIcon: "house-user",
        click() {
          router.push({ name: "my-home", params: { userId: userId.value } });
        },
      },
      {
        label: "Shop",
        side: "start",
        faIcon: "store",
        click() {
          router.push({ name: "shop", params: { userId: userId.value } });
        },
      },
      {
        label: "Hospital",
        faIcon: "hospital-alt",
        side: "end",
        click() {
          router.push({ name: "hospital", params: { userId: userId.value } });
        },
      },
      {
        label: "Hotel",
        faIcon: "hotel",
        side: "end",
        click() {
          router.push({ name: "hotel", params: { userId: userId.value } });
        },
      },
      // No Temple building here: the `temple` route needs a temple id, and temples are entered from the World Map regions.
      {
        label: "Bank",
        faIcon: "piggy-bank",
        side: "top",
        click() {
          router.push({ name: "bank", params: { userId: userId.value } });
        },
      },
      {
        label: "Town Hall",
        id: "town-hall",
        faIcon: "podium",
        side: "start",
        click() {
          router.push({ name: "town-hall", params: { userId: userId.value } });
          // console.log($ev.preventDefault());
        },
      },
      {
        label: "The Plains",
        faIcon: "tornado",
        side: "top",
        click() {
          router.push({ name: "world-plains", params: { userId: userId.value } });
        },
      },
    ];

    // The Moving House pack's temple is not one of the nine on the world map: it lives in the temple store, so the
    // plaza gets a building for it once the family has built it
    const hasOldHouse = ref(false);
    const findOldHouse = async (): Promise<void> => {
      try {
        await templeStorage.create();
        hasOldHouse.value = Boolean(await new TempleDb(templeStorage).getTempleById(MOVING_TEMPLE_ID));
      } catch (error) {
        // No temple store (private mode): the town just has no old house
        debug.warn("[HomeTown] could not look for the old house", error);
        hasOldHouse.value = false;
      }
    };

    const enterOldHouse = () => {
      router.push({ name: "temple", params: { userId: userId.value, temple: MOVING_TEMPLE_ID } });
    };

    onIonViewDidEnter(() => {
      setActions("home-town", userActions);
      void findOldHouse();
    })

    return {
      user,
      userId,
      arrowBack,
      userActions,
      hasOldHouse,
      enterOldHouse,
    };
  },
});


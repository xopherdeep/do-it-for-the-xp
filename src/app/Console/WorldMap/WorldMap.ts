import { defineComponent as dC, ref, computed } from "vue";
import { arrowBack } from "ionicons/icons";
import { useRoute, useRouter } from "vue-router";
import { useUserStore } from "@/lib/store/stores/user";
import { useUserActions } from "@/hooks/useUserActions";
import { IonPage, IonContent, onIonViewDidEnter } from "@ionic/vue";
import { triggerSpotsReset } from "@/components/organisms/DraggableSpot/useDraggableSpot";

export const DEFAULT_STAGE_NODES = [
  { stageId: "world-islands", defaultX: 18, defaultY: 15 },
  { stageId: "world-clouds", defaultX: 82, defaultY: 15 },
  { stageId: "world-mountains", defaultX: 50, defaultY: 37 },
  { stageId: "world-sands", defaultX: 82, defaultY: 33 },
  { stageId: "world-forest", defaultX: 18, defaultY: 38 },
  { stageId: "world-ice", defaultX: 82, defaultY: 52 },
  { stageId: "world-swamps", defaultX: 17, defaultY: 67 },
  { stageId: "world-plains", defaultX: 50, defaultY: 62 },
  { stageId: "the-moon", defaultX: 82, defaultY: 70 },
];

const STAGE_ROUTES: Record<string, string> = {
  "world-plains": "world-plains",
  "world-forest": "world-forest",
  "world-islands": "world-islands",
  "world-swamps": "world-swamps",
  "world-mountains": "world-mountains",
  "world-sands": "world-sands",
  "world-clouds": "world-clouds",
  "world-ice": "world-ice",
  "the-moon": "the-moon",
};

export default dC({
  name: "my-home",
  components: { IonPage, IonContent },

  setup() {
    const route = useRoute();
    const router = useRouter();
    const userStore = useUserStore();
    const { setActions } = useUserActions();

    const plazaRef = ref<HTMLElement | null>(null);
    const { userId } = route.params;
    const userIdRef = computed(() => (Array.isArray(userId) ? userId[0] : userId));
    const user = computed(() => userStore.getUserById(userId as string));

    const stageNodes = DEFAULT_STAGE_NODES;

    const resetPositions = () => {
      triggerSpotsReset("world-map");
    };

    const handleStageTravel = (stageId: string) => {
      const currentUserId = userIdRef.value;
      const hasNoUser = !currentUserId;
      if (hasNoUser) return;

      const targetRoute = STAGE_ROUTES[stageId] || "world-plains";
      router.push({ name: targetRoute, params: { userId: currentUserId } });
    };

    const userActions = [
      {
        label: "Plains",
        faIcon: "tornado",
        side: "bottom",
        click() {
          router.push({ name: 'world-plains', params: { userId } })
        }
      },
      {
        label: "Forests",
        faIcon: "trees",
        side: "start",
        click() {
          router.push({ name: 'world-forest', params: { userId } })
        }
      },
      {
        label: "Islands",
        faIcon: "island-tropical",
        side: "start",
        click() {
          router.push({ name: 'world-islands', params: { userId } })
        }
      },
      {
        label: "Swamps",
        faIcon: "skull-crossbones",
        side: "bottom",
        click() {
          router.push({ name: 'world-swamps', params: { userId } })
        }
      },
      {
        label: "Mountains",
        faIcon: "mountains",
        side: "top",
        click() {
          router.push({ name: 'world-mountains', params: { userId } })
        }
      },
      {
        label: "Sands",
        faIcon: "cactus",
        side: "end",
        click() {
          router.push({ name: 'world-sands', params: { userId } })
        }
      },
      {
        label: "Tundras",
        faIcon: "igloo",
        side: "end",
        click() {
          router.push({ name: 'world-ice', params: { userId } })
        }
      },
      {
        label: "Clouds",
        faIcon: "bolt",
        side: "top",
        click() {
          router.push({ name: 'world-clouds', params: { userId } })
        }
      },
      {
        label: "Stars",
        faIcon: "star",
        side: "top",
        click() {
          router.push({ name: 'the-moon', params: { userId } });
        }
      },
      {
        label: "Reset Map",
        faIcon: "rotate-left",
        side: "bottom",
        click() {
          resetPositions();
        }
      },
    ];

    onIonViewDidEnter(() => {
      setActions("my-home", userActions);
    });

    return {
      userActions,
      user,
      userId,
      arrowBack,
      plazaRef,
      stageNodes,
      handleStageTravel,
    };
  },
});
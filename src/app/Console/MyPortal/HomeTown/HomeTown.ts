import { defineComponent as dC } from "vue";
import { arrowBack } from "ionicons/icons";
import { computed, ref } from "vue";
import { TempleDb, templeStorage } from "@/lib/databases/TempleDb";
import { MOVING_TEMPLE_ID } from "@/lib/services/core/packs/movingTemple";
import type { ProjectRecord } from "@/lib/services/projects/projectRecord";
import type { ProjectTypeId } from "@/lib/services/core/packs/projects";
import { readTower, readTrophies } from "@/lib/services/projects/projectService";
import { useVoice } from "@/hooks/useVoice";
import debug from "@/lib/utils/debug";
import { useRoute, useRouter } from "vue-router";
import { useUserStore } from "@/lib/store/stores/user";
import { useUserActions } from "@/hooks/useUserActions";
import { IonPage, IonContent, IonCard, IonCardHeader, IonCardTitle, IonModal, onIonViewDidEnter } from "@ionic/vue";
import XpProjectWizardModal from "@/app/SideMenu/XpSettings/components/XpProjectWizardModal.vue";
import ProjectTowerSheet from "./components/ProjectTowerSheet.vue";
import ProjectTrophySheet from "./components/ProjectTrophySheet.vue";
import { standingProjectOf, towerSpotOf } from "./components/towerSpot";

export default dC({
  name: "home-town",
  components: { IonPage, IonContent, IonCard, IonCardHeader, IonCardTitle, IonModal, ProjectTowerSheet, ProjectTrophySheet, XpProjectWizardModal },

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

    // The family's project tower stands on the plaza while a project is running, and stays as a trophy once the roof is
    // beaten (the newest cleared run); a tap opens the tower's sheet, or the trophy's
    const { voice } = useVoice();
    const tower = ref<ProjectRecord | null>(null);
    const isTowerOpen = ref(false);
    const isTrophyOpen = ref(false);
    const isWizardOpen = ref(false);
    const restartType = ref<ProjectTypeId | undefined>(undefined);
    const towerSpot = computed(() => (tower.value ? towerSpotOf(tower.value, voice.value) : null));
    const isTrophy = computed(() => tower.value?.status === "cleared");
    // A trophy that cannot be read leaves the running tower where it is
    const readTrophiesQuietly = async (): Promise<ProjectRecord[]> => {
      try {
        return await readTrophies();
      } catch (error) {
        debug.warn("[HomeTown] could not look for the trophies", error);
        return [];
      }
    };
    const findTower = async (): Promise<void> => {
      try {
        const [running, cleared] = await Promise.all([readTower(), readTrophiesQuietly()]);
        tower.value = standingProjectOf(running?.project ?? null, cleared);
      } catch (error) {
        debug.warn("[HomeTown] could not look for the project tower", error);
        tower.value = null;
      }
    };
    const openTower = () => {
      if (isTrophy.value) isTrophyOpen.value = true;
      else isTowerOpen.value = true;
    };
    // The trophy's Start again: the project wizard on the run's type, and the plaza looks again when it closes
    const startAgain = (typeId: ProjectTypeId) => {
      isTrophyOpen.value = false;
      restartType.value = typeId;
      isWizardOpen.value = true;
    };
    const closeWizard = () => {
      isWizardOpen.value = false;
      void findTower();
    };
    const enterTower = () => {
      isTowerOpen.value = false;
      const templeId = tower.value?.templeId;
      if (templeId) router.push({ name: "temple", params: { userId: userId.value, temple: templeId } });
    };

    onIonViewDidEnter(() => {
      setActions("home-town", userActions);
      void findOldHouse();
      void findTower();
    })

    return {
      user,
      userId,
      arrowBack,
      userActions,
      hasOldHouse,
      enterOldHouse,
      towerSpot,
      isTowerOpen,
      isTrophyOpen,
      isWizardOpen,
      restartType,
      findTower,
      openTower,
      startAgain,
      closeWizard,
      enterTower,
    };
  },
});


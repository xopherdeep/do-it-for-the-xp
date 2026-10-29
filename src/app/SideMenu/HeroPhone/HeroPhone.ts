import { computed, defineComponent, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonCol,
  IonContent,
  IonFooter,
  IonGrid,
  IonHeader,
  IonPage,
  IonRow,
  IonText,
  IonTitle,
  IonToolbar,
} from "@ionic/vue";
import XpHeroModel from "@/components/organisms/HeroModel/XpHeroModel.vue";
import XpRevealPrompt from "@/components/organisms/RevealPrompt/XpRevealPrompt.vue";
import HeroPhoneBoard from "./components/HeroPhoneBoard.vue";
import { useFirstPull } from "./useFirstPull";
import { useCopy } from "@/hooks/useVoice";
import { HERO_PHONE_ROAD_CLOSED_LINE, isFamilyRoadClosedProblem } from "@/lib/services/townhall/townHallPrompts";
import { useFamilyStore } from "@/lib/store/stores/family";
import { useSyncStore } from "@/lib/store/stores/sync";
import debug from "@/lib/utils/debug";

export const HeroPhone = defineComponent({
  name: "hero-phone",
  components: {
    IonButton,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardSubtitle,
    IonCardTitle,
    IonCol,
    IonContent,
    IonFooter,
    IonGrid,
    IonHeader,
    IonPage,
    IonRow,
    IonText,
    IonTitle,
    IonToolbar,
    XpHeroModel,
    XpRevealPrompt,
    "xp-hero-model": XpHeroModel,
    "hero-phone-board": HeroPhoneBoard,
  },
  setup() {
    const router = useRouter();
    const family = useFamilyStore();
    const sync = useSyncStore();
    const t = useCopy();
    // A Pro phone's first pull: the clerk's progress line, then the hero's turn, then the portal; Play opens it later
    const { prompt, answer, footer: syncFooter, play, status } = useFirstPull(family, router);
    const canPlay = computed(() => status.value.canPlay);
    const isFullPortal = computed(() => status.value.isFullPortal);

    const isUnlinked = computed(() => Boolean(family.device?.unlinked));
    const card = computed(() => family.device?.card ?? null);
    /** The family device sent this hero's sheet: the board shows it (two-phone play) */
    const hasSheet = computed(() => Boolean(family.phoneState?.sheet));
    /** The board is for a phone that is not the full game (the portal has the real quest book), or one whose hero another device plays */
    const isBoardShown = computed(() => {
      const isBoardPhone = !isUnlinked.value && (!isFullPortal.value || status.value.isPlayedElsewhere);
      return isBoardPhone && hasSheet.value;
    });
    /** A full-game phone shows the board only while another device plays the hero: read-only, nothing is claimed from it */
    const isBoardReadOnly = computed(() => isFullPortal.value);
    /** The notice that the quests are on the family device, for a card with no board and no portal (a stalled pull says it below) */
    const isElsewhereShown = computed(() => !hasSheet.value && !isFullPortal.value && !status.value.isStalled);
    /** Play: the full game, or (off) a first pull still waiting on its hero after five minutes */
    const isPlayShown = computed(() => status.value.isPlayShown && !isUnlinked.value);

    /** The hero's name: from the card, else as the site lists them (kept until the family device has sent a card) */
    const heroName = computed(() => card.value?.nickname || family.device?.nickname || "");
    /** A linked phone the family device has sent no card to: the screen says so rather than sit blank */
    const isCardWaiting = computed(() => !isUnlinked.value && !card.value);

    const pageTitle = computed(() => {
      const hasNickname = Boolean(heroName.value);
      return hasNickname ? heroName.value : "Hero Phone";
    });

    const isRoadClosed = computed(() => isFamilyRoadClosedProblem(family.problem));
    const cardWaitingText = computed(() => {
      if (isRoadClosed.value) return HERO_PHONE_ROAD_CLOSED_LINE;
      return t("family.cardWaiting", { nickname: heroName.value ? heroName.value : "Your hero" });
    });
    /** For the Game Master setting the phone up: why a waiting phone is not syncing (off, or the site's own word) */
    const syncNote = computed(() => {
      if (!sync.isOn) return t("family.syncOffNote");
      const problem = sync.problem;
      const hasProblem = typeof problem === "string" && problem.length > 0;
      return hasProblem ? t("family.syncProblemNote", { problem: problem as string }) : "";
    });

    const unlinkedText = computed(() => t("family.unlinked"));
    const playText = computed(() => t("sync.play"));
    const questsElsewhereText = computed(() => t("family.questsElsewhere"));

    const handleStartFresh = async (): Promise<void> => {
      await family.forgetDevice();
      await router.replace("/xp-profile");
    };

    const onVisibilityChange = (): void => {
      const isVisible = typeof document !== "undefined" && document.visibilityState === "visible";
      if (isVisible) {
        family.refreshCard().catch((err) => debug.warn("hero-phone: could not refresh card", err));
        family.syncPhone().catch((err) => debug.warn("hero-phone: could not sync", err));
      }
    };

    onMounted(() => {
      family.refreshCard().catch((err) => debug.warn("hero-phone: could not refresh card", err));
      family.syncPhone().catch((err) => debug.warn("hero-phone: could not sync", err));
      const hasDoc = typeof document !== "undefined";
      if (hasDoc) {
        document.addEventListener("visibilitychange", onVisibilityChange);
      }
    });

    onUnmounted(() => {
      const hasDoc = typeof document !== "undefined";
      if (hasDoc) {
        document.removeEventListener("visibilitychange", onVisibilityChange);
      }
    });

    return {
      answer,
      canPlay,
      card,
      cardWaitingText,
      handleStartFresh,
      isBoardShown,
      isBoardReadOnly,
      isCardWaiting,
      isElsewhereShown,
      isPlayShown,
      isUnlinked,
      pageTitle,
      play,
      playText,
      prompt,
      questsElsewhereText,
      syncFooter,
      syncNote,
      unlinkedText,
    };
  },
});

export default HeroPhone;

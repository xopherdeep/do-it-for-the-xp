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
import { useFamilyStore } from "@/lib/store/stores/family";
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
    const t = useCopy();
    // A Pro phone's first pull: the clerk's progress line, then the hero's turn, then the portal; Play opens it later
    const { prompt, answer, footer: syncFooter, play, canPlay, isFullPortal, isPlayedElsewhere } = useFirstPull(family, router);

    const isUnlinked = computed(() => Boolean(family.device?.unlinked));
    const card = computed(() => family.device?.card ?? null);
    /** The family device sent this hero's sheet: the board shows it (two-phone play) */
    const hasSheet = computed(() => Boolean(family.phoneState?.sheet));
    /** The board is for a phone that is not the full game (the portal has the real quest book), or one whose hero another device plays */
    const isBoardShown = computed(() => {
      const isBoardPhone = !isUnlinked.value && (!isFullPortal.value || isPlayedElsewhere.value);
      return isBoardPhone && hasSheet.value;
    });
    /** A full-game phone shows the board only while another device plays the hero: read-only, nothing is claimed from it */
    const isBoardReadOnly = computed(() => isFullPortal.value);
    /** The notice that the quests are on the family device, for a card with no board and no portal */
    const isElsewhereShown = computed(() => !hasSheet.value && !isFullPortal.value);
    const isPlayShown = computed(() => isFullPortal.value && !isUnlinked.value);

    const pageTitle = computed(() => {
      const heroNickname = card.value?.nickname;
      const hasNickname = Boolean(heroNickname);
      return hasNickname ? (heroNickname as string) : "Hero Phone";
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
      handleStartFresh,
      isBoardShown,
      isBoardReadOnly,
      isElsewhereShown,
      isPlayShown,
      isUnlinked,
      pageTitle,
      play,
      playText,
      prompt,
      questsElsewhereText,
      syncFooter,
      unlinkedText,
    };
  },
});

export default HeroPhone;

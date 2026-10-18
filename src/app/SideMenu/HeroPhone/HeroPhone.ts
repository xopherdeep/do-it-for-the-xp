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
  IonGrid,
  IonHeader,
  IonPage,
  IonRow,
  IonText,
  IonTitle,
  IonToolbar,
} from "@ionic/vue";
import XpHeroModel from "@/components/organisms/HeroModel/XpHeroModel.vue";
import HeroPhoneBoard from "./components/HeroPhoneBoard.vue";
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
    IonGrid,
    IonHeader,
    IonPage,
    IonRow,
    IonText,
    IonTitle,
    IonToolbar,
    XpHeroModel,
    "xp-hero-model": XpHeroModel,
    "hero-phone-board": HeroPhoneBoard,
  },
  setup() {
    const router = useRouter();
    const family = useFamilyStore();
    const t = useCopy();

    const isUnlinked = computed(() => Boolean(family.device?.unlinked));
    const card = computed(() => family.device?.card ?? null);
    /** The family device sent this hero's sheet: the board shows it (two-phone play) */
    const hasSheet = computed(() => Boolean(family.phoneState?.sheet));

    const pageTitle = computed(() => {
      const heroNickname = card.value?.nickname;
      const hasNickname = Boolean(heroNickname);
      return hasNickname ? (heroNickname as string) : "Hero Phone";
    });

    const unlinkedText = computed(() => t("family.unlinked"));
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
      card,
      hasSheet,
      handleStartFresh,
      isUnlinked,
      pageTitle,
      questsElsewhereText,
      unlinkedText,
    };
  },
});

export default HeroPhone;

import { computed, defineComponent, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonCol,
  IonContent,
  IonGrid,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonPage,
  IonRow,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar,
} from "@ionic/vue";
import { BarcodeFormat, BarcodeScanner } from "@capacitor-mlkit/barcode-scanning";
import { Capacitor } from "@capacitor/core";
import { useCopy } from "@/hooks/useVoice";
import { normalizeCode, readLink } from "@/lib/services/multiplayer/deviceLink";
import type { FamilyProblem } from "@/lib/services/multiplayer/familyServer";
import { HERO_PHONE_ROAD_CLOSED_LINE, isFamilyRoadClosedProblem } from "@/lib/services/townhall/townHallPrompts";
import { useFamilyStore } from "@/lib/store/stores/family";
import debug from "@/lib/utils/debug";

/** The clerk's line for each way a claim can fail. A server that cannot be reached has its own line: see `isFamilyRoadClosedProblem` */
const PROBLEM_MAP: Readonly<Record<string, string>> = {
  "code-invalid": "family.codeInvalid",
  taken: "family.taken",
  "not-member": "family.notMember",
  unlinked: "family.unlinked",
};

export const LinkPhone = defineComponent({
  name: "link-phone",
  components: {
    IonBackButton,
    IonButton,
    IonButtons,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardTitle,
    IonCol,
    IonContent,
    IonGrid,
    IonHeader,
    IonInput,
    IonItem,
    IonLabel,
    IonPage,
    IonRow,
    IonSpinner,
    IonText,
    IonTitle,
    IonToolbar,
  },
  setup() {
    const route = useRoute();
    const router = useRouter();
    const family = useFamilyStore();
    const t = useCopy();

    const typedCode = ref("");
    const isClaiming = ref(false);
    const bannerText = ref<string | null>(null);

    const isNative = computed(() => Capacitor.isNativePlatform());
    const hasCode = computed(() => typedCode.value.trim().length > 0);

    const storeSiteOverride = (site: string) => {
      try {
        localStorage.setItem("xp:townHallSite", site);
      } catch (err) {
        debug.error("Failed to store site override:", err);
      }
    };

    const claimCode = async (rawCode: string): Promise<void> => {
      isClaiming.value = true;
      bannerText.value = null;

      const cleanCode = normalizeCode(rawCode);
      const isCodeValid = Boolean(cleanCode);

      if (!isCodeValid) {
        debug.warn("Invalid link code supplied:", rawCode);
        bannerText.value = t("family.codeInvalid");
        isClaiming.value = false;
        return;
      }

      try {
        const result = await family.claim(cleanCode as string);
        const isLinked = result === "linked";

        if (isLinked) {
          const cardNickname = family.device?.card?.nickname;
          const fallbackNickname = "Hero";
          const resolvedNickname = cardNickname || fallbackNickname;
          bannerText.value = t("family.linked", { nickname: resolvedNickname });
          await router.replace({ name: "hero-phone" });
        } else if (isFamilyRoadClosedProblem(result as FamilyProblem)) {
          // The code was never judged: the family server did not answer, so no "wrong code" line
          bannerText.value = HERO_PHONE_ROAD_CLOSED_LINE;
        } else {
          const mappedKey = PROBLEM_MAP[result as FamilyProblem];
          const defaultKey = "family.codeInvalid";
          const chosenKey = mappedKey || defaultKey;
          bannerText.value = t(chosenKey as any);
        }
      } catch (error) {
        debug.error("Claiming phone failed:", error);
        bannerText.value = t("family.codeInvalid");
      } finally {
        isClaiming.value = false;
      }
    };

    const handleLink = async () => {
      const codeToClaim = typedCode.value;
      await claimCode(codeToClaim);
    };

    const handleKeydown = async (event: KeyboardEvent) => {
      const isEnter = event.key === "Enter";
      if (isEnter) {
        await handleLink();
      }
    };

    const handleScan = async () => {
      try {
        const scanResult = await BarcodeScanner.scan({
          formats: [BarcodeFormat.QrCode],
        });
        const firstBarcode = scanResult.barcodes?.[0];
        const rawValue = firstBarcode?.displayValue ?? firstBarcode?.rawValue ?? "";
        const hasScannedText = Boolean(rawValue && rawValue.trim().length > 0);

        if (!hasScannedText) {
          debug.warn("No barcode detected in scan result");
          return;
        }

        const isProduction = process.env.NODE_ENV === "production";
        const isNotProduction = !isProduction;
        const linkData = readLink(rawValue, isProduction);
        const hasLinkData = Boolean(linkData);

        if (hasLinkData) {
          const siteUrl = linkData?.site;
          const hasSite = Boolean(isNotProduction && siteUrl && siteUrl.length > 0);
          if (hasSite) {
            storeSiteOverride(siteUrl as string);
          }
          const codeVal = linkData?.code ?? "";
          typedCode.value = codeVal;
          await claimCode(codeVal);
        } else {
          const directCode = normalizeCode(rawValue);
          const hasDirectCode = Boolean(directCode);
          if (hasDirectCode) {
            typedCode.value = directCode as string;
            await claimCode(directCode as string);
          } else {
            bannerText.value = t("family.codeInvalid");
          }
        }
      } catch (error) {
        debug.error("Barcode scan failed:", error);
      }
    };

    onMounted(async () => {
      const codeQuery = route.query.code;
      const isCodePresent = typeof codeQuery === "string" && codeQuery.length > 0;
      const siteQuery = route.query.site;
      const isSitePresent = typeof siteQuery === "string" && siteQuery.length > 0;
      const isProduction = process.env.NODE_ENV === "production";
      const isNotProduction = !isProduction;
      const shouldSaveSite = isNotProduction && isSitePresent;

      if (shouldSaveSite) {
        storeSiteOverride(siteQuery as string);
      }

      if (isCodePresent) {
        typedCode.value = codeQuery as string;
        await claimCode(codeQuery as string);
      }
    });

    return {
      typedCode,
      isClaiming,
      bannerText,
      isNative,
      hasCode,
      handleLink,
      handleKeydown,
      handleScan,
    };
  },
});

export default LinkPhone;

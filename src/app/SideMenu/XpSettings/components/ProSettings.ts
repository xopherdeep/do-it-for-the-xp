import { computed, defineComponent, onMounted, ref } from "vue";
import ionic from "@/lib/mixins/ionic";
import { useProStore } from "@/lib/store/stores/pro";
import { proToast } from "@/lib/services/pro/proUi";
import XpLicenseCard from "./XpLicenseCard.vue";

export default defineComponent({
  name: "pro-settings",
  mixins: [ionic],
  components: { XpLicenseCard },
  setup() {
    const pro = useProStore();
    const keyInput = ref("");
    const emailInput = ref("");

    onMounted(() => {
      pro.init().catch(() => undefined);
    });

    /** XP-PRO-****-****-ABCD: only the last group shows. */
    const maskedKey = computed(() => `XP-PRO-****-****-${pro.licenseKey.slice(-4)}`);

    const dateLabel = computed(() => {
      const d = pro.expiresAt ? new Date(pro.expiresAt) : null;
      return d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString() : "";
    });

    const sinceLabel = computed(() => {
      const d = pro.memberSince ? new Date(pro.memberSince) : null;
      return d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString(undefined, { month: "short", year: "numeric" }) : "";
    });

    const PLAN_NAMES: Record<string, string> = { monthly: "Monthly", yearly: "Yearly", lifetime: "Lifetime" };
    const planLabel = computed(() => (pro.plan ? PLAN_NAMES[pro.plan] ?? pro.plan : ""));

    async function copyKey() {
      try {
        await navigator.clipboard.writeText(pro.licenseKey);
        await proToast("Key copied.", "success");
      } catch {
        await proToast("Could not copy the key on this device.");
      }
    }

    async function restore() {
      await pro.restoreWithKey(keyInput.value);
      if (pro.isPro) keyInput.value = "";
    }

    return { pro, keyInput, emailInput, maskedKey, dateLabel, sinceLabel, planLabel, copyKey, restore };
  },
});

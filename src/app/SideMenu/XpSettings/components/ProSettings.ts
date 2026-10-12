import { computed, defineComponent, onMounted, ref } from "vue";
import { arrowBack } from "ionicons/icons";
import ionic from "@/lib/mixins/ionic";
import { useProStore } from "@/lib/store/stores/pro";
import { proToast } from "@/lib/services/pro/proUi";

export default defineComponent({
  name: "pro-settings",
  mixins: [ionic],
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

    return { pro, keyInput, emailInput, maskedKey, dateLabel, copyKey, restore, arrowBack };
  },
});

import { defineComponent, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import ionic from "@/lib/mixins/ionic";
import { useProStore } from "@/lib/store/stores/pro";
import { proToast } from "@/lib/services/pro/proUi";
import { useBack } from "@/hooks/useBack";

export default defineComponent({
  name: "xp-pro-return",
  mixins: [ionic],
  setup() {
    const route = useRoute();
    const router = useRouter();
    const { back } = useBack();
    const pro = useProStore();
    const timedOut = ref(false);

    async function claim() {
      timedOut.value = false;
      const ok = await pro.claimWithRetry({ keepClaiming: true });
      if (!ok) {
        timedOut.value = true;
        return;
      }
      await proToast("XP Pro unlocked!", "success");
      // After Stripe the history behind this page is the checkout, not the app: Back goes back only inside the app,
      // and otherwise up to the Pro settings (parentOf).
      back();
    }

    function retry() {
      claim();
    }

    onMounted(() => {
      // Stripe puts session_id, purchased and status after the hash; vue-router reads them from route.query
      if (route.query.status === "cancelled") {
        router.replace("/pro");
        return;
      }
      claim();
    });

    return { timedOut, retry };
  },
});

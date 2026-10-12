import { computed, defineComponent, onMounted, ref } from "vue";
import ionic from "@/lib/mixins/ionic";
import { play$fx } from "@/assets/fx";
import { useProStore } from "@/lib/store/stores/pro";
import { fetchPlans, ProPlanInfo } from "@/lib/services/pro/proClient";
import { PRO_GATE_NAMES, PRO_PLANS, ProPlanId } from "@/lib/services/pro/proPlans";

const TITLES: Record<ProPlanId, string> = {
  monthly: "Monthly",
  yearly: "Yearly",
  lifetime: "Founder's Lifetime",
};

const PER_LABEL: Record<ProPlanId, string> = {
  monthly: " / month",
  yearly: " / year",
  lifetime: " once",
};

/** What the page shows before (or without) the server catalog: the two subscriptions, lifetime hidden. */
const fallbackPlans = (): Record<ProPlanId, Partial<ProPlanInfo>> => ({
  monthly: { price: PRO_PLANS.monthly.price, trial_days: 7, on_sale: true },
  yearly: { price: PRO_PLANS.yearly.price, trial_days: 7, on_sale: true },
  lifetime: { price: PRO_PLANS.lifetime.price, trial_days: 0, on_sale: false },
});

export default defineComponent({
  name: "xp-go-pro",
  mixins: [ionic],
  setup() {
    const pro = useProStore();
    const catalog = ref<Record<ProPlanId, Partial<ProPlanInfo>>>(fallbackPlans());

    onMounted(async () => {
      try {
        catalog.value = await fetchPlans();
      } catch {
        // offline: the built-in prices stand and lifetime stays hidden
      }
    });

    const items = computed(() =>
      (["monthly", "yearly", "lifetime"] as ProPlanId[])
        .filter((id) => catalog.value[id] && catalog.value[id].on_sale !== false)
        .map((id) => {
          const info = catalog.value[id];
          const price = Number(info.price ?? PRO_PLANS[id].price);
          return {
            id,
            title: TITLES[id],
            priceLabel: `$${price.toFixed(2)}${PER_LABEL[id]}`,
            trial: id !== "lifetime" && (info.trial_days ?? PRO_PLANS[id].trialDays) > 0,
          };
        })
    );

    async function buy(id: ProPlanId) {
      play$fx("select");
      await pro.purchase(id);
    }

    return { pro, items, buy, gateNames: PRO_GATE_NAMES };
  },
});

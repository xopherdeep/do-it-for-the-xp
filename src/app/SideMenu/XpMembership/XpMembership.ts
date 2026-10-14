import { computed, defineComponent, onMounted, ref } from "vue";
import { Capacitor } from "@capacitor/core";
import { checkmarkCircle, ribbonOutline, sparklesOutline } from "ionicons/icons";
import Ionic from "@/lib/mixins/ionic";
import { play$fx } from "@/assets/fx";
import { useProStore } from "@/lib/store/stores/pro";
import { fetchPlans, ProPlanInfo } from "@/lib/services/pro/proClient";
import { PRO_GATE_NAMES, PRO_PLANS, ProGate, ProPlanId } from "@/lib/services/pro/proPlans";
import { PLAN_TITLES } from "@/lib/services/pro/membershipStatus";
import debug from "@/lib/utils/debug";
import ProStatusCard from "./components/ProStatusCard.vue";

const PER_LABEL: Record<ProPlanId, string> = {
  monthly: " / month",
  yearly: " / year",
  lifetime: " once",
};

const PERK_TEXT: Record<ProGate, string> = {
  templeCreator: "build your own dungeons",
  advancedSchedule: "custom repeats, times of day, several times a day",
  aiHelpers: "beast names, quest checklists, schedule ideas",
  gameStyles: "Dragon Quest, Pokémon, Secret of Mana, Phantasy Star, Virtual Boy and Mario RPG looks",
};

/** What the page shows before (or without) the server catalog: the two subscriptions, lifetime hidden. */
const fallbackPlans = (): Record<ProPlanId, Partial<ProPlanInfo>> => ({
  monthly: { price: PRO_PLANS.monthly.price, trial_days: 7, on_sale: true },
  yearly: { price: PRO_PLANS.yearly.price, trial_days: 7, on_sale: true },
  lifetime: { price: PRO_PLANS.lifetime.price, trial_days: 0, on_sale: false },
});

export default defineComponent({
  name: "xp-membership",
  mixins: [Ionic],
  components: { ProStatusCard },
  setup() {
    const pro = useProStore();
    const native = Capacitor.isNativePlatform();
    const catalog = ref<Record<ProPlanId, Partial<ProPlanInfo>>>(fallbackPlans());

    onMounted(async () => {
      pro.init().catch(() => undefined);
      try {
        catalog.value = await fetchPlans();
      } catch (error) {
        // offline: the built-in prices stand and lifetime stays hidden
        debug.warn("[XpMembership] could not fetch the plan catalog", error);
      }
    });

    const hasLifetime = computed(() => pro.isPro && pro.plan === "lifetime");

    const items = computed(() =>
      (["monthly", "yearly", "lifetime"] as ProPlanId[])
        .filter((id) => catalog.value[id] && catalog.value[id].on_sale !== false)
        .map((id) => {
          const info = catalog.value[id];
          const price = Number(info.price ?? PRO_PLANS[id].price);
          return {
            id,
            title: PLAN_TITLES[id],
            priceLabel: `$${price.toFixed(2)}${PER_LABEL[id]}`,
            trial: id !== "lifetime" && (info.trial_days ?? PRO_PLANS[id].trialDays) > 0,
          };
        })
    );

    const perks = (Object.keys(PRO_GATE_NAMES) as ProGate[]).map((gate) => ({
      gate,
      name: PRO_GATE_NAMES[gate],
      text: PERK_TEXT[gate],
    }));

    async function buy(id: ProPlanId) {
      play$fx("select");
      await pro.purchase(id);
    }

    return { pro, native, hasLifetime, items, perks, buy, checkmarkCircle, ribbonOutline, sparklesOutline };
  },
});

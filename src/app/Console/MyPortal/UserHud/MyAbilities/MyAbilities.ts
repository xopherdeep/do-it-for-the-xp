import { computed, defineComponent, onMounted, ref, watch } from "vue";
import ionic from "@/lib/mixins/ionic";
import { onIonViewWillEnter, toastController } from "@ionic/vue";
import {
  arrowBack,
  colorWandOutline,
  flashOutline,
  keyOutline,
  lockClosedOutline,
  lockOpenOutline,
} from "ionicons/icons";
import { useUserStore } from "@/lib/store/stores/user";
import { useAbilitySystem } from "@/hooks/abilities/useAbilitySystem";
import { useCopy } from "@/hooks/useVoice";
import {
  computeHeroAbilityStatuses,
  groundedReasonOf,
  heroAbilitySnapshot,
} from "@/lib/services/abilities/heroAbilityStatus";
import { getCastLogDb, lastCastsOf } from "@/lib/databases/CastLogDb";
import type { Ability } from "@/types/abilities";
import { play$fx } from "@/assets/fx";
import { buildPowerRow, type PowerRow } from "./powerRow";
import XpLoading from "@/components/molecules/Loading/XpLoading.vue";
import XpAppBottomNav from "@/components/organisms/BottomNav/XpAppBottomNav.vue";
import type { AppNavTab } from "@/components/organisms/BottomNav/appBottomNav";
import { useAppSkin } from "@/components/organisms/XpApp/useAppSkin";

/** The tabs of the Powers page: everything, the two kinds, and whether the hero has earned them yet */
export type PowerFilter = "all" | "real-life" | "in-game" | "unlocked" | "locked";

const FILTERS: PowerFilter[] = ["all", "real-life", "in-game", "unlocked", "locked"];

const POWER_TABS: AppNavTab[] = [
  { id: "all", label: "All", ionIcon: colorWandOutline },
  { id: "real-life", label: "Privileges", ionIcon: keyOutline },
  { id: "in-game", label: "Spells", ionIcon: flashOutline },
  { id: "unlocked", label: "Unlocked", ionIcon: lockOpenOutline },
  { id: "locked", label: "Locked", ionIcon: lockClosedOutline },
];

/** Privileges (real-life) come before Spells (in-game) */
const TYPE_ORDER: Record<string, number> = { "real-life": 0, "in-game": 1 };

/** The section headers of the list: Privileges first, then Spells */
const GROUP_LABEL: Record<string, string> = { "real-life": "Privileges", "in-game": "Spells" };

export interface PowerGroup {
  type: string;
  label: string;
  rows: PowerRow[];
}

const byTypeThenName = (a: Ability, b: Ability): number =>
  (TYPE_ORDER[a.type] ?? 2) - (TYPE_ORDER[b.type] ?? 2) || a.name.localeCompare(b.name);

export default defineComponent({
  props: ["userId"],
  name: "my-abilities",
  components: {
    XpLoading,
    XpAppBottomNav,
  },
  mixins: [ionic],
  setup(props) {
    const userStore = useUserStore();
    const t = useCopy();
    // The phone app skin (Retro / Modern follows the profile toggle) with the purple Spells accent
    const { rootClass, rootStyle } = useAppSkin("spells");
    const { abilities, isLoading, isInitialized, useAbility: castPower, refresh } = useAbilitySystem();

    // The hero is the route's user, or whoever is playing when the route names no one
    const heroId = computed(() => String(props.userId || userStore.currentUser.id || ""));
    const hero = computed(() => userStore.users[heroId.value] ?? null);

    // Cooldowns and AP windows depend on the clock: it is read again on entering the page and after every cast
    const now = ref(new Date());
    const snapshot = computed(() => heroAbilitySnapshot(hero.value ?? {}, now.value));
    // A hero who owes the Hospital cannot cast: every card keeps its Cast button disabled with this reason
    const groundedReason = computed(() => groundedReasonOf(hero.value ?? {}));
    // The hero's own Cast Log decides the cooldowns: Power id to the ISO time of their newest cast
    const lastCasts = ref<Record<string, string>>({});
    const loadLastCasts = async () => {
      if (!heroId.value) {
        lastCasts.value = {};
        return;
      }
      try {
        lastCasts.value = lastCastsOf(await getCastLogDb().getForHero(heroId.value));
      } catch {
        lastCasts.value = {};
      }
    };
    const statusMap = computed(() =>
      computeHeroAbilityStatuses(abilities.value, hero.value ?? {}, [], now.value, lastCasts.value)
    );
    const statuses = computed(() => statusMap.value.statuses);
    const unlocks = computed(() => statusMap.value.unlocks);

    const filter = ref<PowerFilter>("all");
    const search = ref("");

    const visible = computed<Ability[]>(() => {
      const words = String(search.value ?? "")
        .trim()
        .toLowerCase();
      return abilities.value
        .filter((ability) => {
          const isTypeFilter = filter.value === "real-life" || filter.value === "in-game";
          if (isTypeFilter) return ability.type === filter.value;
          if (filter.value === "unlocked") return Boolean(unlocks.value[ability.id]);
          if (filter.value === "locked") return !unlocks.value[ability.id];
          return true;
        })
        .filter((ability) => !words || `${ability.name} ${ability.description}`.toLowerCase().includes(words))
        .sort(byTypeThenName);
    });

    // The Power being cast right now, so a double tap cannot charge the MP twice
    const casting = ref("");

    // One row per visible Power, grouped under Privileges and Spells (the list is already sorted that way)
    const groups = computed<PowerGroup[]>(() => {
      const result: PowerGroup[] = [];
      visible.value.forEach((ability) => {
        const row = buildPowerRow(ability, statuses.value[ability.id] || "locked", snapshot.value, {
          groundedReason: groundedReason.value,
          casting: casting.value === ability.id,
        });
        const last = result[result.length - 1];
        if (last && last.type === ability.type) last.rows.push(row);
        else result.push({ type: ability.type, label: GROUP_LABEL[ability.type] ?? "Powers", rows: [row] });
      });
      return result;
    });

    // The hero's MP, as the app bar's meta
    const mpMeta = computed(() => (hero.value ? `${Math.floor(snapshot.value.mp)} MP` : ""));

    // A tapped row opens in place: the one-line description shows in full
    const openId = ref("");
    const toggleOpen = (abilityId: string) => {
      openId.value = openId.value === abilityId ? "" : abilityId;
    };

    const cast = async (abilityId: string) => {
      const isCastBlocked = Boolean(casting.value) || !heroId.value || Boolean(groundedReason.value);
      if (isCastBlocked) return;
      const name = abilities.value.find((ability) => ability.id === abilityId)?.name ?? "Power";
      casting.value = abilityId;
      try {
        // A refusal (not enough MP, not available) is toasted by the composable
        const result = await castPower(abilityId, heroId.value);
        if (!result.ok) return;
        play$fx("select");
        await loadLastCasts();
        const toast = await toastController.create({
          message: t("powers.toast.cast", { name }),
          cssClass: "rpg-toast",
          position: "top",
          duration: 1800,
        });
        await toast.present();
        now.value = new Date();
      } finally {
        casting.value = "";
      }
    };

    const segmentChanged = (event: CustomEvent) => {
      const value = event.detail?.value as PowerFilter;
      const shouldIgnoreSegment = !FILTERS.includes(value) || value === filter.value;
      if (shouldIgnoreSegment) return;
      filter.value = value;
      play$fx("cursor");
    };

    // The page is cached by the router: on coming back the clock moves on and the Game Master may have added Powers
    onIonViewWillEnter(() => {
      now.value = new Date();
      void loadLastCasts();
      if (isInitialized.value) void refresh();
    });
    onMounted(() => void loadLastCasts());
    watch(heroId, () => void loadLastCasts());

    return {
      abilities,
      isLoading,
      heroId,
      hero,
      snapshot,
      groundedReason,
      statuses,
      unlocks,
      rootClass,
      rootStyle,
      t,
      groups,
      mpMeta,
      openId,
      toggleOpen,
      filter,
      search,
      visible,
      casting,
      cast,
      segmentChanged,
      powerTabs: POWER_TABS,
      arrowBack,
      colorWandOutline,
      flashOutline,
      keyOutline,
      lockClosedOutline,
      lockOpenOutline,
    };
  },
});

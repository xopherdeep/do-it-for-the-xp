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
import debug from "@/lib/utils/debug";
import { useQuestPicker } from "@/hooks/quests/useQuestPicker";
import { castWithBoardEffect } from "./boardCast";
import { usePowerTimers } from "@/hooks/abilities/usePowerTimers";
import XpPowerTimerBar from "@/components/organisms/PowerTimers/XpPowerTimerBar.vue";
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
    XpPowerTimerBar,
  },
  mixins: [ionic],
  setup(props) {
    const userStore = useUserStore();
    const t = useCopy();
    // The phone app skin (Retro / Modern follows the profile toggle) with the purple Spells accent
    const { rootClass, rootStyle } = useAppSkin("spells");
    const { abilities, isLoading, isReady, triggerAbility: castPower, refresh } = useAbilitySystem();

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
    // Timed privileges that are running: their rows say how long is left and keep Cast off until time is up
    const { timers } = usePowerTimers(heroId);
    const timerLeftOf = computed<Record<string, string>>(() =>
      Object.fromEntries(timers.value.map((timer) => [timer.abilityId, timer.left]))
    );

    // One row per visible Power, grouped under Privileges and Spells (the list is already sorted that way)
    const groups = computed<PowerGroup[]>(() => {
      const result: PowerGroup[] = [];
      visible.value.forEach((ability) => {
        const row = buildPowerRow(ability, statuses.value[ability.id] || "locked", snapshot.value, {
          groundedReason: groundedReason.value,
          casting: casting.value === ability.id,
          timerLeft: timerLeftOf.value[ability.id] ?? null,
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

    const say = async (message: string) => {
      const toast = await toastController.create({
        message,
        cssClass: "rpg-toast",
        position: "top",
        duration: 1800,
      });
      await toast.present();
    };

    const cast = async (abilityId: string) => {
      const ability = abilities.value.find((entry) => entry.id === abilityId);
      const isCastBlocked = !ability || Boolean(casting.value) || !heroId.value || Boolean(groundedReason.value);
      if (isCastBlocked) return;
      casting.value = abilityId;
      try {
        // A Power that bends the quest board asks which quest first and lands its effect after the cast;
        // a refusal of the cast itself (not enough MP, not available) is toasted by the composable
        const { openQuests, selectQuest } = useQuestPicker(heroId.value);
        const outcome = await castWithBoardEffect(ability, heroId.value, { openQuests, selectQuest, cast: castPower });
        const wasRefused = outcome.status === "refused";
        if (wasRefused) {
          play$fx(outcome.sound ?? "no");
          await say(outcome.line ?? "That cannot be cast right now.");
          return;
        }
        // Backing out of the quest pick and a refused cast say nothing more
        const wasCast = outcome.status === "cast";
        if (!wasCast) return;
        play$fx(outcome.sound ?? "select");
        await loadLastCasts();
        await say(outcome.line ?? t("powers.toast.cast", { name: ability.name }));
        now.value = new Date();
      } catch (error) {
        // Something broke once the cast may have been paid (landing the effect, the cast log): say so, never nothing
        debug.error("[MyAbilities] cast failed", error);
        play$fx("no");
        await loadLastCasts();
        await say("Something went wrong. Your Power may still have been cast.");
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
      if (isReady.value) void refresh();
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

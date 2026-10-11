import { computed, defineComponent, ref } from "vue";
import ionic from "@/lib/mixins/ionic";
import { IonBackButton, onIonViewWillEnter, toastController } from "@ionic/vue";
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
import { computeHeroAbilityStatuses, heroAbilitySnapshot } from "@/lib/services/abilities/heroAbilityStatus";
import type { Ability } from "@/types/abilities";
import { play$fx } from "@/assets/fx";
import XpPowerCard from "./components/XpPowerCard.vue";
import XpLoading from "@/components/molecules/Loading/XpLoading.vue";

/** The tabs of the Powers page: everything, the two kinds, and whether the hero has earned them yet */
export type PowerFilter = "all" | "real-life" | "in-game" | "unlocked" | "locked";

const FILTERS: PowerFilter[] = ["all", "real-life", "in-game", "unlocked", "locked"];

/** Privileges (real-life) come before Spells (in-game) */
const TYPE_ORDER: Record<string, number> = { "real-life": 0, "in-game": 1 };

const byTypeThenName = (a: Ability, b: Ability): number =>
  (TYPE_ORDER[a.type] ?? 2) - (TYPE_ORDER[b.type] ?? 2) || a.name.localeCompare(b.name);

export default defineComponent({
  props: ["userId"],
  name: "my-abilities",
  components: {
    IonBackButton,
    XpLoading,
    XpPowerCard,
  },
  mixins: [ionic],
  setup(props) {
    const userStore = useUserStore();
    const { abilities, isLoading, isInitialized, useAbility: castPower, refresh } = useAbilitySystem();

    // The hero is the route's user, or whoever is playing when the route names no one
    const heroId = computed(() => String(props.userId || userStore.currentUser.id || ""));
    const hero = computed(() => userStore.users[heroId.value] ?? null);

    // Cooldowns and AP windows depend on the clock: it is read again on entering the page and after every cast
    const now = ref(new Date());
    const snapshot = computed(() => heroAbilitySnapshot(hero.value ?? {}, now.value));
    const statusMap = computed(() =>
      computeHeroAbilityStatuses(
        abilities.value,
        hero.value ?? {},
        [],
        now.value
        // TODO(powers): pass the hero's last casts (P6)
      )
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
          if (filter.value === "real-life" || filter.value === "in-game") return ability.type === filter.value;
          if (filter.value === "unlocked") return Boolean(unlocks.value[ability.id]);
          if (filter.value === "locked") return !unlocks.value[ability.id];
          return true;
        })
        .filter((ability) => !words || `${ability.name} ${ability.description}`.toLowerCase().includes(words))
        .sort(byTypeThenName);
    });

    // The Power being cast right now, so a double tap cannot charge the MP twice
    const casting = ref("");

    const cast = async (abilityId: string) => {
      if (casting.value || !heroId.value) return;
      const name = abilities.value.find((ability) => ability.id === abilityId)?.name ?? "Power";
      casting.value = abilityId;
      try {
        // A refusal (not enough MP, not available) is toasted by the composable
        const result = await castPower(abilityId, heroId.value);
        if (!result.ok) return;
        play$fx("select");
        const toast = await toastController.create({
          message: `Cast! ${name}`,
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
      if (!FILTERS.includes(value) || value === filter.value) return;
      filter.value = value;
      play$fx("cursor");
    };

    // The page is cached by the router: on coming back the clock moves on and the Game Master may have added Powers
    onIonViewWillEnter(() => {
      now.value = new Date();
      if (isInitialized.value) void refresh();
    });

    return {
      abilities,
      isLoading,
      heroId,
      hero,
      snapshot,
      statuses,
      unlocks,
      filter,
      search,
      visible,
      casting,
      cast,
      segmentChanged,
      arrowBack,
      colorWandOutline,
      flashOutline,
      keyOutline,
      lockClosedOutline,
      lockOpenOutline,
    };
  },
});

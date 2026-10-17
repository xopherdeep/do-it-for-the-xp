import { computed, defineComponent, onMounted, ref } from "vue";
import { toastController } from "@ionic/vue";
import { play$fx } from "@/assets/fx";
import { rpgToastOptions } from "@/hooks/useToast";
import ionic from "@/lib/mixins/ionic";
import { getQuestLogDb, type QuestLogEntry } from "@/lib/databases/QuestLogDb";
import { heroAvatarSrc } from "@/lib/hero-look/look";
import { levelUpsOf, recapHeroesOf } from "@/lib/services/insights/recapRoster";
import { recapShareText, weeklyRecap } from "@/lib/services/insights/weeklyRecap";
import type { RecapLevelUp, RecapSpan } from "@/lib/services/insights/weeklyRecap";
import { useNotificationsStore } from "@/lib/store/stores/notifications";
import { useUserStore } from "@/lib/store/stores/user";
import { canManageFamily } from "@/router/_Guards/gm.guard";
import debug from "@/lib/utils/debug";
import { shareRecapText } from "./shareRecap";

const requireAvatar = require.context("@/assets/images/avatars/", false, /\.svg$/);

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const SHARE_TOASTS = {
  copied: "Recap copied! Paste it anywhere.",
  failed: "Could not share the recap.",
} as const;

/** "Oct 9" from a YYYY-MM-DD day */
const shortDay = (dayKey: string): string => {
  const [year, month, day] = dayKey.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

/**
 * "This week in the village" (services/insights/weeklyRecap.ts): the family's week at a glance. A Game Master sees a
 * card for every hero, a hero sees their own card and the family total. Shareable as plain text.
 */
export default defineComponent({
  name: "my-recap",
  mixins: [ionic],
  props: { userId: { type: String, default: "" } },
  setup(props) {
    const userStore = useUserStore();
    const notifications = useNotificationsStore();
    const entries = ref<QuestLogEntry[]>([]);
    const levelUps = ref<RecapLevelUp[]>([]);
    const loaded = ref(false);
    const span = ref<RecapSpan>("rolling");

    const viewerId = computed(() => String(props.userId || userStore.currentUser?.id || ""));
    const isGameMaster = computed(() => canManageFamily());
    const heroes = computed(() => recapHeroesOf(userStore.users));
    const recap = computed(() =>
      weeklyRecap(entries.value, heroes.value, new Date(), { span: span.value, levelUps: levelUps.value })
    );
    const shownHeroes = computed(() =>
      recap.value.heroes
        .filter((hero) => isGameMaster.value || hero.heroId === viewerId.value)
        .map((hero) => ({
          ...hero,
          avatarSrc: heroAvatarSrc(userStore.users[hero.heroId], requireAvatar) || requireAvatar("./001-gamer.svg"),
          isHeroOfTheWeek: recap.value.heroOfTheWeek?.heroId === hero.heroId && heroes.value.length > 1,
          topBeasts: hero.beasts.slice(0, 3),
          busiest: hero.busiestDay ? WEEKDAYS[hero.busiestDay.weekday] : "",
        }))
    );
    const range = computed(() => `${shortDay(recap.value.from)} to ${shortDay(recap.value.to)}`);
    const familyBusiest = computed(() => {
      const day = recap.value.family.busiestDay;
      return day ? `${WEEKDAYS[day.weekday]} (${day.chores})` : "";
    });
    const crownLine = computed(() => {
      const isTeamWin = recap.value.teamWin;
      if (isTeamWin) return "Team win! Everyone finished level.";
      const hero = recap.value.heroOfTheWeek;
      const isShown = Boolean(hero) && heroes.value.length > 1;
      return isShown ? `Hero of the week: ${hero!.name}` : "";
    });

    const load = async () => {
      try {
        entries.value = await getQuestLogDb().getEntries();
        const ups: RecapLevelUp[] = [];
        for (const hero of heroes.value) {
          await notifications.load(hero.id);
          ups.push(...levelUpsOf(notifications.forHero(hero.id), hero.id));
        }
        levelUps.value = ups;
      } catch (error) {
        debug.warn("recap: could not read the quest log", error);
      } finally {
        loaded.value = true;
      }
    };

    const chooseSpan = (next: RecapSpan) => {
      play$fx("cursor");
      span.value = next;
    };

    const share = async () => {
      play$fx("select");
      const outcome = await shareRecapText("This week in the village", recapShareText(recap.value));
      const message = outcome === "copied" || outcome === "failed" ? SHARE_TOASTS[outcome] : "";
      if (!message) return;
      const toast = await toastController.create(rpgToastOptions(message));
      await toast.present();
    };

    onMounted(() => void load());

    return { loaded, span, recap, shownHeroes, range, familyBusiest, crownLine, isGameMaster, chooseSpan, share };
  },
});

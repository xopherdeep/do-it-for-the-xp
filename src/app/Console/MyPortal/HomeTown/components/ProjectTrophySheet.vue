<template>
  <ion-modal :is-open="open" class="trophy-sheet" :class="rootClass" :style="rootStyle" @didDismiss="emit('close')">
    <ion-header>
      <ion-toolbar>
        <xp-app-header :title="t('projectFinish.trophy.title')" icon="trophy" data-test="trophy-title">
          <template #end><xp-close-button size="lg" color="light" aria-label="Close" data-test="sheet-close" @click="emit('close')" /></template>
        </xp-app-header>
      </ion-toolbar>
    </ion-header>

    <ion-content :scroll-y="true">
      <p v-if="!isLoaded" class="tp-loading" aria-busy="true"><i class="fad fa-spinner fa-spin" aria-hidden="true"></i></p>

      <!-- Every cleared run, the one cleared last first; a tap picks the one the buttons below are for -->
      <ul v-else-if="runs.length" class="tp-runs">
        <li v-for="run in runs" :key="run.id">
          <button type="button" class="tp-run" :aria-pressed="run.id === pickedId" data-test="trophy" @click="pick(run.id)">
            <span class="tp-run__tower"><i class="fad fa-trophy" aria-hidden="true"></i> {{ run.towerName }}</span>
            <span class="tp-run__dates">{{ t("projectFinish.trophy.dates", { start: dayText(run.startOn), finish: dayText(run.finishedOn) }) }}</span>
            <span class="tp-run__early">{{ earlyLine(run) }}</span>
            <span class="tp-run__reward">{{ t("projectFinish.trophy.reward", { reward: run.rewardText }) }}</span>
            <span class="tp-run__given" :data-state="run.isRewardGiven ? 'given' : 'waiting'">
              {{ run.isRewardGiven ? t("projectFinish.trophy.given") : t("projectFinish.trophy.waiting") }}
            </span>
            <span class="tp-run__bonus">{{ t("projectFinish.trophy.bonus") }}</span>
            <span class="tp-floors">
              <span v-for="floor in run.floors" :key="floor.floorKey" class="tp-floor" data-test="trophy-floor">
                <span class="tp-floor__key">{{ floor.floorKey }}</span>
                <span class="tp-floor__name">{{ floor.name }}</span>
                <span class="tp-floor__multiplier">{{ t("projectFinish.trophy.multiplier", { multiplier: floor.multiplier.toFixed(1) }) }}</span>
              </span>
            </span>
          </button>
        </li>
      </ul>

      <p v-else class="tp-empty" data-test="trophy-empty">{{ t("projectFinish.trophy.empty") }}</p>
    </ion-content>

    <!-- The actions sit at the bottom, in thumb reach; starting again is the Game Master's -->
    <ion-footer v-if="picked">
      <div class="xp-app-bar tp-bar">
        <button type="button" class="xp-app-btn tp-bar__watch" data-test="trophy-watch" @click="watchCredits">
          <i class="fad fa-scroll" aria-hidden="true"></i>
          {{ t("projectFinish.trophy.watch") }}
        </button>
        <button v-if="isGameMaster" type="button" class="xp-app-btn xp-app-btn--ghost tp-bar__again" data-test="trophy-again" @click="startAgain">
          <i class="fad fa-redo" aria-hidden="true"></i>
          {{ t("projectFinish.trophy.again") }}
        </button>
      </div>
    </ion-footer>

    <credits-roll v-if="credits" :credits="credits" @done="credits = null" />
  </ion-modal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { IonContent, IonFooter, IonHeader, IonModal, IonToolbar } from "@ionic/vue";
import { play$fx } from "@/assets/fx";
import XpCloseButton from "@/components/atoms/CloseButton/XpCloseButton.vue";
import CreditsRoll from "@/components/organisms/CreditsRoll/CreditsRoll.vue";
import XpAppHeader from "@/components/organisms/XpApp/XpAppHeader.vue";
import { useAppSkin } from "@/components/organisms/XpApp/useAppSkin";
import { useToast } from "@/hooks/useToast";
import { useCopy, useVoice } from "@/hooks/useVoice";
import { creditHeroesOf, creditsViewOf, trophyOf, type CreditsView, type TrophyView } from "@/lib/services/projects/projectFinish";
import type { ProjectRecord } from "@/lib/services/projects/projectRecord";
import { readFinish, readTrophies } from "@/lib/services/projects/projectService";
import { dayText } from "@/lib/services/projects/projectWizard";
import { useUserStore } from "@/lib/store/stores/user";
import debug from "@/lib/utils/debug";
import { canAccessGameMaster } from "@/router/_Guards/gm.guard";

/**
 * The trophy of a cleared tower, in Hometown: every cleared run, the one cleared last first, with its dates, how early
 * it was cleared, the family reward and each floor's multiplier. A tap picks a run; "Watch the credits" rolls its
 * credits again, and a Game Master can "Start again" (the wizard on the run's type, which starts from its chore list).
 * The rules are projectFinish and projectService; this holds what is on screen. Its rooms hold no fights: it is a
 * sheet, not a walk.
 */
const props = defineProps<{ open: boolean }>();
const emit = defineEmits(["close", "start-again"]);

const { rootClass, rootStyle } = useAppSkin("quests");
const t = useCopy();
const { voice } = useVoice();
const { showToast } = useToast();
const userStore = useUserStore();

const runs = ref<TrophyView[]>([]);
const pickedId = ref("");
const isLoaded = ref(false);
const isGameMaster = ref(false);
const credits = ref<CreditsView | null>(null);

let opening = 0;

// ---- Reading the trophies ------------------------------------------------------------------------------------------------

const readQuietly = async (): Promise<ProjectRecord[]> => {
  try {
    return await readTrophies();
  } catch (error) {
    debug.warn("[ProjectTrophy] the trophies could not be read", error);
    return [];
  }
};

const begin = async () => {
  opening += 1;
  const ticket = opening;
  isLoaded.value = false;
  credits.value = null;
  isGameMaster.value = canAccessGameMaster();
  const records = await readQuietly();
  const isStale = ticket !== opening;
  if (isStale) return;
  runs.value = records.map((record) => trophyOf(record, voice.value));
  pickedId.value = runs.value[0]?.id ?? "";
  isLoaded.value = true;
};

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) void begin();
  },
  { immediate: true }
);

const picked = computed(() => runs.value.find((run) => run.id === pickedId.value));

const pick = (id: string) => {
  const isAlreadyPicked = id === pickedId.value;
  if (isAlreadyPicked) return;
  play$fx("cursor");
  pickedId.value = id;
};

/** "Done 2 days early!", "Done 1 day early!" or "Done right on time!" */
const earlyLine = (run: TrophyView): string => {
  const isOnTime = run.daysEarly === 0;
  if (isOnTime) return t("projectFinish.trophy.onTime");
  const isOneDay = run.daysEarly === 1;
  return isOneDay ? t("projectFinish.trophy.earlyOne") : t("projectFinish.trophy.early", { days: run.daysEarly });
};

// ---- The buttons --------------------------------------------------------------------------------------------------------

const sayCreditsFailed = () => {
  play$fx("no");
  void showToast(t("projectFinish.credits.failed"), 4000);
};

const watchCredits = async () => {
  try {
    const finish = await readFinish(pickedId.value);
    if (!finish) {
      sayCreditsFailed();
      return;
    }
    credits.value = creditsViewOf(finish.project, finish.quests, finish.paid, creditHeroesOf(userStore.usersAz), voice.value);
  } catch (error) {
    debug.warn("[ProjectTrophy] the credits could not be read", error);
    sayCreditsFailed();
  }
};

const startAgain = () => {
  const run = picked.value;
  if (!run) return;
  play$fx("select");
  emit("start-again", run.typeId);
};
</script>

<style lang="scss" scoped src="./_ProjectTrophySheet.scss" />

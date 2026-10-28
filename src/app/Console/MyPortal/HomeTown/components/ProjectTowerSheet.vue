<template>
  <ion-modal :is-open="open" class="tower-sheet" :class="rootClass" :style="rootStyle" @didDismiss="emit('close')">
    <ion-header>
      <ion-toolbar>
        <xp-app-header :title="title" icon="dungeon" data-test="sheet-title">
          <template #end><xp-close-button size="lg" color="light" aria-label="Close" data-test="sheet-close" @click="emit('close')" /></template>
        </xp-app-header>
      </ion-toolbar>
    </ion-header>

    <ion-content :scroll-y="true">
      <p v-if="view === 'loading'" class="pt-loading" aria-busy="true"><i class="fad fa-spinner fa-spin" aria-hidden="true"></i></p>

      <!-- The tower is standing: where the family is on it, and every floor -->
      <section v-else-if="clock" class="pt-section" data-test="tower">
        <article class="pt-current" data-test="current-floor">
          <span class="pt-current__label">{{ t("projectTower.sheet.current") }}</span>
          <h2 class="pt-current__name">{{ clock.floorKey }} &middot; {{ clock.name }}</h2>
          <p class="pt-clock" :data-state="clock.state" data-test="floor-clock">{{ clock.line }}</p>
          <p v-if="clock.offer" class="pt-offer" data-test="bonus-offer"><i class="fad fa-sparkles" aria-hidden="true"></i> {{ clock.offer }}</p>
          <p class="pt-ends">{{ t("projectTower.sheet.endsOn", { date: endsText }) }}</p>
        </article>

        <h3 class="pt-sub">{{ t("projectTower.sheet.floors") }}</h3>
        <ol class="pt-floors">
          <li v-for="row in rows" :key="row.floorKey" class="pt-floor" :data-state="row.state" data-test="floor-row">
            <i :class="['fad', STATE_ICONS[row.state]]" aria-hidden="true"></i>
            <span class="pt-floor__key">{{ row.floorKey }}</span>
            <span class="pt-floor__name">{{ row.name }}</span>
            <span class="pt-floor__state">{{ t(`projectTower.state.${row.state}`) }}</span>
          </li>
        </ol>
      </section>

      <!-- No tower is standing. The trophy of the last cleared run takes this slot (Task 11); until then, a plain line -->
      <slot v-else name="empty">
        <p class="pt-empty" data-test="empty">{{ t("projectTower.sheet.empty") }}</p>
      </slot>
    </ion-content>

    <!-- The actions sit at the bottom, in thumb reach; the Game Master's two come after the one everyone has -->
    <ion-footer v-if="clock">
      <div class="xp-app-bar pt-bar">
        <div v-if="isEditingEnd" class="pt-end" data-test="end-editor">
          <label class="pt-field">
            <span class="pt-field__label">{{ t("projectTower.sheet.endLabel") }}</span>
            <input v-model="endOn" type="date" class="pt-date" :min="today" :aria-label="t('projectTower.sheet.endLabel')" data-test="end-date" />
          </label>
          <button type="button" class="xp-app-btn" data-test="end-move" @click="moveEnd">{{ t("projectTower.sheet.endMove") }}</button>
          <p v-if="endProblem" class="pt-problem" role="alert" data-test="end-problem">{{ endProblem }}</p>
        </div>
        <div class="pt-actions">
          <button type="button" class="xp-app-btn pt-actions__enter" data-test="enter" @click="emit('enter')">
            <i class="fad fa-dungeon" aria-hidden="true"></i>
            {{ t("projectTower.sheet.enter") }}
          </button>
          <template v-if="isGameMaster">
            <button type="button" class="xp-app-btn xp-app-btn--ghost" data-test="move-end" @click="toggleEnd">
              <i class="fad fa-calendar-alt" aria-hidden="true"></i>
              {{ t("projectTower.sheet.moveEnd") }}
            </button>
            <button type="button" class="xp-app-btn xp-app-btn--ghost pt-actions__abandon" data-test="abandon" @click="abandon">
              <i class="fad fa-flag" aria-hidden="true"></i>
              {{ t("projectTower.sheet.abandon") }}
            </button>
          </template>
        </div>
      </div>
    </ion-footer>

    <!-- The Game Master's confirm: the game's own prompt, never a native alert -->
    <xp-reveal-prompt :prompt="prompt" @respond="submitAnswer" />
  </ion-modal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { IonContent, IonFooter, IonHeader, IonModal, IonToolbar } from "@ionic/vue";
import { play$fx } from "@/assets/fx";
import XpCloseButton from "@/components/atoms/CloseButton/XpCloseButton.vue";
import { useRevealPrompt } from "@/components/organisms/RevealPrompt/useRevealPrompt";
import XpRevealPrompt from "@/components/organisms/RevealPrompt/XpRevealPrompt.vue";
import XpAppHeader from "@/components/organisms/XpApp/XpAppHeader.vue";
import { useAppSkin } from "@/components/organisms/XpApp/useAppSkin";
import { useToast } from "@/hooks/useToast";
import { useCopy, useVoice } from "@/hooks/useVoice";
import { dateKey } from "@/lib/services/core/packs/packCommon";
import { projectTypeOf } from "@/lib/services/core/packs/projects";
import { floorClockView } from "@/lib/services/projects/floorClock";
import { abandonProject, extendProject, readTower, settleReadyFloors } from "@/lib/services/projects/projectService";
import type { TowerSnapshot } from "@/lib/services/projects/projectService";
import { dayText } from "@/lib/services/projects/projectWizard";
import { abandonPrompt } from "@/lib/services/projects/towerPrompts";
import { currentFloorOf, endDateProblem, floorRowsOf } from "@/lib/services/projects/towerView";
import debug from "@/lib/utils/debug";
import { canAccessGameMaster } from "@/router/_Guards/gm.guard";

/**
 * The tower's spot in Hometown opens this sheet: the tower's name, the floor the family is on with its clock and bonus
 * offer, and every floor. A Game Master also gets "Move the end date" (a day no earlier than today, then extendProject)
 * and "Abandon project" (the game's own confirm, then abandonProject). The rules are projectService, floorClock and
 * towerView; this holds what is on screen. With no tower standing it shows the `empty` slot, where Task 11's trophy goes.
 */
const props = defineProps<{ open: boolean }>();
const emit = defineEmits(["close", "enter", "changed", "abandoned"]);

const { rootClass, rootStyle } = useAppSkin("quests");
const t = useCopy();
const { voice } = useVoice();
const { showToast } = useToast();
const { prompt, showPrompt, submitAnswer } = useRevealPrompt();

const STATE_ICONS = { cleared: "fa-check-circle", open: "fa-door-open", asleep: "fa-moon" } as const;

const today = ref(dateKey(new Date()));
const snapshot = ref<TowerSnapshot | null>(null);
const isLoaded = ref(false);
const isGameMaster = ref(false);
const isEditingEnd = ref(false);
const endOn = ref(today.value);
const endProblem = ref("");

let opening = 0;

// ---- Reading the tower ---------------------------------------------------------------------------------------------------

/** A floor that cannot be settled now is retried the next time anything asks: the sheet opens all the same */
const settleQuietly = async (): Promise<void> => {
  try {
    await settleReadyFloors();
  } catch (error) {
    debug.warn("[ProjectTower] the floors could not be settled", error);
  }
};

const readQuietly = async (): Promise<TowerSnapshot | null> => {
  try {
    return await readTower();
  } catch (error) {
    debug.warn("[ProjectTower] the tower could not be read", error);
    return null;
  }
};

const begin = async () => {
  opening += 1;
  const ticket = opening;
  today.value = dateKey(new Date());
  isLoaded.value = false;
  isEditingEnd.value = false;
  endProblem.value = "";
  isGameMaster.value = canAccessGameMaster();
  await settleQuietly();
  const read = await readQuietly();
  const isStale = ticket !== opening;
  if (isStale) return;
  snapshot.value = read;
  endOn.value = read?.project.endOn ?? today.value;
  isLoaded.value = true;
};

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) void begin();
  },
  { immediate: true }
);

const view = computed(() => (isLoaded.value ? "ready" : "loading"));
const project = computed(() => snapshot.value?.project ?? null);
const title = computed(() => (project.value ? (projectTypeOf(project.value.typeId)?.towerName ?? project.value.typeId) : t("projectTower.sheet.title")));
const clock = computed(() => {
  const running = project.value;
  const floor = running ? currentFloorOf(running) : undefined;
  const hasNothingToShow = !running || !floor || !isLoaded.value;
  if (hasNothingToShow) return null;
  return floorClockView(running, floor.floorKey, today.value, voice.value);
});
const rows = computed(() => (project.value ? floorRowsOf(project.value) : []));
const endsText = computed(() => (project.value ? dayText(project.value.endOn) : ""));

// ---- The Game Master's controls ------------------------------------------------------------------------------------------

const toggleEnd = () => {
  isEditingEnd.value = !isEditingEnd.value;
  endProblem.value = "";
};

const refuse = (line: string) => {
  endProblem.value = line;
  play$fx("no");
};

const moveEnd = async () => {
  const problem = endDateProblem(endOn.value, today.value);
  const isRefused = problem !== null;
  if (isRefused) {
    refuse(t(problem === "past" ? "projectTower.sheet.endPast" : "projectTower.sheet.endInvalid"));
    return;
  }
  try {
    await extendProject(endOn.value, today.value);
  } catch (error) {
    debug.warn("[ProjectTower] the end date could not be moved", error);
    refuse(t("projectTower.sheet.endRefused"));
    return;
  }
  endProblem.value = "";
  isEditingEnd.value = false;
  snapshot.value = await readQuietly();
  play$fx("select");
  void showToast(t("projectTower.sheet.endMoved", { date: dayText(endOn.value) }), 3000);
  emit("changed");
};

const abandon = async () => {
  const towerName = title.value;
  const answer = await showPrompt(abandonPrompt(towerName, voice.value));
  const isConfirmed = answer === "yes";
  if (!isConfirmed) return;
  try {
    await abandonProject();
  } catch (error) {
    debug.warn("[ProjectTower] the project could not be abandoned", error);
    play$fx("no");
    void showToast(t("projectTower.sheet.abandonFailed"), 4000);
    return;
  }
  play$fx("select");
  void showToast(t("projectTower.sheet.abandoned", { tower: towerName }), 4000);
  emit("abandoned");
  emit("close");
};
</script>

<style lang="scss" scoped src="./_ProjectTowerSheet.scss" />

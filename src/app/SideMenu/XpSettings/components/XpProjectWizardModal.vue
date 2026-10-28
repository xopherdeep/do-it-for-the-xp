<template>
  <ion-modal :is-open="open" class="project-wizard" :class="rootClass" :style="rootStyle" :backdrop-dismiss="false" @didDismiss="emit('close')">
    <!-- A project is already running: one at a time, so there is nothing to build -->
    <template v-if="view === 'blocked'">
      <ion-header>
        <ion-toolbar>
          <xp-app-header :title="t('projectWizard.title')" icon="dungeon">
            <template #end><xp-close-button size="lg" color="light" aria-label="Close" data-test="wizard-close" @click="emit('close')" /></template>
          </xp-app-header>
        </ion-toolbar>
      </ion-header>
      <ion-content :scroll-y="true">
        <p class="pw-blocked" role="status" data-test="blocked">
          <i class="fad fa-hourglass-half" aria-hidden="true"></i>
          <span>{{ t("projectWizard.blocked", { name: runningName }) }}</span>
        </p>
      </ion-content>
      <ion-footer>
        <div class="pw-bar">
          <button type="button" class="xp-app-btn xp-app-btn--ghost pw-bar__btn" data-test="blocked-close" @click="emit('close')">
            <i class="fad fa-door-open" aria-hidden="true"></i>
            {{ t("projectWizard.blocked.close") }}
          </button>
        </div>
      </ion-footer>
    </template>

    <xp-wizard-shell
      v-else-if="view === 'wizard'"
      v-model:index="position"
      :steps="steps"
      :draft="draft"
      :title="t('projectWizard.title')"
      icon="dungeon"
      :verb="t('projectWizard.build.verb')"
      verb-icon="hammer"
      :busy="isBuilding"
      @close="emit('close')"
      @submit="build"
    >
      <!-- 1. THE PROJECT: a card for each type -->
      <template #type>
        <section class="pw-section" data-test="step-type">
          <button
            v-for="kind in types"
            :key="kind.id"
            type="button"
            class="pw-type"
            :class="{ 'is-picked': draft.typeId === kind.id }"
            :aria-pressed="draft.typeId === kind.id"
            :data-test="`type-${kind.id}`"
            @click="pickType(kind.id)"
          >
            <i :class="['fad', `fa-${projectTypeIcon(kind.id)}`, 'pw-type__icon']" aria-hidden="true"></i>
            <span class="pw-type__name">{{ kind.name }}</span>
            <span class="pw-type__tower">{{ kind.towerName }}</span>
            <span class="pw-type__meta">{{ t("projectWizard.type.meta", { floors: kind.phases.length, days: kind.defaultDays }) }}</span>
            <i v-if="draft.typeId === kind.id" class="fad fa-check-circle pw-type__check" aria-hidden="true"></i>
          </button>
          <p v-if="isRerunChosen" class="pw-note" data-test="rerun-note">
            <i class="fad fa-history" aria-hidden="true"></i>
            <span>{{ t("projectWizard.type.rerun") }}</span>
          </p>
        </section>
      </template>

      <!-- 2. THE HOUSE: the rooms the chores are made for -->
      <template #house>
        <section class="pw-section" data-test="step-house">
          <h2 class="pw-sub">{{ t("projectWizard.house.rooms") }}</h2>
          <div v-for="room in rooms" :key="room.id" class="pw-room">
            <template v-if="room.counted">
              <span class="pw-room__label">{{ room.label }}</span>
              <span class="pw-stepper">
                <button
                  type="button"
                  class="pw-stepper__btn"
                  :aria-label="t('projectWizard.house.fewer')"
                  :disabled="!canLower(room.id)"
                  :data-test="`room-less-${room.id}`"
                  @click="bumpRoom(room.id, -1)"
                >
                  -
                </button>
                <span class="pw-stepper__n" :data-test="`room-count-${room.id}`">{{ roomsOf(room.id) }}</span>
                <button
                  type="button"
                  class="pw-stepper__btn"
                  :aria-label="t('projectWizard.house.more')"
                  :disabled="!canRaise(room)"
                  :data-test="`room-more-${room.id}`"
                  @click="bumpRoom(room.id, 1)"
                >
                  +
                </button>
              </span>
            </template>
            <button
              v-else
              type="button"
              class="pw-check"
              :class="{ 'is-on': roomsOf(room.id) > 0 }"
              role="checkbox"
              :aria-checked="roomsOf(room.id) > 0"
              :data-test="`room-toggle-${room.id}`"
              @click="toggleRoom(room.id)"
            >
              <i :class="['fad', roomsOf(room.id) > 0 ? 'fa-check-square' : 'fa-square']" aria-hidden="true"></i>
              {{ room.label }}
            </button>
          </div>
          <!-- A basement is a way to read the storage room, so it is asked only while storage is ticked -->
          <button
            v-if="hasStorage"
            type="button"
            class="pw-check"
            :class="{ 'is-on': isBasement }"
            role="checkbox"
            :aria-checked="isBasement"
            data-test="basement"
            @click="toggleBasement"
          >
            <i :class="['fad', isBasement ? 'fa-check-square' : 'fa-square']" aria-hidden="true"></i>
            {{ t("projectWizard.house.basement") }}
          </button>
        </section>
      </template>

      <!-- 3. THE CHORES: grouped by floor, every row editable -->
      <template #chores>
        <section class="pw-section" data-test="step-chores">
          <p v-if="isRerunChosen" class="pw-note" data-test="rerun-note">
            <i class="fad fa-history" aria-hidden="true"></i>
            <span>{{ t("projectWizard.type.rerun") }}</span>
          </p>
          <section v-for="group in groups" :key="group.id" class="pw-phase" :data-test="`phase-${group.id}`" :data-phase="group.id">
            <h2 class="pw-sub">
              {{ group.name }}
              <span class="pw-sub__n">{{ t("projectWizard.chores.count", { count: group.chores.length }) }}</span>
            </h2>
            <p v-if="group.isRoof" class="pw-note">{{ t("projectWizard.chores.roofNote") }}</p>
            <article
              v-for="chore in group.chores"
              :key="chore.id"
              class="pw-chore"
              data-test="chore-row"
              :data-chore="chore.id"
              :data-custom="chore.custom ? 'true' : undefined"
            >
              <div class="pw-chore__top">
                <input
                  type="text"
                  class="pw-chore__name"
                  :value="chore.name"
                  maxlength="80"
                  autocomplete="off"
                  :aria-label="t('projectWizard.chores.name')"
                  data-test="chore-name"
                  @input="onName(chore.id, $event)"
                />
                <button
                  v-if="!group.isRoof"
                  type="button"
                  class="pw-chore__drop"
                  :aria-label="t('projectWizard.chores.drop', { name: chore.name })"
                  data-test="chore-drop"
                  @click="onDrop(chore.id)"
                >
                  <i class="fad fa-times" aria-hidden="true"></i>
                </button>
              </div>
              <p class="pw-chore__room" data-test="chore-room">{{ roomNameOf(chore) }}</p>
              <div class="pw-chore__controls">
                <input
                  type="range"
                  class="pw-chore__size"
                  min="0"
                  :max="sizeSteps.length - 1"
                  step="1"
                  :value="sizeIndexOf(chore)"
                  :aria-label="t('projectWizard.chores.size', { name: chore.name })"
                  :aria-valuetext="String(chore.difficulty)"
                  data-test="chore-size"
                  @input="onSize(chore.id, $event)"
                />
                <span class="pw-chore__worth" data-test="chore-worth">{{ chore.difficulty }} / {{ xpOf(chore) }} XP</span>
                <button
                  type="button"
                  class="xp-app-btn pw-chip"
                  :aria-label="t('projectWizard.chores.who', { name: chore.name })"
                  data-test="chore-who"
                  @click="onWho(chore.id)"
                >
                  <i class="fad fa-user" aria-hidden="true"></i>
                  {{ whoOf(chore) }}
                </button>
              </div>
            </article>
            <button v-if="!group.isRoof" type="button" class="xp-app-btn xp-app-btn--ghost pw-add" :data-test="`chore-add-${group.id}`" @click="onAdd(group.id)">
              <i class="fad fa-plus" aria-hidden="true"></i>
              {{ t("projectWizard.chores.add") }}
            </button>
          </section>
        </section>
      </template>

      <!-- 4. THE DATES: each floor's days read above; the last day and the reward are asked at the bottom -->
      <template #dates>
        <section class="pw-section" data-test="step-dates">
          <ol class="pw-windows">
            <li v-for="line in windowTexts" :key="line.id" class="pw-window" data-test="window">{{ line.text }}</li>
          </ol>
        </section>
      </template>

      <!-- 5. BUILD: what will be raised -->
      <template #build>
        <section class="pw-section" data-test="step-build">
          <article v-if="chosen" class="pw-summary" data-test="build-summary">
            <i :class="['fad', `fa-${projectTypeIcon(chosen.id)}`, 'pw-summary__icon']" aria-hidden="true"></i>
            <h2 class="pw-summary__tower">{{ chosen.towerName }}</h2>
            <p class="pw-summary__kind">{{ chosen.name }}</p>
            <ul class="pw-summary__facts">
              <li><i class="fad fa-layer-group" aria-hidden="true"></i><span>{{ t("projectWizard.build.floors", { floors: chosen.phases.length }) }}</span></li>
              <li><i class="fad fa-tasks" aria-hidden="true"></i><span>{{ t("projectWizard.build.chores", { count: draft.chores.length }) }}</span></li>
              <li><i class="fad fa-calendar-check" aria-hidden="true"></i><span>{{ t("projectWizard.build.ends", { date: dayText(draft.endOn) }) }}</span></li>
              <li><i class="fad fa-gift" aria-hidden="true"></i><span>{{ t("projectWizard.build.reward", { text: draft.rewardText.trim() }) }}</span></li>
            </ul>
          </article>
        </section>
      </template>

      <!-- The step's fields sit at the bottom, above Back / Next, in thumb reach -->
      <template #above-nav="{ step: asked }">
        <div v-if="asked.id === 'dates'" class="pw-fields">
          <label class="pw-field">
            <span class="pw-field__label">{{ t("projectWizard.dates.endLabel") }}</span>
            <input v-model="draft.endOn" type="date" class="pw-date" :min="earliestEnd" :aria-label="t('projectWizard.dates.endLabel')" data-test="end-on" />
          </label>
          <label class="xp-app-search">
            <i class="fad fa-gift" aria-hidden="true"></i>
            <input
              v-model="draft.rewardText"
              type="text"
              maxlength="80"
              autocomplete="off"
              enterkeyhint="done"
              :placeholder="t('projectWizard.dates.rewardPlaceholder')"
              :aria-label="t('projectWizard.dates.rewardLabel')"
              data-test="reward"
            />
          </label>
        </div>
      </template>
    </xp-wizard-shell>
  </ion-modal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { IonContent, IonFooter, IonHeader, IonModal, IonToolbar } from "@ionic/vue";
import { play$fx } from "@/assets/fx";
import XpCloseButton from "@/components/atoms/CloseButton/XpCloseButton.vue";
import XpWizardShell from "@/components/organisms/WizardShell/XpWizardShell.vue";
import XpAppHeader from "@/components/organisms/XpApp/XpAppHeader.vue";
import { useAppSkin } from "@/components/organisms/XpApp/useAppSkin";
import { useToast } from "@/hooks/useToast";
import { useCopy, useVoice } from "@/hooks/useVoice";
import { getProjectDb } from "@/lib/databases/ProjectDb";
import { MOVING_ROOMS } from "@/lib/services/core/packs/movingPack";
import type { MovingRoomId } from "@/lib/services/core/packs/movingPack";
import { FIBONACCI_STEPS, dateKey, nearestDifficulty, rewardsFor } from "@/lib/services/core/packs/packCommon";
import { PROJECT_TYPES, projectTypeOf } from "@/lib/services/core/packs/projects";
import type { ProjectTypeId } from "@/lib/services/core/packs/projects";
import { houseRoomsOf } from "@/lib/services/projects/projectChores";
import type { ProjectChore, ProjectHouse } from "@/lib/services/projects/projectChores";
import type { ProjectRecord } from "@/lib/services/projects/projectRecord";
import { ROOF_PHASE_ID, minimumEndOn } from "@/lib/services/projects/projectSchedule";
import { startProject } from "@/lib/services/projects/projectService";
import * as wizard from "@/lib/services/projects/projectWizard";
import { useUserStore } from "@/lib/store/stores/user";
import debug from "@/lib/utils/debug";

const { dayText, draftType, projectTypeIcon } = wizard;

/**
 * The Start a Project wizard (docs: Project Towers, section 4): a Game Master picks a big family project, says which
 * rooms the home has, edits the chores floor by floor, sets the last day and the family reward, and builds the tower.
 * The chrome is the shared XpWizardShell and every rule (what each step needs, what choosing a type fills, how edits
 * change the list, what the tower is built from) lives in projectWizard.ts; this file holds the draft and the body of
 * each step. One project runs at a time, so with one running the wizard only says to finish or abandon it first.
 */
const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ close: [] }>();

const { rootClass, rootStyle } = useAppSkin("quests");
const t = useCopy();
const { voice } = useVoice();
const { showToast } = useToast();
const userStore = useUserStore();

const types = Object.values(PROJECT_TYPES);
const rooms = MOVING_ROOMS;
const sizeSteps = FIBONACCI_STEPS;

// ---- Opening --------------------------------------------------------------------------------------------------------

const today = ref(dateKey(new Date()));
const draft = ref<wizard.ProjectDraft>(wizard.newProjectDraft(today.value));
const position = ref(0);
const isLoaded = ref(false);
const isBuilding = ref(false);
const running = ref<ProjectRecord | null>(null);
/** Each type's last cleared run, read once when the wizard opens so choosing a type needs no wait */
const lastRuns = ref<Partial<Record<ProjectTypeId, ProjectRecord | null>>>({});

let opening = 0;

/** A read that fails reads as "nothing there": starting a project still refuses while one is running */
const readOrNull = async (read: () => Promise<ProjectRecord | null>): Promise<ProjectRecord | null> => {
  try {
    return await read();
  } catch (error) {
    debug.warn("[ProjectWizard] the family's projects could not be read", error);
    return null;
  }
};

const begin = async () => {
  opening += 1;
  const ticket = opening;
  today.value = dateKey(new Date());
  draft.value = wizard.newProjectDraft(today.value);
  position.value = 0;
  isLoaded.value = false;
  const db = getProjectDb();
  const ids = types.map((kind) => kind.id);
  const [active, ...runs] = await Promise.all([readOrNull(() => db.getActive()), ...ids.map((id) => readOrNull(() => db.lastOfType(id)))]);
  const isStale = ticket !== opening;
  if (isStale) return;
  running.value = active;
  const found: Partial<Record<ProjectTypeId, ProjectRecord | null>> = {};
  ids.forEach((id, index) => {
    found[id] = runs[index];
  });
  lastRuns.value = found;
  isLoaded.value = true;
};

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) void begin();
  },
  { immediate: true }
);

const view = computed(() => {
  if (!isLoaded.value) return "loading";
  return running.value ? "blocked" : "wizard";
});

const runningName = computed(() => (running.value ? projectTypeOf(running.value.typeId)?.towerName ?? running.value.id : ""));

// ---- The draft ------------------------------------------------------------------------------------------------------

const heroes = computed(() => wizard.heroesFrom(userStore.usersAz));
const lastChoresOf = (typeId: ProjectTypeId | undefined): ProjectChore[] | null => (typeId ? lastRuns.value[typeId]?.chores ?? null : null);
const context = () => ({ today: today.value, heroes: heroes.value, lastChores: lastChoresOf(draft.value.typeId) });

const steps = computed(() => wizard.projectWizardSteps(voice.value, () => today.value));
const chosen = computed(() => draftType(draft.value));
const isRerunChosen = computed(() => wizard.isRerun(chosen.value, lastChoresOf(draft.value.typeId)));

const pickType = (typeId: ProjectTypeId) => {
  const isAlready = draft.value.typeId === typeId;
  if (isAlready) return;
  play$fx("select");
  draft.value = wizard.withType(draft.value, typeId, { ...context(), lastChores: lastChoresOf(typeId) });
};

// ---- The house ------------------------------------------------------------------------------------------------------

const roomsOf = (id: MovingRoomId): number => Number(draft.value.house.rooms[id]) || 0;
const hasStorage = computed(() => roomsOf("storage") > 0);
const isBasement = computed(() => draft.value.house.basement === true);
const canLower = (id: MovingRoomId): boolean => roomsOf(id) > 0;
const canRaise = (room: (typeof MOVING_ROOMS)[number]): boolean => roomsOf(room.id) < (room.max ?? 5);

const changeHouse = (change: Partial<ProjectHouse>) => {
  draft.value = wizard.withHouse(draft.value, { ...draft.value.house, ...change }, context());
};
const setRooms = (id: MovingRoomId, count: number) => {
  const next: ProjectHouse["rooms"] = { ...draft.value.house.rooms };
  next[id] = count;
  changeHouse({ rooms: next });
};
const bumpRoom = (id: MovingRoomId, by: number) => setRooms(id, Math.max(0, roomsOf(id) + by));
const toggleRoom = (id: MovingRoomId) => setRooms(id, roomsOf(id) > 0 ? 0 : 1);
const toggleBasement = () => changeHouse({ basement: !isBasement.value });

// ---- The chores -----------------------------------------------------------------------------------------------------

/** The floors bottom to top, the roof last: its own heading, no drop button and no way to add a second finale */
const groups = computed(() => {
  const floors = (chosen.value?.phases ?? []).map((phase) => ({ id: phase.id, name: phase.name, isRoof: false }));
  const roof = { id: ROOF_PHASE_ID, name: t("projectWizard.chores.roof"), isRoof: true };
  return [...floors, roof].map((floor) => ({ ...floor, chores: wizard.choresOfPhase(draft.value, floor.id) }));
});

const roomNames = computed(() => new Map(houseRoomsOf(draft.value.house).map((room) => [room.id, room.name])));

/** Where a chore lands: its room, "The Whole House" for one whose room is gone, the roof for the finale */
const roomNameOf = (chore: ProjectChore): string => (chore.phaseId === ROOF_PHASE_ID ? t("projectWizard.chores.roof") : roomNames.value.get(chore.roomId) ?? "");
const sizeIndexOf = (chore: ProjectChore): number => sizeSteps.indexOf(nearestDifficulty(chore.difficulty));
const xpOf = (chore: ProjectChore): number => rewardsFor(chore.difficulty).xp;
const whoOf = (chore: ProjectChore): string =>
  wizard.whoLabel(chore, heroes.value, { nobody: t("projectWizard.chores.nobody"), everyone: t("projectWizard.chores.everyone") });

const inputValue = (event: Event): string => (event.target as HTMLInputElement).value;
const onName = (id: string, event: Event) => {
  draft.value = wizard.renameChore(draft.value, id, inputValue(event));
};
const onSize = (id: string, event: Event) => {
  draft.value = wizard.resizeChore(draft.value, id, sizeSteps[Number(inputValue(event))] ?? sizeSteps[0]);
};
const onWho = (id: string) => {
  play$fx("cursor");
  draft.value = wizard.reassignChore(draft.value, id, heroes.value);
};
const onAdd = (phaseId: string) => {
  play$fx("select");
  draft.value = wizard.addChore(draft.value, phaseId, t("projectWizard.chores.newName"), heroes.value);
};
const onDrop = (id: string) => {
  play$fx("cursor");
  draft.value = wizard.dropChore(draft.value, id);
};

// ---- The dates and Build --------------------------------------------------------------------------------------------

const earliestEnd = computed(() => minimumEndOn(chosen.value?.phases.length ?? 1, today.value));
const windowTexts = computed(() => wizard.windowLines(draft.value, today.value, voice.value));

const build = async () => {
  if (isBuilding.value) return;
  const type = chosen.value;
  if (!type) return;
  isBuilding.value = true;
  try {
    const input = wizard.towerInputOf(draft.value, { today: today.value, now: new Date(), heroes: heroes.value });
    await startProject(input, draft.value.rewardText.trim());
    play$fx("select");
    void showToast(t("projectWizard.built", { tower: type.towerName }), 4000);
    emit("close");
  } catch (error) {
    debug.warn("[ProjectWizard] the project could not be started", error);
    play$fx("no");
    void showToast(t("projectWizard.failed"), 4000);
  } finally {
    isBuilding.value = false;
  }
};
</script>

<style lang="scss" scoped src="./_XpProjectWizardModal.scss" />

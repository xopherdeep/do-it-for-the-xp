<template>
  <!-- Generate a Temple as the shared wizard: Seed > Size and floors > Theme > Preview and save -->
  <ion-modal
    :is-open="isOpen"
    class="temple-generate-modal"
    :class="rootClass"
    :style="rootStyle"
    :backdrop-dismiss="false"
    @didDismiss="emit('close')"
  >
    <xp-wizard-shell
      v-model:index="position"
      :steps="steps"
      :draft="draft"
      title="Generate a Temple"
      icon="dice-d20"
      :verb="saveVerb(recordId)"
      verb-icon="save"
      :busy="saving"
      @close="emit('close')"
      @submit="save"
    >
      <!-- 1. SEED: the plate shows the seed; the field and Reroll sit at the bottom, in thumb reach -->
      <template #seed>
        <section class="tg-section" data-test="step-seed">
          <p class="tg-plate" :class="{ 'is-empty': !draft.seed.trim() }" data-test="seed-plate">
            {{ draft.seed.trim() || "???" }}
          </p>
          <p class="tg-note">The same seed always grows the same temple. Change a word or a number and a new one grows.</p>
        </section>
      </template>

      <!-- 2. SIZE AND FLOORS: what the choices below add up to -->
      <template #size>
        <section class="tg-section" data-test="step-size">
          <ul class="tg-window" aria-label="The temple so far">
            <li v-for="(line, index) in sizeSummary" :key="index" data-test="size-line">
              <i :class="['fad', SIZE_LINE_ICONS[index]]" aria-hidden="true"></i>
              <span>{{ line }}</span>
            </li>
          </ul>
        </section>
      </template>

      <!-- 3. THEME: a tap on a chip fills the field below -->
      <template #theme>
        <section class="tg-section" data-test="step-theme">
          <p class="tg-plate" :class="{ 'is-empty': !draft.theme.trim() }" data-test="theme-plate">
            {{ draft.theme.trim() || "???" }}
          </p>
          <p class="tg-note">Its element is {{ draft.element }}.</p>
          <h2 class="tg-sub">Ideas</h2>
          <div class="tg-chips" role="group" aria-label="Theme ideas">
            <button
              v-for="idea in ideas"
              :key="idea"
              type="button"
              class="tg-chip"
              :class="{ 'is-picked': isTheme(idea) }"
              :aria-pressed="isTheme(idea)"
              data-test="theme-idea"
              @click="pickTheme(idea)"
            >
              {{ idea }}
            </button>
          </div>
        </section>
      </template>

      <!-- 4. PREVIEW AND SAVE: the temple the seed grew, and the solver's word on it -->
      <template #preview>
        <section class="tg-section" data-test="step-preview">
          <div v-if="error" class="tg-verdict is-failed" role="alert" data-test="error">
            <i class="fad fa-skull-crossbones" aria-hidden="true"></i>
            <span>{{ error }}</span>
          </div>

          <template v-if="temple && verdict && summary">
            <div class="tg-verdict" :class="verdict.solvable ? 'is-solvable' : 'is-failed'" data-test="verdict">
              <div class="tg-verdict__title">
                <i :class="['fad', verdict.solvable ? 'fa-check-circle' : 'fa-times-circle']" aria-hidden="true"></i>
                <strong>{{ temple.name }}</strong>
                <span class="tg-verdict__id">{{ recordId }}</span>
              </div>
              <div class="tg-verdict__line">
                {{ verdict.solvable ? "Solvable" : "Not solvable" }}
                · critical path {{ temple.criticalPath.length }} rooms
                · {{ summary.floors }} floor{{ summary.floors === 1 ? "" : "s" }} of {{ summary.rows }}×{{ summary.cols }}
                · {{ summary.rooms }} rooms
              </div>
              <div class="tg-verdict__line tg-stats">
                <span><i class="fad fa-bat" aria-hidden="true"></i> {{ summary.monsters }}</span>
                <span><i class="fad fa-key" aria-hidden="true"></i> {{ summary.keys }} keys / {{ summary.locks }} locks</span>
                <span><i class="fad fa-treasure-chest" aria-hidden="true"></i> {{ summary.chests }}</span>
                <span v-if="summary.hasMasterKey"><i class="fad fa-key-skeleton" aria-hidden="true"></i> Boss Key</span>
                <span v-if="summary.hasPegasus"><i class="fad fa-pegasus" aria-hidden="true"></i> Pegasus</span>
                <span v-if="temple.attempts > 1"><i class="fad fa-history" aria-hidden="true"></i> {{ temple.attempts }} tries</span>
              </div>
              <ul v-if="verdict.reasons.length" class="tg-reasons">
                <li v-for="reason in verdict.reasons" :key="reason">{{ reason }}</li>
              </ul>
            </div>

            <div class="tg-floors">
              <div v-for="(floor, index) in floorGrids" :key="floor.id" class="tg-floor" data-test="floor">
                <div class="tg-floor__title">
                  <i class="fad fa-layer-group" aria-hidden="true"></i>{{ floor.id }}
                  <span class="tg-floor__hint"><span class="path-dot"></span> critical path</span>
                </div>
                <div class="grid-scale">
                  <div class="grid-stage">
                    <xp-temple-creator-grid
                      :maze="floor.grid"
                      :rooms-data="temple.rooms"
                      :room-icons="roomIcons"
                      :side-type-info="sideTypeInfo"
                      :entrance-position="index === temple.entrance[0] ? `${temple.entrance[1]},${temple.entrance[2]}` : '-1,-1'"
                      :current-level-id="floor.id"
                    />
                    <div
                      class="path-overlay"
                      :style="{ gridTemplateColumns: `repeat(${floor.grid[0].length}, 52px)` }"
                    >
                      <div
                        v-for="cell in floor.cells"
                        :key="cell.key"
                        class="path-cell"
                        :class="{ 'on-path': cell.step !== null }"
                      >
                        <span v-if="cell.step !== null" class="path-step">{{ cell.step }}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <pre class="mono-preview">{{ monoRows[index]?.rows.join("\n") }}</pre>
              </div>
            </div>
          </template>
        </section>
      </template>

      <!-- The field of each step sits at the bottom, above Back / Next, in thumb reach -->
      <template #above-nav="{ step: asked }">
        <div v-if="asked.id === 'seed'" class="tg-seed-row">
          <label class="xp-app-search tg-seed-field">
            <i class="fad fa-dice-d20" aria-hidden="true"></i>
            <input
              v-model="draft.seed"
              type="text"
              placeholder="attic-417"
              aria-label="Seed"
              maxlength="40"
              autocomplete="off"
              autocapitalize="off"
              enterkeyhint="done"
              data-test="seed-input"
              @keyup.enter="closeKeyboard"
            />
          </label>
          <button type="button" class="xp-app-btn tg-reroll" data-test="reroll" @click="reroll">
            <i class="fad fa-redo" aria-hidden="true"></i>
            Reroll
          </button>
        </div>

        <template v-else-if="asked.id === 'size'">
          <div v-for="rail in rails" :key="rail.id" class="tg-rail">
            <span class="tg-rail__label">{{ rail.label }}</span>
            <div class="xp-app-segments" role="radiogroup" :aria-label="rail.label">
              <button
                v-for="choice in rail.choices"
                :key="choice.value"
                type="button"
                role="radio"
                class="xp-app-segment"
                :class="{ 'is-active': choice.value === draft[rail.id] }"
                :aria-checked="choice.value === draft[rail.id]"
                :data-test="`${rail.id}-${choice.value}`"
                @click="choose(rail.id, choice.value)"
              >
                {{ choice.label }}
              </button>
            </div>
          </div>
        </template>

        <template v-else-if="asked.id === 'theme'">
          <div class="xp-app-segments" role="radiogroup" aria-label="Element" data-test="elements">
            <button
              v-for="element in ELEMENT_CHOICES"
              :key="element"
              type="button"
              role="radio"
              class="xp-app-segment"
              :class="{ 'is-active': draft.element === element }"
              :aria-checked="draft.element === element"
              :data-test="`element-${element}`"
              @click="chooseElement(element)"
            >
              {{ element }}
            </button>
          </div>
          <label class="xp-app-search">
            <i class="fad fa-palette" aria-hidden="true"></i>
            <input
              v-model="draft.theme"
              type="text"
              placeholder="Kitchen, Yard, Homework or a world"
              aria-label="Theme"
              maxlength="40"
              autocomplete="off"
              enterkeyhint="done"
              data-test="theme-input"
              @keyup.enter="closeKeyboard"
            />
          </label>
        </template>
      </template>
    </xp-wizard-shell>
  </ion-modal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { IonModal, alertController, toastController } from "@ionic/vue";
import {
  generateTemple,
  solveTemple,
  floorsOf,
  previewRows,
  summarize,
  toTempleRecord,
  generatedTempleId,
  randomSeed,
  recordToSave,
  type GeneratedTemple,
  type SolveResult,
  type TakenIdAnswer,
  type TempleSummary,
} from "@/lib/engine/dungeons/generator";
import { TempleDb, templeStorage, type TempleInterface } from "@/lib/databases/TempleDb";
import { TEMPLE_METADATA } from "@/lib/engine/temples/templeRegistry";
import { ROOM_ICONS } from "@/lib/engine/dungeons/roomTypes";
import { SIDE_TYPE_INFO } from "./XpTempleCreator/hooks/useTempleCreator";
import XpTempleCreatorGrid from "./XpTempleCreator/XpTempleCreatorGrid.vue";
import XpWizardShell from "@/components/organisms/WizardShell/XpWizardShell.vue";
import { useAppSkin } from "@/components/organisms/XpApp/useAppSkin";
import { play$fx } from "@/assets/fx";
import debug from "@/lib/utils/debug";
import {
  ELEMENT_CHOICES,
  FLOOR_CHOICES,
  generateKey,
  generateOptionsOf,
  generateWizardSteps,
  LOCK_CHOICES,
  newGenerateDraft,
  previewFailure,
  previewVerdict,
  rerolledSeed,
  saveVerb,
  SIZE_CHOICES,
  sizeLines,
  themeSuggestions,
} from "../templeWizard";
import type { FloorCount, GenerateDraft, LockCount } from "../templeWizard";

/**
 * The Game Master's temple generator on the shared wizard shell (docs: compendium-wizards-design, W6): Seed, Size and
 * floors, Theme, then Preview and save. The temple is grown when the last step opens, with the solver's word on it; the
 * verb "Save as <id>" is shut for a temple the heroes could not finish. Nothing is stored until the verb, and a seed
 * that holds a temple already asks Replace, Save as a copy or Cancel (recordToSave).
 */

const props = defineProps<{ isOpen: boolean }>();
const emit = defineEmits<{ (e: "close"): void; (e: "saved", record: TempleInterface): void }>();

// Temples keep the Beast Log's purple (owner: the accent the Beast wizard chose, cream text on it)
const { rootClass, rootStyle } = useAppSkin("quests");

function titleCase(text: string): string {
  return text.replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
}

const worlds = [...new Set(Object.values(TEMPLE_METADATA).map((meta) => meta.world))].map(titleCase);
const ideas = themeSuggestions(worlds);

// ---- The draft ---------------------------------------------------------------------------------------------------

const steps = generateWizardSteps();
const previewAt = steps.findIndex((step) => step.id === "preview");
const draft = ref<GenerateDraft>(newGenerateDraft(randomSeed()));
const position = ref(0);

const saving = ref(false);
const error = ref("");
const temple = ref<GeneratedTemple | null>(null);
const verdict = ref<SolveResult | null>(null);
const summary = ref<TempleSummary | null>(null);

const roomIcons = ROOM_ICONS as Record<string, string>;
const sideTypeInfo = SIDE_TYPE_INFO;

const templeDb = new TempleDb(templeStorage);

const recordId = computed(() => (temple.value ? generatedTempleId(temple.value.seed) : ""));

// Every opening is a new temple: a fresh seed, the first step, nothing left from the last run
const clearTemple = () => {
  temple.value = null;
  verdict.value = null;
  summary.value = null;
  error.value = "";
  draft.value.preview = null;
};

watch(
  () => props.isOpen,
  (isOpen) => {
    if (!isOpen) return;
    draft.value = newGenerateDraft(randomSeed());
    position.value = 0;
    saving.value = false;
    clearTemple();
  }
);

// A changed input makes the temple shown stale: it goes until the last step grows it again
watch(
  () => generateKey(draft.value),
  () => clearTemple()
);

// ---- 1. Seed -----------------------------------------------------------------------------------------------------

const closeKeyboard = (event: Event) => {
  (event.target as HTMLElement | null)?.blur();
};

const reroll = () => {
  play$fx("cursor");
  draft.value.seed = rerolledSeed(draft.value.seed, randomSeed());
};

// ---- 2. How big the temple grows ---------------------------------------------------------------------------------

type RailId = "size" | "floors" | "locks";

const rails = [
  { id: "size" as RailId, label: "Size", choices: SIZE_CHOICES.map((choice) => ({ value: choice.id as string | number, label: choice.label })) },
  { id: "floors" as RailId, label: "Floors", choices: FLOOR_CHOICES.map((value) => ({ value: value as string | number, label: String(value) })) },
  { id: "locks" as RailId, label: "Locks", choices: LOCK_CHOICES.map((value) => ({ value: value as string | number, label: String(value) })) },
];

const SIZE_LINE_ICONS = ["fa-ruler-combined", "fa-layer-group", "fa-lock"];

const sizeSummary = computed(() => sizeLines(draft.value));

const choose = (rail: RailId, value: string | number) => {
  play$fx("cursor");
  if (rail === "size") draft.value.size = value as GenerateDraft["size"];
  else if (rail === "floors") draft.value.floors = value as FloorCount;
  else draft.value.locks = value as LockCount;
};

// ---- 3. Theme ----------------------------------------------------------------------------------------------------

const isTheme = (idea: string) => draft.value.theme.trim().toLowerCase() === idea.toLowerCase();

const pickTheme = (idea: string) => {
  play$fx("cursor");
  draft.value.theme = idea;
};

const chooseElement = (element: string) => {
  play$fx("cursor");
  draft.value.element = element;
};

// ---- 4. Preview and save -----------------------------------------------------------------------------------------

/** Each floor's grid plus, per cell, its step number on the critical path (null off the path). */
const floorGrids = computed(() => {
  if (!temple.value) return [];
  const stepsOnPath = new Map<string, number>();
  temple.value.criticalPath.forEach((ref, i) => stepsOnPath.set(`${ref.floor}:${ref.row},${ref.col}`, i + 1));
  return Object.entries(floorsOf(temple.value.maze)).map(([id, grid]) => ({
    id,
    grid,
    cells: grid.flatMap((row, r) =>
      row.map((_, c) => ({ key: `${id}:${r},${c}`, step: stepsOnPath.get(`${id}:${r},${c}`) ?? null }))
    ),
  }));
});

const monoRows = computed(() => (temple.value ? previewRows(temple.value, temple.value.criticalPath) : []));

// The last step opens: grow the temple from the draft and let the solver judge it
function growTemple() {
  error.value = "";
  try {
    const generated = generateTemple(draft.value.seed.trim(), generateOptionsOf(draft.value));
    const solved = solveTemple(generated);
    temple.value = generated;
    verdict.value = solved;
    summary.value = summarize(generated);
    draft.value.preview = previewVerdict(solved.solvable);
  } catch (err: unknown) {
    temple.value = null;
    verdict.value = null;
    summary.value = null;
    error.value = err instanceof Error ? err.message : String(err);
    draft.value.preview = previewFailure();
    play$fx("no");
    debug.error("generateTemple failed", err);
  }
}

watch(position, (at) => {
  if (at === previewAt) growTemple();
});

/** The id holds a temple already: the Game Master picks Replace, Save as a copy or Cancel (the backdrop is Cancel) */
async function askAboutTakenId(takenId: string): Promise<TakenIdAnswer> {
  play$fx("openMenu");
  const alert = await alertController.create({
    header: "Temple already saved",
    message: `<p><b>${takenId}</b> is already a temple, and the Temple Creator may have changed it since. Replace it with this fresh one, or keep both?</p>`,
    mode: "ios",
    backdropDismiss: false,
    buttons: [
      { text: "Cancel", role: "cancel" },
      { text: "Save as a copy", role: "copy" },
      { text: "Replace", role: "destructive" },
    ],
  });
  await alert.present();
  const { role } = await alert.onDidDismiss();
  if (role === "destructive") return "replace";
  return role === "copy" ? "copy" : "cancel";
}

async function save() {
  if (!temple.value || !verdict.value?.solvable || saving.value) return;
  saving.value = true;
  try {
    const record = await recordToSave(toTempleRecord(temple.value), templeDb, askAboutTakenId);
    if (!record) return;
    await templeDb.setTemple(record);
    play$fx("openMenu");
    const toast = await toastController.create({
      message: `${record.name} saved as ${record.id}. Heroes can enter it at /temple/${record.id}/&lt;userId&gt;.`,
      duration: 3000,
      position: "top",
      cssClass: "rpg-toast",
    });
    await toast.present();
    emit("saved", record);
  } catch (err) {
    debug.error("saving generated temple failed", err);
    error.value = "The temple could not be saved.";
  } finally {
    saving.value = false;
  }
}
</script>

<style lang="scss" scoped>
// A full-screen app sheet on the Quests purple, like the Quest Wizard; the kit's tokens give both skins (Retro / Modern).
.temple-generate-modal {
  background: transparent;
  --background: var(--xp-app-bg);
  --box-shadow: none;
  --width: 100%;
  --height: 100%;
  --border-radius: 0;

  &::part(content) {
    max-width: 700px;
    margin: 0 auto;
    background: var(--xp-app-bg);
  }
}

.tg-section {
  padding: 4px 12px 12px;
}

.tg-sub {
  margin: 16px 2px 8px;
  color: var(--xp-app-text-dim);
  font-family: var(--xp-app-font-title);
  font-size: 0.9rem;
  text-transform: var(--xp-app-title-transform);
}

.tg-note {
  margin: 12px 4px 0;
  color: var(--xp-app-text-dim);
  font-size: 0.9rem;
  line-height: 1.3;
  text-align: center;
}

// ---- Seed and theme: the plate shows what is typed below ----------------------------------------------------------

.tg-plate {
  max-width: 100%;
  margin: 16px auto 0;
  padding: 14px 18px;
  background: var(--xp-app-surface);
  border: var(--xp-app-section-border);
  border-radius: var(--xp-app-radius-tile);
  box-shadow: 0 0 0 2px var(--xp-app-accent);
  color: var(--xp-app-text);
  font-family: var(--xp-app-font-title);
  font-size: 1.5rem;
  line-height: 1.2;
  overflow-wrap: anywhere;
  text-align: center;
  text-transform: var(--xp-app-title-transform);

  &.is-empty {
    color: var(--xp-app-text-dim);
  }
}

.tg-seed-row {
  display: flex;
  gap: 8px;
}

// The field is a step down in the row, so the shell's taller bottom field (it only reaches direct children) is set here
.tg-seed-field {
  flex: 1 1 auto;
  min-width: 0;
  height: 46px;
}

.tg-reroll {
  flex: 0 0 auto;
  min-height: 46px;
  font-size: 0.95rem;
}

// ---- Size and floors: the rails sit at the bottom (thumb reach) ---------------------------------------------------

.tg-window {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 16px 0 0;
  padding: 14px;
  background: var(--xp-app-surface);
  border: var(--xp-app-section-border);
  border-radius: var(--xp-app-radius-section);
  box-shadow: 0 0 0 2px var(--xp-app-accent);
  color: var(--xp-app-text);
  list-style: none;

  li {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 1.05rem;
    line-height: 1.25;
  }

  i {
    flex: 0 0 auto;
    width: 28px;
    color: var(--xp-app-accent);
    font-size: 1.4rem;
    text-align: center;
  }
}

.tg-rail {
  display: flex;
  align-items: center;
  gap: 10px;

  &__label {
    flex: 0 0 56px;
    color: var(--xp-app-text-dim);
    font-family: var(--xp-app-font-title);
    font-size: 0.8rem;
    text-transform: var(--xp-app-title-transform);
  }

  .xp-app-segments {
    flex: 1 1 auto;
    min-width: 0;
  }

  .xp-app-segment {
    min-height: 40px;
  }
}

// ---- Theme ideas -------------------------------------------------------------------------------------------------

.tg-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tg-chip {
  min-height: 44px;
  padding: 0 14px;
  background: var(--xp-app-surface);
  border: var(--xp-app-section-border);
  border-radius: var(--xp-app-radius-chip);
  color: var(--xp-app-text);
  cursor: pointer;
  font-family: var(--xp-app-font-body);
  font-size: 0.95rem;
  -webkit-tap-highlight-color: transparent;

  &:active {
    background: var(--xp-app-press);
  }

  &.is-picked {
    background: var(--xp-app-surface-2);
    border-color: var(--xp-app-accent);
    box-shadow: 0 0 0 2px var(--xp-app-accent);
  }
}

// ---- Preview: the solver's word, then each floor -----------------------------------------------------------------

.tg-verdict {
  margin-bottom: 12px;
  padding: 10px 12px;
  background: var(--xp-app-surface);
  border: var(--xp-app-section-border);
  border-left: 4px solid var(--xp-app-accent);
  border-radius: var(--xp-app-radius-tile);
  color: var(--xp-app-text);

  &.is-failed {
    border-left-color: var(--ion-color-danger, #eb445a);
  }

  &__title {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 1.05rem;

    i {
      color: var(--xp-app-accent);
    }
  }

  &.is-failed &__title i {
    color: var(--ion-color-danger, #eb445a);
  }

  &__id {
    margin-left: auto;
    font-family: monospace;
    font-size: 0.8rem;
    opacity: 0.7;
  }

  &__line {
    margin-top: 4px;
    font-size: 0.9rem;
    opacity: 0.9;
  }
}

// The error box has an icon and a line, no title row
div.tg-verdict.is-failed > i {
  margin-right: 8px;
  color: var(--ion-color-danger, #eb445a);
}

.tg-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;

  i {
    margin-right: 4px;
    color: var(--xp-app-accent);
  }
}

.tg-reasons {
  margin: 6px 0 0;
  padding-left: 18px;
  color: var(--ion-color-danger, #eb445a);
  font-size: 0.85rem;
}

.tg-floors {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.tg-floor {
  &__title {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 6px;
    color: var(--xp-app-text);
    font-size: 0.95rem;

    i {
      color: var(--xp-app-accent);
    }
  }

  &__hint {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-left: auto;
    font-size: 0.75rem;
    opacity: 0.8;
  }
}

.path-dot,
.path-step {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--ion-color-rpg);
  color: var(--ion-color-rpg-contrast);
  font-size: 10px;
  font-weight: bold;
  box-shadow: 0 0 6px rgba(247, 232, 168, 0.9);
}

.path-dot {
  width: 10px;
  height: 10px;
}

.grid-scale {
  overflow-x: auto;
  padding-bottom: 4px;
}

.grid-stage {
  position: relative;
  display: inline-block;
  zoom: 0.72;
}

// Same geometry as XpTempleCreatorGrid: 10px padding, 50px cells with a 1px margin on each side
.path-overlay {
  position: absolute;
  top: 10px;
  left: 10px;
  display: grid;
  pointer-events: none;
}

.path-cell {
  width: 52px;
  height: 52px;
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  padding: 3px;
  box-sizing: border-box;

  &.on-path {
    outline: 2px solid rgba(247, 232, 168, 0.75);
    outline-offset: -3px;
    border-radius: 6px;
  }
}

.mono-preview {
  margin: 6px 0 0;
  padding: 8px 10px;
  background: #101018;
  color: var(--ion-color-rpg);
  font-family: "Courier New", monospace;
  font-size: 0.8rem;
  line-height: 1.1;
  letter-spacing: 0.35em;
  border-radius: 6px;
  overflow-x: auto;
}
</style>

<template>
  <ion-modal
    :is-open="isOpen"
    class="temple-generate-modal"
    @didDismiss="$emit('close')"
  >
    <ion-header>
      <ion-toolbar class="rpg-box">
        <ion-title>
          <i class="fad fa-dice-d20 mr-2"></i>
          Generate a Temple
        </ion-title>
        <ion-buttons slot="end">
          <ion-button
            fill="clear"
            @click="$emit('close')"
          >
            <i class="fas fa-times"></i>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="generate-form rpg-box">
        <ion-item lines="none">
          <ion-label position="stacked">Seed</ion-label>
          <ion-input
            v-model="form.seed"
            placeholder="attic-417"
            :clear-input="true"
            @ionChange="dirty = true"
          />
        </ion-item>

        <div class="form-row">
          <ion-item lines="none">
            <ion-label position="stacked">Size</ion-label>
            <ion-select
              v-model="form.size"
              interface="popover"
              @ionChange="dirty = true"
            >
              <ion-select-option value="small">Small</ion-select-option>
              <ion-select-option value="medium">Medium</ion-select-option>
              <ion-select-option value="large">Large</ion-select-option>
            </ion-select>
          </ion-item>
          <ion-item lines="none">
            <ion-label position="stacked">Floors</ion-label>
            <ion-select
              v-model="form.floors"
              interface="popover"
              @ionChange="dirty = true"
            >
              <ion-select-option
                v-for="n in [1, 2, 3]"
                :key="n"
                :value="n"
              >{{ n }}</ion-select-option>
            </ion-select>
          </ion-item>
          <ion-item lines="none">
            <ion-label position="stacked">Locks</ion-label>
            <ion-select
              v-model="form.locks"
              interface="popover"
              @ionChange="dirty = true"
            >
              <ion-select-option
                v-for="n in [0, 1, 2, 3]"
                :key="n"
                :value="n"
              >{{ n }}</ion-select-option>
            </ion-select>
          </ion-item>
        </div>

        <div class="form-row">
          <ion-item lines="none">
            <ion-label position="stacked">Theme</ion-label>
            <ion-input
              v-model="form.theme"
              placeholder="Kitchen, Yard, Homework or a world"
              list="temple-theme-worlds"
              @ionChange="dirty = true"
            />
            <datalist id="temple-theme-worlds">
              <option
                v-for="world in worlds"
                :key="world"
                :value="world"
              />
            </datalist>
          </ion-item>
          <ion-item lines="none">
            <ion-label position="stacked">Element</ion-label>
            <ion-select
              v-model="form.element"
              interface="popover"
              @ionChange="dirty = true"
            >
              <ion-select-option
                v-for="element in elements"
                :key="element"
                :value="element"
              >{{ titleCase(element) }}</ion-select-option>
            </ion-select>
          </ion-item>
        </div>

        <div class="form-actions">
          <ion-button
            color="rpg"
            :disabled="!form.theme.trim() || !form.seed.trim()"
            @click="generate"
          >
            <i class="fad fa-dice-d20 mr-2"></i>
            Generate
          </ion-button>
          <ion-button
            fill="outline"
            color="rpg"
            :disabled="!form.seed.trim()"
            @click="reroll"
          >
            <i class="fad fa-redo mr-2"></i>
            Reroll
          </ion-button>
        </div>
      </div>

      <div
        v-if="error"
        class="verdict rpg-box verdict-failed"
      >
        <i class="fad fa-skull-crossbones mr-2"></i>
        {{ error }}
      </div>

      <template v-if="temple && verdict && summary">
        <div
          class="verdict rpg-box"
          :class="verdict.solvable ? 'verdict-solvable' : 'verdict-failed'"
        >
          <div class="verdict-title">
            <i
              class="fad mr-2"
              :class="verdict.solvable ? 'fa-check-circle' : 'fa-times-circle'"
            ></i>
            <strong>{{ temple.name }}</strong>
            <span class="verdict-id">{{ recordId }}</span>
          </div>
          <div class="verdict-line">
            {{ verdict.solvable ? "Solvable" : "Not solvable" }}
            · critical path {{ temple.criticalPath.length }} rooms
            · {{ summary.floors }} floor{{ summary.floors === 1 ? "" : "s" }} of {{ summary.rows }}×{{ summary.cols }}
            · {{ summary.rooms }} rooms
          </div>
          <div class="verdict-line stats">
            <span><i class="fad fa-bat"></i> {{ summary.monsters }}</span>
            <span><i class="fad fa-key"></i> {{ summary.keys }} keys / {{ summary.locks }} locks</span>
            <span><i class="fad fa-treasure-chest"></i> {{ summary.chests }}</span>
            <span v-if="summary.hasMasterKey"><i class="fad fa-key-skeleton"></i> Boss Key</span>
            <span v-if="summary.hasPegasus"><i class="fad fa-pegasus"></i> Pegasus</span>
            <span v-if="temple.attempts > 1"><i class="fad fa-history"></i> {{ temple.attempts }} tries</span>
          </div>
          <ul
            v-if="verdict.reasons.length"
            class="verdict-reasons"
          >
            <li
              v-for="reason in verdict.reasons"
              :key="reason"
            >{{ reason }}</li>
          </ul>
        </div>

        <div class="preview-floors">
          <div
            v-for="(floor, index) in floorGrids"
            :key="floor.id"
            class="preview-floor"
          >
            <div class="floor-title">
              <i class="fad fa-layer-group mr-2"></i>{{ floor.id }}
              <span class="path-hint"><span class="path-dot"></span> critical path</span>
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
                    <span
                      v-if="cell.step !== null"
                      class="path-step"
                    >{{ cell.step }}</span>
                  </div>
                </div>
              </div>
            </div>
            <pre class="mono-preview">{{ monoRows[index]?.rows.join("\n") }}</pre>
          </div>
        </div>

        <div class="form-actions save-actions">
          <ion-button
            color="rpg"
            expand="block"
            :disabled="!verdict.solvable || saving"
            @click="save"
          >
            <i class="fad fa-save mr-2"></i>
            {{ saving ? "Saving…" : `Save as ${recordId}` }}
          </ion-button>
        </div>
      </template>
    </ion-content>
  </ion-modal>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonItem,
  IonLabel,
  IonInput,
  IonSelect,
  IonSelectOption,
  alertController,
  toastController,
} from "@ionic/vue";
import {
  generateTemple,
  solveTemple,
  floorsOf,
  previewRows,
  summarize,
  toTempleRecord,
  generatedTempleId,
  randomSeed,
  nextSeed,
  recordToSave,
  type GeneratedTemple,
  type SolveResult,
  type TakenIdAnswer,
  type TempleSize,
  type TempleSummary,
} from "@/lib/engine/dungeons/generator";
import { TempleDb, templeStorage, type TempleInterface } from "@/lib/databases/TempleDb";
import { TEMPLE_METADATA } from "@/lib/engine/temples/templeRegistry";
import { ROOM_ICONS } from "@/lib/engine/dungeons/roomTypes";
import { SIDE_TYPE_INFO } from "./XpTempleCreator/hooks/useTempleCreator";
import XpTempleCreatorGrid from "./XpTempleCreator/XpTempleCreatorGrid.vue";
import { play$fx } from "@/assets/fx";
import debug from "@/lib/utils/debug";

defineProps<{ isOpen: boolean }>();
const emit = defineEmits<{ (e: "close"): void; (e: "saved", record: TempleInterface): void }>();

const worlds = [...new Set(Object.values(TEMPLE_METADATA).map((meta) => meta.world))].map(titleCase);
const elements = ["wind", "earth", "water", "fire", "ice", "light", "shadow", "storm", "moon"];

const form = reactive({
  seed: randomSeed(),
  size: "medium" as TempleSize,
  floors: 2 as 1 | 2 | 3,
  locks: 2 as 0 | 1 | 2 | 3,
  theme: "Kitchen",
  element: "wind",
});

const dirty = ref(false);
const saving = ref(false);
const error = ref("");
const temple = ref<GeneratedTemple | null>(null);
const verdict = ref<SolveResult | null>(null);
const summary = ref<TempleSummary | null>(null);

const roomIcons = ROOM_ICONS as Record<string, string>;
const sideTypeInfo = SIDE_TYPE_INFO;

const templeDb = new TempleDb(templeStorage);

function titleCase(text: string): string {
  return text.replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
}

const recordId = computed(() => (temple.value ? generatedTempleId(temple.value.seed) : ""));

/** Each floor's grid plus, per cell, its step number on the critical path (null off the path). */
const floorGrids = computed(() => {
  if (!temple.value) return [];
  const steps = new Map<string, number>();
  temple.value.criticalPath.forEach((ref, i) => steps.set(`${ref.floor}:${ref.row},${ref.col}`, i + 1));
  return Object.entries(floorsOf(temple.value.maze)).map(([id, grid]) => ({
    id,
    grid,
    cells: grid.flatMap((row, r) =>
      row.map((_, c) => ({ key: `${id}:${r},${c}`, step: steps.get(`${id}:${r},${c}`) ?? null }))
    ),
  }));
});

const monoRows = computed(() => (temple.value ? previewRows(temple.value, temple.value.criticalPath) : []));

function generate() {
  error.value = "";
  try {
    const generated = generateTemple(form.seed.trim(), {
      theme: form.theme.trim(),
      size: form.size,
      floors: form.floors,
      locks: form.locks,
      element: form.element,
    });
    temple.value = generated;
    verdict.value = solveTemple(generated);
    summary.value = summarize(generated);
    dirty.value = false;
    play$fx("select");
  } catch (err: unknown) {
    temple.value = null;
    verdict.value = null;
    summary.value = null;
    error.value = err instanceof Error ? err.message : String(err);
    play$fx("no");
    debug.error("generateTemple failed", err);
  }
}

function reroll() {
  form.seed = nextSeed(form.seed.trim());
  generate();
}

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
  if (!temple.value || !verdict.value?.solvable) return;
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

// A changed form makes the shown verdict stale: say so by clearing it until Generate runs again
watch(dirty, (isDirty) => {
  if (isDirty) {
    temple.value = null;
    verdict.value = null;
    summary.value = null;
  }
});
</script>

<style lang="scss" scoped>
.temple-generate-modal {
  --width: min(96vw, 720px);
  --height: 92vh;
  --border-radius: 12px;
}

.generate-form {
  padding: 8px 12px 12px;
  margin-bottom: 12px;

  ion-item {
    --background: transparent;
    --padding-start: 0;
    flex: 1;
  }
}

.form-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;

  ion-item {
    min-width: 120px;
  }
}

.form-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;

  &.save-actions {
    margin-top: 16px;
  }
}

.verdict {
  padding: 10px 12px;
  margin-bottom: 12px;
  border-left: 4px solid var(--ion-color-medium);

  &.verdict-solvable {
    border-left-color: var(--ion-color-success);
  }

  &.verdict-failed {
    border-left-color: var(--ion-color-danger);
  }

  .verdict-title {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 1.05rem;
  }

  .verdict-id {
    margin-left: auto;
    font-family: monospace;
    font-size: 0.8rem;
    opacity: 0.7;
  }

  .verdict-line {
    margin-top: 4px;
    font-size: 0.9rem;
    opacity: 0.9;
  }

  .stats {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;

    i {
      margin-right: 4px;
    }
  }

  .verdict-reasons {
    margin: 6px 0 0;
    padding-left: 18px;
    font-size: 0.85rem;
    color: var(--ion-color-danger);
  }
}

.preview-floors {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.floor-title {
  display: flex;
  align-items: center;
  margin-bottom: 6px;
  font-size: 0.95rem;

  .path-hint {
    margin-left: auto;
    font-size: 0.75rem;
    opacity: 0.8;
    display: flex;
    align-items: center;
    gap: 4px;
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

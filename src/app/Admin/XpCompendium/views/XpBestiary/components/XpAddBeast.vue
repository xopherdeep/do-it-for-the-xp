<template>
  <ion-page class="beast-wizard" :class="rootClass" :style="rootStyle">
    <!-- The Earthbound battle backdrop the beast will fight on: live behind every step, the steps sit in plates over it -->
    <canvas ref="battleCanvas" class="battle-bg" aria-hidden="true"></canvas>

    <xp-wizard-shell
      v-if="isLoaded"
      v-model:index="position"
      :steps="steps"
      :draft="draft"
      :title="isEditing ? 'Edit Beast' : 'New Beast'"
      icon="paw-claws"
      :verb="isEditing ? 'Save' : 'Summon'"
      :verb-icon="isEditing ? 'save' : 'magic'"
      :busy="isSaving"
      @close="dismiss"
      @submit="summon"
    >
      <!-- 1. LOOK: the beast on its battlefield; the pickers sit at the bottom, in thumb reach -->
      <template #look>
        <section class="bw-stage" data-test="step-look">
          <button type="button" class="bw-beast" aria-label="Pick a beast" data-test="beast-art" @click="pickBeast">
            <img v-if="portrait" class="bw-beast__art" :src="portrait" alt="" />
            <span v-else class="bw-beast__empty">
              <i class="fad fa-camera" aria-hidden="true"></i>
              <span>Tap to pick a beast</span>
            </span>
          </button>
        </section>
      </template>

      <!-- 2. NAME: the beast waits while its name is typed below -->
      <template #name>
        <section class="bw-stage" data-test="step-name">
          <img v-if="portrait" class="bw-beast__art bw-beast__art--small" :src="portrait" alt="" />
          <p class="bw-nameplate" :class="{ 'is-empty': !draft.name.trim() }" data-test="nameplate">
            {{ draft.name.trim() || "???" }}
          </p>
        </section>
      </template>

      <!-- 3. CHORES: the ordered list that beats it; a new chore is typed at the bottom -->
      <template #chores>
        <section class="bw-window" data-test="step-chores">
          <button type="button" class="xp-app-btn xp-app-btn--ghost bw-ai" data-test="ai-help" @click="openDetailsModal">
            <i class="fad fa-sparkles" aria-hidden="true"></i>
            AI name &amp; chores
          </button>

          <ol v-if="draft.checklist.length" class="bw-chores">
            <li v-for="(_, index) in draft.checklist" :key="index" class="bw-chore" data-test="chore-row">
              <span class="bw-chore__n" aria-hidden="true">{{ index + 1 }}</span>
              <ion-textarea
                v-model="draft.checklist[index]"
                class="bw-chore__text"
                :auto-grow="true"
                :rows="1"
                :aria-label="`Chore ${index + 1}`"
                placeholder="Describe the chore"
                enterkeyhint="done"
                data-test="chore-text"
                @keydown.enter.exact.prevent="focusChoreInput"
              />
              <button
                type="button"
                class="bw-chore__btn"
                :disabled="index === 0"
                :aria-label="`Move chore ${index + 1} up`"
                data-test="chore-up"
                @click="moveUp(index)"
              >
                <i class="fad fa-chevron-up" aria-hidden="true"></i>
              </button>
              <button
                type="button"
                class="bw-chore__btn"
                :disabled="index === draft.checklist.length - 1"
                :aria-label="`Move chore ${index + 1} down`"
                data-test="chore-down"
                @click="moveDown(index)"
              >
                <i class="fad fa-chevron-down" aria-hidden="true"></i>
              </button>
              <button
                type="button"
                class="bw-chore__btn bw-chore__btn--drop"
                :aria-label="`Remove chore ${index + 1}`"
                data-test="chore-drop"
                @click="drop(index)"
              >
                <i class="fad fa-trash-alt" aria-hidden="true"></i>
              </button>
            </li>
          </ol>
          <p v-else class="bw-empty" data-test="no-chores">
            <i class="fad fa-tasks" aria-hidden="true"></i>
            <span>No chores yet. Add the first one below.</span>
          </p>
        </section>
      </template>

      <!-- 4. SUMMON: the card, and a line for each answer that goes back to its step -->
      <template #summon>
        <section class="bw-summary" data-test="step-summon">
          <article class="bw-card" :aria-label="draft.name.trim() || 'Nameless beast'">
            <img v-if="portrait" class="bw-beast__art bw-beast__art--tiny" :src="portrait" alt="" />
            <h2 class="bw-card__name" data-test="summary-title">{{ draft.name.trim() || "Nameless beast" }}</h2>
          </article>

          <ul class="bw-lines">
            <li v-for="line in summary" :key="line.stepId">
              <button
                type="button"
                class="bw-line"
                :class="{ 'is-missing': line.isMissing }"
                :data-test="`summary-${line.stepId}`"
                @click="goTo(line.stepId)"
              >
                <span class="bw-line__label">{{ line.label }}</span>
                <span class="bw-line__value">{{ line.value }}</span>
                <i class="fad fa-pencil" aria-hidden="true"></i>
              </button>
              <ol v-if="line.stepId === 'chores' && chores.length" class="bw-line__chores">
                <li v-for="(chore, index) in chores" :key="index" data-test="summary-chore">{{ chore }}</li>
              </ol>
            </li>
          </ul>
        </section>
      </template>

      <!-- The field of each step sits at the bottom, above Back / Next, in thumb reach -->
      <template #above-nav="{ step: asked }">
        <div v-if="asked.id === 'look'" class="bw-picks">
          <button type="button" class="xp-app-btn bw-pick" data-test="pick-beast" @click="pickBeast">
            <i class="fad fa-paw-claws" aria-hidden="true"></i>
            {{ draft.avatar ? "Change beast" : "Pick a beast" }}
          </button>
          <button type="button" class="xp-app-btn xp-app-btn--ghost bw-pick" data-test="pick-background" @click="pickBackground">
            <i class="fad fa-image" aria-hidden="true"></i>
            Background
          </button>
        </div>

        <label v-else-if="asked.id === 'name'" class="xp-app-search">
          <i class="fad fa-pencil" aria-hidden="true"></i>
          <input
            v-model="draft.name"
            type="text"
            placeholder="e.g. Kitchen Dragon"
            aria-label="Beast name"
            autocomplete="off"
            enterkeyhint="done"
            data-test="name-input"
            @keyup.enter="closeKeyboard"
          />
        </label>

        <label v-else-if="asked.id === 'chores'" class="xp-app-search">
          <i class="fad fa-plus" aria-hidden="true"></i>
          <input
            ref="choreInput"
            v-model="choreText"
            type="text"
            placeholder="Add a chore it loses to"
            aria-label="Add a chore"
            autocomplete="off"
            enterkeyhint="done"
            maxlength="120"
            data-test="chore-input"
            @keyup.enter="addNewChore"
            @blur="addNewChore"
          />
          <button
            type="button"
            class="xp-app-btn bw-add"
            :disabled="!choreText.trim()"
            data-test="chore-add"
            @click="addNewChore"
          >
            + chore
          </button>
        </label>
      </template>
    </xp-wizard-shell>

    <!-- Its own button is hidden: the Background button above opens the sheet, in thumb reach -->
    <xp-background-selector
      ref="backgroundSelector"
      class="bw-selector"
      :target-ref="backdropTarget"
      :initial-bg1="draft.bg1"
      :initial-bg2="draft.bg2"
      :aspect-ratio="draft.aspectRatio"
      @background-changed="onBackgroundChanged"
    />

    <!-- A new beast appears: the fanfare, then the Bestiary -->
    <xp-hero-fanfare
      :open="showFanfare"
      :name="savedName"
      :subtitle="savedSubtitle"
      title="A new beast appears!"
      action-text="To the Bestiary"
      :portrait="savedPortrait"
      @done="finishFanfare"
    />
  </ion-page>
</template>

<script setup lang="ts">
import { computed, nextTick, onActivated, onMounted, onUnmounted, ref } from "vue";
import { IonPage, IonTextarea, modalController, toastController } from "@ionic/vue";
import { useRoute, useRouter } from "vue-router";
import { play$fx } from "@/assets/fx";
import AvatarSelect from "@/components/molecules/AvatarSelect";
import XpBackgroundSelector from "@/components/molecules/BackgroundSelector/XpBackgroundSelector.vue";
import XpHeroFanfare from "@/components/organisms/HeroFanfare/XpHeroFanfare.vue";
import XpWizardShell from "@/components/organisms/WizardShell/XpWizardShell.vue";
import { useAppSkin } from "@/components/organisms/XpApp/useAppSkin";
import { beastPortraitUrl } from "@/app/Admin/XpCompendium/views/XpTemples/components/XpTempleCreator/components/beastPortrait";
import BestiaryDb, { beastStorage } from "@/lib/databases/BestiaryDb";
import { backgroundManager } from "@/lib/engine/core/BackgroundManager";
import debug from "@/lib/utils/debug";
import BeastDetailsModal from "./BeastDetailsModal.vue";
import {
  addChore,
  beastPatch,
  beastProblem,
  beastSummary,
  beastWizardSteps,
  draftFromBeast,
  dropChore,
  filledChores,
  moveChore,
  newBeastDraft,
  openingIndex,
} from "../beastWizard";
import type { BeastDraft, BeastStepId } from "../beastWizard";

/**
 * The Game Master's beast form on the shared wizard shell (docs: compendium-wizards-design, W1): Pick its look, Name it,
 * Chores that beat it, then the summary with Summon. A new beast opens on its look; an edit opens on the summary with
 * the dots to go back by. Nothing is saved until the verb: BestiaryDb.setBeast merges the patch into the stored beast,
 * so an edit keeps the quests it is attached to, its element, its temple theme and its second look.
 */

// The page id the background engine knows this canvas by
const PAGE_ID = "beast-editor";

const props = defineProps<{ id?: string }>();

const router = useRouter();
const route = useRoute();
const bestiary = new BestiaryDb(beastStorage);
// The Bestiary is the Beast Log's purple (owner: each app keeps its accent, cream text on it)
const { rootClass, rootStyle } = useAppSkin("quests");

const beastId = props.id || (route.params.id as string | undefined) || "";

const queryBackground = (value: unknown): number | undefined => {
  const parsed = parseInt(String(value), 10);
  return Number.isNaN(parsed) ? undefined : parsed;
};

// ---- The draft ---------------------------------------------------------------------------------------------------

const steps = beastWizardSteps();
const draft = ref<BeastDraft>(newBeastDraft({ bg1: queryBackground(route.query.bg1), bg2: queryBackground(route.query.bg2) }));
const position = ref(0);
// An edit waits for the stored beast so the form never flashes empty; a new beast has nothing to wait for
const isLoaded = ref(!beastId);
const isSaving = ref(false);
const isEditing = computed(() => draft.value.id !== "");

const portrait = computed(() => beastPortraitUrl(draft.value.avatar) ?? "");
const summary = computed(() => beastSummary(draft.value));
const chores = computed(() => filledChores(draft.value));

const loadBeast = async () => {
  if (!beastId) return;
  try {
    const stored = (await bestiary.getBeasts()).find((beast) => beast?.id === beastId);
    // An id that is no beast opens a new one
    if (stored) draft.value = draftFromBeast(stored);
  } catch (error) {
    debug.error("Error loading beast data:", error);
  } finally {
    position.value = openingIndex(steps, draft.value);
    isLoaded.value = true;
  }
};

// ---- The backdrop ------------------------------------------------------------------------------------------------

const battleCanvas = ref<HTMLCanvasElement | null>(null);

const startBackdrop = () => {
  const canvas = battleCanvas.value;
  backgroundManager.initBackground({
    canvasElement: canvas ?? undefined,
    // Only if the ref is gone: another page's canvas may be in the DOM too (Ionic keeps stacked pages)
    canvasSelector: canvas ? undefined : "canvas.battle-bg",
    bg1: draft.value.bg1,
    bg2: draft.value.bg2,
    aspectRatio: draft.value.aspectRatio,
    handleResize: true,
    page: PAGE_ID,
  });
};

// A picker or the AI helper takes the one engine over while it is open, so take it back when it closes
const reclaimBackdrop = async () => {
  await nextTick();
  startBackdrop();
};

// What the background sheet reads and drives: the draft's backdrop, and "enter battle" to restart the engine
const backdropTarget = computed(() => ({
  bg1: draft.value.bg1,
  bg2: draft.value.bg2,
  aspectRatio: draft.value.aspectRatio,
  enterBattle: startBackdrop,
}));

const backgroundSelector = ref<InstanceType<typeof XpBackgroundSelector> | null>(null);

const pickBackground = () => {
  play$fx("openMenu");
  backgroundSelector.value?.openBgControlsModal?.();
};

const onBackgroundChanged = (picked: { bg1: number; bg2: number; aspectRatio?: number }) => {
  draft.value.bg1 = picked.bg1;
  draft.value.bg2 = picked.bg2;
  if (picked.aspectRatio !== undefined) draft.value.aspectRatio = picked.aspectRatio;
  backgroundManager.updateBackground({
    bg1: draft.value.bg1,
    bg2: draft.value.bg2,
    aspectRatio: draft.value.aspectRatio,
    page: PAGE_ID,
  });
};

onMounted(async () => {
  await loadBeast();
  await nextTick();
  startBackdrop();
});

onActivated(() => {
  // Another page may have the engine now (a kept-alive page comes back to a canvas that is dark)
  if (isLoaded.value && !backgroundManager.isActiveFor(PAGE_ID)) void reclaimBackdrop();
});

onUnmounted(() => {
  // Only clean up if this page was the last one to start the background
  if (backgroundManager.isActiveFor(PAGE_ID)) backgroundManager.cleanupBackground();
});

// ---- 1. Look ---------------------------------------------------------------------------------------------------

const pickBeast = async () => {
  play$fx("openMenu");
  try {
    const modal = await modalController.create({
      component: AvatarSelect,
      componentProps: { avatar: draft.value.avatar, bg1: draft.value.bg1, bg2: draft.value.bg2 },
      cssClass: "avatar-select-modal",
    });
    await modal.present();
    const { data } = await modal.onDidDismiss<number>();
    // The picker took the canvas over, whether it was cancelled or not
    await reclaimBackdrop();
    if (typeof data === "number" && data > 0) draft.value.avatar = data;
  } catch (error) {
    debug.warn("[BeastWizard] the beast picker could not be opened", error);
  }
};

// ---- 2. Name ---------------------------------------------------------------------------------------------------

const closeKeyboard = (event: Event) => {
  (event.target as HTMLElement | null)?.blur();
};

// ---- 3. Chores -------------------------------------------------------------------------------------------------

const choreText = ref("");
const choreInput = ref<HTMLInputElement | null>(null);

// Enter and the "+ chore" button add it; leaving the field with a chore typed adds it too, so Next never loses it
const addNewChore = () => {
  if (!choreText.value.trim()) return;
  play$fx("select");
  draft.value.checklist = addChore(draft.value.checklist, choreText.value);
  choreText.value = "";
};

const focusChoreInput = () => {
  choreInput.value?.focus();
};

const moveUp = (index: number) => {
  play$fx("cursor");
  draft.value.checklist = moveChore(draft.value.checklist, index, -1);
};

const moveDown = (index: number) => {
  play$fx("cursor");
  draft.value.checklist = moveChore(draft.value.checklist, index, 1);
};

const drop = (index: number) => {
  play$fx("cursor");
  draft.value.checklist = dropChore(draft.value.checklist, index);
};

// The AI helper (Pro) suggests a name and chores for the beast; what it hands back replaces the two fields
const openDetailsModal = async () => {
  play$fx("openMenu");
  try {
    const modal = await modalController.create({
      component: BeastDetailsModal,
      componentProps: { beast: { name: draft.value.name, checklist: [...draft.value.checklist] }, showErrors: false },
      cssClass: "beast-details-modal",
      backdropDismiss: true,
      showBackdrop: true,
    });
    await modal.present();
    const { data } = await modal.onWillDismiss<{ beast?: { name?: string; checklist?: string[] } }>();
    const suggested = data?.beast;
    if (typeof suggested?.name === "string") draft.value.name = suggested.name;
    if (Array.isArray(suggested?.checklist)) draft.value.checklist = [...suggested.checklist];
    await reclaimBackdrop();
  } catch (error) {
    debug.warn("[BeastWizard] the AI helper could not be opened", error);
  }
};

// ---- 4. Summon ---------------------------------------------------------------------------------------------------

// A tap on a summary line goes back to the step that owns it (always allowed, even to a step still unanswered)
const goTo = (stepId: BeastStepId) => {
  const at = steps.findIndex((step) => step.id === stepId);
  if (at < 0) return;
  play$fx("cursor");
  position.value = at;
};

const say = async (message: string) => {
  try {
    const toast = await toastController.create({
      message,
      duration: 2600,
      position: "middle",
      buttons: [{ text: "Close", role: "cancel" }],
      cssClass: "rpg-toast",
    });
    await toast.present();
  } catch (error) {
    debug.warn("[BeastWizard] the toast could not be shown", error);
  }
};

const showFanfare = ref(false);
const savedName = ref("");
const savedSubtitle = ref("");
const savedPortrait = ref("");

const goToBestiary = () => router.push({ name: "xp-bestiary" });

const dismiss = () => {
  void goToBestiary();
};

const summon = async () => {
  // The fanfare is up: the beast is already saved, a second tap must not make a second one
  if (isSaving.value || showFanfare.value) return;
  const problem = beastProblem(draft.value);
  if (problem) {
    play$fx("no");
    await say(problem);
    return;
  }
  isSaving.value = true;
  const wasNew = !isEditing.value;
  try {
    // Save once, at the end: the patch is merged into the stored beast, never written over it
    await bestiary.setBeast(beastPatch(draft.value));
    if (wasNew) {
      const count = chores.value.length;
      savedName.value = draft.value.name.trim();
      savedSubtitle.value = count === 1 ? "1 chore beats it" : `${count} chores beat it`;
      savedPortrait.value = portrait.value;
      showFanfare.value = true;
    } else {
      await bestiary.showSuccessToast("Beast Updated Successfully");
      await goToBestiary();
    }
  } catch (error) {
    debug.error("Error saving beast:", error);
    play$fx("no");
    await say("There was a problem saving your beast");
  } finally {
    isSaving.value = false;
  }
};

const finishFanfare = () => {
  showFanfare.value = false;
  void goToBestiary();
};
</script>

<style lang="scss" scoped>
// The page wears the Beast Log's accent through the XpApp kit (useAppSkin); the live battle backdrop shows through the
// body, so the content is transparent and the pieces that must be read sit on plates of the kit's surface.
.battle-bg {
  position: fixed;
  top: 0;
  left: 0;
  z-index: -1;
  width: 100%;
  height: 100%;
  background: black;
  pointer-events: none;
  animation: bw-fade-in 1s ease-in-out;
}

@keyframes bw-fade-in {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

.beast-wizard.xp-app :deep(ion-content) {
  --background: transparent;
}

// The shell's dots and guide line sit straight on the backdrop: give them a plate so they read
.beast-wizard :deep(.xp-wiz-dots) {
  width: fit-content;
  margin: 10px auto 0;
  padding: 6px 12px;
  background: var(--xp-app-surface);
  border: var(--xp-app-section-border);
  border-radius: var(--xp-app-radius-tile);
}

.beast-wizard :deep(.xp-wiz-guide) {
  padding: 8px 12px;
  background: var(--xp-app-surface);
  border: var(--xp-app-section-border);
  border-radius: var(--xp-app-radius-tile);
}

// The background sheet's own icon button is hidden; the Background button in the bar opens it. Its modal stays.
.bw-selector {
  display: contents;

  :deep(.bg-selector-button) {
    display: none;
  }
}

// ---- Look, name and summary: the beast stands on the backdrop ---------------------------------------------------

.bw-stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  min-height: 46vh;
  padding: 8px 12px 16px;
}

.bw-beast {
  display: block;
  margin: 0;
  padding: 0;
  background: none;
  border: 0;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;

  &__art {
    display: block;
    width: min(62vw, 280px);
    max-height: 40vh;
    height: auto;
    object-fit: contain;
    filter: drop-shadow(0 6px 8px rgba(0, 0, 0, 0.55));

    &--small {
      width: min(40vw, 170px);
      max-height: 24vh;
    }

    // The summary keeps its lines in view: the beast is only a badge there
    &--tiny {
      width: min(30vw, 120px);
      max-height: 15vh;
    }
  }

  &__empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    width: min(56vw, 240px);
    aspect-ratio: 1;
    background: var(--xp-app-surface);
    border: 2px dashed var(--xp-app-accent);
    border-radius: var(--xp-app-radius-tile);
    color: var(--xp-app-text);
    font-family: var(--xp-app-font-title);
    font-size: 0.95rem;
    text-align: center;
    text-transform: var(--xp-app-title-transform);

    i {
      color: var(--xp-app-accent);
      font-size: 2.6rem;
    }
  }
}

.bw-nameplate {
  max-width: 100%;
  margin: 0;
  padding: 8px 16px;
  background: var(--xp-app-surface);
  border: var(--xp-app-section-border);
  border-radius: var(--xp-app-radius-tile);
  box-shadow: 0 0 0 2px var(--xp-app-accent);
  color: var(--xp-app-text);
  font-family: var(--xp-app-font-title);
  font-size: 1.3rem;
  line-height: 1.2;
  overflow-wrap: anywhere;
  text-align: center;
  text-transform: var(--xp-app-title-transform);

  &.is-empty {
    color: var(--xp-app-text-dim);
  }
}

// ---- Pickers in the bar (thumb reach) ---------------------------------------------------------------------------

.bw-picks {
  display: flex;
  gap: 10px;
}

.bw-pick {
  flex: 1 1 0;
  min-height: 48px;
  font-size: 0.95rem;
}

.bw-add {
  flex: 0 0 auto;
  min-height: 34px;
}

// ---- Chores ------------------------------------------------------------------------------------------------------

.bw-window {
  margin: 8px 12px 12px;
  padding: 12px;
  background: var(--xp-app-surface);
  border: var(--xp-app-section-border);
  border-radius: var(--xp-app-radius-section);
  box-shadow: 0 0 0 2px var(--xp-app-accent);
  color: var(--xp-app-text);
}

.bw-ai {
  width: 100%;
  min-height: 40px;
  margin-bottom: 10px;
}

.bw-chores {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.bw-chore {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 2px 2px 8px;
  background: var(--xp-app-surface-2);
  border: var(--xp-app-section-border);
  border-radius: var(--xp-app-radius-tile);

  &__n {
    flex: 0 0 auto;
    width: 26px;
    height: 26px;
    background: var(--xp-app-accent);
    border-radius: var(--xp-app-radius-chip);
    color: var(--xp-app-on-accent);
    font-family: var(--xp-app-font-title);
    font-size: 0.85rem;
    line-height: 26px;
    text-align: center;
  }

  &__text {
    --background: transparent;
    --color: var(--xp-app-text);
    --placeholder-color: var(--xp-app-text-dim);
    --placeholder-opacity: 1;
    --padding-start: 6px;
    --padding-end: 6px;
    --padding-top: 10px;
    --padding-bottom: 10px;
    flex: 1 1 auto;
    min-width: 0;
    min-height: 44px;
    font-family: var(--xp-app-font-body);
    font-size: 0.95rem;
  }

  &__btn {
    flex: 0 0 auto;
    width: 38px;
    height: 44px;
    background: transparent;
    border: 0;
    color: var(--xp-app-text);
    cursor: pointer;
    font-size: 1.1rem;
    -webkit-tap-highlight-color: transparent;

    &:disabled {
      cursor: not-allowed;
      opacity: 0.3;
    }

    &:active:not(:disabled) {
      background: var(--xp-app-press);
    }

    &--drop {
      color: var(--xp-app-text-dim);
    }
  }
}

.bw-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin: 8px 0 4px;
  color: var(--xp-app-text-dim);
  font-size: 0.95rem;
  text-align: center;

  i {
    color: var(--xp-app-accent);
    font-size: 2.2rem;
  }
}

// ---- Summary -----------------------------------------------------------------------------------------------------

.bw-summary {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 8px 12px 12px;
}

.bw-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.bw-card__name {
  max-width: 100%;
  margin: 0;
  padding: 6px 14px;
  background: var(--xp-app-surface);
  border: var(--xp-app-section-border);
  border-radius: var(--xp-app-radius-tile);
  box-shadow: 0 0 0 2px var(--xp-app-accent);
  color: var(--xp-app-text);
  font-family: var(--xp-app-font-title);
  font-size: 1.15rem;
  overflow-wrap: anywhere;
  text-align: center;
  text-transform: var(--xp-app-title-transform);
}

.bw-lines {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.bw-line {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 52px;
  padding: 6px 12px;
  background: var(--xp-app-surface);
  border: var(--xp-app-section-border);
  border-radius: var(--xp-app-radius-tile);
  color: var(--xp-app-text);
  cursor: pointer;
  font-family: var(--xp-app-font-body);
  text-align: left;
  -webkit-tap-highlight-color: transparent;

  &:active {
    background: var(--xp-app-surface-2);
  }

  &__label {
    flex: 0 0 auto;
    min-width: 64px;
    color: var(--xp-app-text-dim);
    font-family: var(--xp-app-font-title);
    font-size: 0.8rem;
    text-transform: var(--xp-app-title-transform);
  }

  &__value {
    flex: 1 1 auto;
    min-width: 0;
    font-size: 1rem;
    overflow-wrap: anywhere;
  }

  i {
    flex: 0 0 auto;
    color: var(--xp-app-accent);
  }

  // Something still wanted: the line is ringed in the accent
  &.is-missing {
    border-color: var(--xp-app-accent);
    box-shadow: 0 0 0 1px var(--xp-app-accent);
  }

  &__chores {
    margin: 6px 0 0;
    padding: 8px 12px 8px 34px;
    background: var(--xp-app-surface);
    border: var(--xp-app-section-border);
    border-radius: var(--xp-app-radius-tile);
    color: var(--xp-app-text);
    font-size: 0.95rem;
    line-height: 1.3;

    li {
      padding: 2px 0;
      overflow-wrap: anywhere;
    }
  }
}
</style>

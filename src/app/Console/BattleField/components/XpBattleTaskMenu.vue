<template>
  <div
    class="xp-battle-task-menu"
    :class="{ 'is-busy': busy }"
    data-cy="task-sheet"
    role="dialog"
    aria-modal="true"
    :aria-label="copy.title"
  >
    <!-- Dims the arena behind the sheet; a tap out here closes it -->
    <div class="sheet-backdrop" aria-hidden="true" @click="back"></div>

    <div class="menu-container">
      <header class="sheet-header">
        <h2 class="sheet-title"><i class="fad" :class="copy.icon" aria-hidden="true"></i>{{ copy.title }}</h2>
        <p class="sheet-subtitle">{{ copy.subtitle }}</p>
      </header>

      <ul ref="listEl" class="menu-content" role="list">
        <li v-if="!tasks.length" class="empty-state">No chores on this beast!</li>

        <!-- The beast's chores are the hero's moves, in the order they were written -->
        <li v-for="task in tasks" :key="task.id" class="task-row">
          <button
            type="button"
            class="battle-task-item"
            :class="{ 'is-done': task.isCompleted, 'is-selected': isSelected(task) }"
            :disabled="task.isCompleted"
            :aria-expanded="task.isCompleted ? undefined : isSelected(task)"
            @click="selectTask(task)"
          >
            <i class="task-icon fad" :class="task.isCompleted ? 'fa-check' : copy.icon" aria-hidden="true"></i>
            <span class="task-name">{{ task.name }}</span>
          </button>

          <!-- Under the chore's name, never under the finger. A sibling of the row, because buttons cannot nest -->
          <div v-if="isSelected(task)" class="task-confirm-strip" role="group" aria-label="Confirm chore">
            <span class="confirm-question">{{ copy.question }}</span>
            <div class="confirm-actions">
              <button type="button" class="rpg-button" data-cy="task-not-yet" @click="notYet">{{ copy.no }}</button>
              <button type="button" class="rpg-button is-primary" data-cy="task-confirm" @click="confirmDone(task)">
                {{ copy.yes }}
              </button>
            </div>
          </div>
        </li>
      </ul>

      <footer class="menu-footer">
        <button type="button" class="rpg-button" data-cy="task-back" @click="back">
          <i class="fad fa-undo" aria-hidden="true"></i>Back
        </button>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from "vue";
import { play$fx } from "@/assets/fx";
import type { CombatTask } from "@/lib/services/battle/BattleService";

/** Attack (the default) confirms a finished chore; postpone (the Silver Arrow) picks a chore to send back to the board. */
type TaskSheetMode = "attack" | "postpone";

const props = withDefaults(
  defineProps<{
    /** The beast's checklist, in the order the Game Master wrote it. */
    tasks: CombatTask[];
    enemyName: string;
    /** What one finished chore takes off the beast; only shown in the header. */
    damagePerTask: number;
    mode?: TaskSheetMode;
  }>(),
  { mode: "attack" },
);

const emit = defineEmits<{
  (e: "cancel"): void;
  (e: "attack-start", task: CombatTask): void;
  (e: "task-complete", taskId: string): void;
  (e: "attack-end", payload: { success: true; taskId: string; taskName: string }): void;
  /** Postpone mode: the chore the hero chose to send back to the board. Nothing is completed. */
  (e: "task-pick", taskId: string): void;
}>();

/** The words on the sheet, per mode. */
const copy = computed(() =>
  props.mode === "postpone"
    ? {
        title: "Silver Arrow",
        icon: "fa-bow-arrow",
        subtitle: "Which chore flies back to the board?",
        question: "Send it back? It stays unfinished.",
        no: "Keep it",
        yes: "Send it!",
      }
    : {
        title: "Attack!",
        icon: "fa-claw-marks",
        subtitle: `Each chore hits ${props.enemyName} for ${props.damagePerTask}`,
        question: "Did you finish it?",
        no: "Not yet",
        yes: "Done!",
      },
);

/** A Done! tap this soon after a row opened is the second half of a double-tap, not an answer. */
const CONFIRM_GUARD_MS = 250;

const selectedId = ref<string | null>(null);
/** Latched by Done!: the page closes the sheet next, so nothing else may fire from it before it is gone. */
const busy = ref(false);
const listEl = ref<HTMLElement | null>(null);
let openedAt = 0;

/** The open row, only while that chore is still unfinished (a refreshed checklist can finish it from outside). */
const selectedTask = computed(
  () => props.tasks.find((task) => task.id === selectedId.value && !task.isCompleted) ?? null,
);
const isSelected = (task: CombatTask) => selectedTask.value?.id === task.id;

/** Once a row opens, scrolls the list just far enough that its confirm strip is fully on screen. */
const revealStrip = () => {
  const list = listEl.value;
  const strip = list?.querySelector<HTMLElement>(".task-confirm-strip");
  if (!list || !strip) return;
  const hidden = strip.getBoundingClientRect().bottom - list.getBoundingClientRect().bottom;
  if (hidden <= 0) return;
  const calm = typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  list.scrollBy?.({ top: hidden + 8, behavior: calm ? "auto" : "smooth" });
};

const selectTask = (task: CombatTask) => {
  if (busy.value || task.isCompleted || isSelected(task)) return;
  selectedId.value = task.id;
  openedAt = Date.now();
  play$fx("cursor");
  nextTick(revealStrip);
};

const notYet = () => {
  if (busy.value) return;
  play$fx("no");
  selectedId.value = null;
};

/** The hero says the chore is done: the page deals the damage and closes the sheet; the attack sounds are its job. */
const confirmDone = (task: CombatTask) => {
  if (busy.value || !isSelected(task) || Date.now() - openedAt < CONFIRM_GUARD_MS) return;
  busy.value = true;
  if (props.mode === "postpone") {
    emit("task-pick", task.id);
    return;
  }
  emit("attack-start", task);
  emit("task-complete", task.id);
  emit("attack-end", { success: true, taskId: task.id, taskName: task.name });
};

/** The Back button and the dimmed backdrop both leave the sheet without attacking. */
const back = () => {
  if (busy.value) return;
  play$fx("closeTask");
  emit("cancel");
};
</script>

<style lang="scss" scoped>
@use "@/styles/themes/earthbound.scss" as *;

$button-fill: #4a2a4a;
$button-edge: #1a0a1a;
$seam: rgba($eb-color-cream, 0.25);

// The sheet hugs the bottom of the battle page. Absolute, not fixed or vh: the page is a contained Ionic page and
// its screen shake animates a transform, either of which would re-anchor a fixed box.
.xp-battle-task-menu {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  margin: 0 auto;
  width: 100%;
  max-width: 600px;
  max-height: 70%;
  z-index: 200;
  display: flex;
  flex-direction: column;
  color: $eb-color-cream;
  font-family: "StatusPlz", "Apple Kid", sans-serif;
  -webkit-user-select: none;
  user-select: none;

  // Done! was tapped and the page is closing the sheet: nothing underneath may react to a late tap.
  &.is-busy {
    pointer-events: none;
  }
}

// The root is only as wide and tall as the sheet, so the dim layer reaches far past it and lets the page clip the rest.
// It lives inside the root so the page's <transition> still sees one element.
.sheet-backdrop {
  position: absolute;
  z-index: 0;
  top: -300vh;
  bottom: 0;
  left: -100vw;
  right: -100vw;
  background: rgba(0, 0, 0, 0.45);
}

// The ring shadows of the box reach 16px outside it: keep 20px clear around the card and never clip it.
.menu-container {
  @include eb-box();
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  margin: 20px;
  padding: 14px;
  padding-bottom: calc(10px + env(safe-area-inset-bottom, 0px));
}

.sheet-header {
  flex: 0 0 auto;
  padding: 2px 4px 12px;
  text-align: center;
}

.sheet-title {
  margin: 0;
  font-family: "Apple Kid", sans-serif;
  font-size: 1.5rem;
  font-weight: normal;
  line-height: 1.1;
  letter-spacing: 2px;
  color: $eb-color-pale-yellow;

  i {
    margin-right: 10px;
    font-size: 1.25rem;
  }
}

.sheet-subtitle {
  margin: 6px 0 0;
  font-family: "StatusPlz", sans-serif;
  font-size: 0.95rem;
  line-height: 1.25;
  opacity: 0.85;
}

// The only part that scrolls.
.menu-content {
  @include eb-scrollbar();
  flex: 1 1 auto;
  min-height: 0;
  max-height: 50vh;
  margin: 0;
  padding: 4px;
  list-style: none;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}

.task-row + .task-row {
  margin-top: 8px;
}

.empty-state {
  padding: 18px 8px;
  text-align: center;
  font-family: "Apple Kid", sans-serif;
  font-size: 1.2rem;
  letter-spacing: 1px;
  opacity: 0.8;
}

.battle-task-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 56px;
  margin: 0;
  padding: 10px 14px 10px 18px;
  border: 2px solid rgba($eb-color-cream, 0.22);
  border-radius: 2px;
  background: rgba($eb-color-cream, 0.04);
  color: $eb-color-cream;
  font-family: "Apple Kid", sans-serif;
  font-size: 1.35rem;
  letter-spacing: 1px;
  text-align: left;
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
  transition: background-color 0.15s ease, border-color 0.15s ease, transform 0.1s ease;

  &:active:not(:disabled) {
    transform: scale(0.985);
  }

  &:focus-visible {
    outline: 2px solid $eb-color-pale-yellow;
    outline-offset: 2px;
  }

  // The open row: an accent bar down its left edge and a faint cream wash
  &.is-selected {
    border-color: $eb-color-pale-yellow;
    background: rgba($eb-color-cream, 0.08);

    &::before {
      content: "";
      position: absolute;
      top: 0;
      bottom: 0;
      left: 0;
      width: 5px;
      background: $eb-color-pale-yellow;
    }

    .task-icon {
      animation: claw-nudge 0.5s ease-in-out infinite alternate;
    }
  }

  &.is-done {
    opacity: 0.5;
    cursor: default;

    .task-name {
      text-decoration: line-through;
    }

    .task-icon {
      color: var(--xp-color-xp, #{$eb-color-mint-green});
    }
  }
}

.task-icon {
  flex: 0 0 auto;
  width: 1.6rem;
  font-size: 1.3rem;
  text-align: center;
  color: $eb-color-pale-yellow;
}

// Long chore names wrap; they are never cut off.
.task-name {
  flex: 1 1 auto;
  min-width: 0;
  line-height: 1.2;
  white-space: normal;
  overflow-wrap: anywhere;
}

// Tucked under the open row so the two read as one card.
.task-confirm-strip {
  position: relative;
  margin-top: -2px;
  padding: 10px 14px 12px 18px;
  border: 2px solid $eb-color-pale-yellow;
  border-top-color: $seam;
  border-radius: 2px;
  background: rgba($eb-color-cream, 0.08);
  animation: strip-in 0.2s ease-out both;

  &::before {
    content: "";
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    width: 5px;
    background: $eb-color-pale-yellow;
  }
}

.confirm-question {
  display: block;
  margin-bottom: 8px;
  font-family: "StatusPlz", sans-serif;
  font-size: 1.05rem;
  line-height: 1.25;
}

.confirm-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;

  .rpg-button {
    flex: 1 1 110px;
  }

  .is-primary {
    flex-grow: 1.4;
  }
}

.menu-footer {
  flex: 0 0 auto;
  display: flex;
  justify-content: center;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 2px solid rgba($eb-color-cream, 0.15);
}

// Chunky Earthbound-style buttons: cream on a plum fill with a hard shadow that squashes when pressed.
.rpg-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-width: 140px;
  min-height: 48px;
  margin: 0;
  padding: 8px 14px;
  border: 3px solid rgba($eb-color-cream, 0.45);
  border-radius: 2px;
  background: $button-fill;
  color: $eb-color-cream;
  font-family: "Apple Kid", sans-serif;
  font-size: 1.3rem;
  letter-spacing: 1px;
  line-height: 1.1;
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
  box-shadow: 0 4px 0 $button-edge;
  transition: transform 0.08s ease, box-shadow 0.08s ease;

  &:active {
    transform: translateY(3px);
    box-shadow: 0 1px 0 $button-edge;
  }

  &:focus-visible {
    outline: 2px solid $eb-color-pale-yellow;
    outline-offset: 3px;
  }

  // Done! is the answer we want: it glows, and it fades up while the double-tap guard is still holding it back.
  &.is-primary {
    border-color: $eb-color-pale-yellow;
    color: $eb-color-pale-yellow;
    animation: btn-arm 0.25s linear both, done-glow 1.6s ease-in-out 0.25s infinite;
  }
}

@keyframes strip-in {
  from {
    opacity: 0;
    transform: translateY(-6px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes claw-nudge {
  from {
    transform: translateX(0);
  }

  to {
    transform: translateX(4px);
  }
}

@keyframes btn-arm {
  from {
    opacity: 0.55;
  }

  to {
    opacity: 1;
  }
}

@keyframes done-glow {
  0%,
  100% {
    box-shadow: 0 4px 0 $button-edge, 0 0 0 0 rgba($eb-color-pale-yellow, 0);
  }

  50% {
    box-shadow: 0 4px 0 $button-edge, 0 0 14px 3px rgba($eb-color-pale-yellow, 0.5);
  }
}

// Keep the fades, drop the movement.
@media (prefers-reduced-motion: reduce) {
  .task-confirm-strip {
    animation-name: btn-arm;
  }

  .battle-task-item.is-selected .task-icon {
    animation: none;
  }

  .rpg-button.is-primary {
    animation: btn-arm 0.25s linear both;
  }

  .battle-task-item,
  .rpg-button {
    transition: none;
  }
}
</style>

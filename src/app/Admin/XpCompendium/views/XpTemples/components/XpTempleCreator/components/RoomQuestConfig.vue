<template>
  <div class="quest-config">
    <div class="config-label">Quest</div>

    <QuestRoomRow
      v-if="card"
      :card="card"
      :selectable="false"
    />
    <p
      v-else
      class="lair"
      :class="{ 'is-missing': isMissing }"
    >
      <i
        :class="['fad', isMissing ? 'fa-exclamation-triangle' : 'fa-moon-stars']"
        aria-hidden="true"
      ></i>
      <span>{{ lairText }}</span>
    </p>
    <p
      v-if="fillsTemplate"
      class="config-hint"
    >Your quest for this beast fills the room.</p>

    <div class="quest-actions">
      <button
        type="button"
        class="quest-button"
        @click="emit('change-quest')"
      >
        <i class="fad fa-exchange" aria-hidden="true"></i>
        {{ card ? "Change quest" : "Pick a quest" }}
      </button>
      <button
        type="button"
        class="quest-button"
        :disabled="!editableId"
        @click="editableId && emit('edit-quest', editableId)"
      >
        <i class="fad fa-edit" aria-hidden="true"></i>
        Edit quest
      </button>
    </div>

    <div class="trap-config">
      <div
        class="trap-row"
        :class="{ active: lockOnEnter }"
        role="button"
        tabindex="0"
        :aria-pressed="lockOnEnter"
        @click="emit('toggle-auto-lock')"
        @keydown.enter.self="emit('toggle-auto-lock')"
        @keydown.space.self.prevent="emit('toggle-auto-lock')"
      >
        <div class="trap-info">
          <i
            class="fad fa-dungeon trap-icon"
            :class="{ neutral: !lockOnEnter }"
            aria-hidden="true"
          ></i>
          <span class="trap-label">It's a trap!</span>
        </div>
        <ion-toggle
          :checked="lockOnEnter"
          color="danger"
          mode="ios"
          @ionChange="emit('toggle-auto-lock')"
          @click.stop
        ></ion-toggle>
      </div>
      <p class="config-hint">
        If enabled, the doors lock when the hero steps in, until the quest is done.
      </p>
    </div>

    <button
      type="button"
      class="quest-button test-fight"
      :disabled="!canTestFight"
      @click="emit('test-fight')"
    >
      <i class="fad fa-gamepad" aria-hidden="true"></i>
      Test fight
    </button>
    <p class="config-hint">A free fight with the quest's beast. Nothing is logged.</p>
  </div>
</template>

<script setup lang="ts">
  import { computed } from "vue";
  import { IonToggle } from "@ionic/vue";
  import type { QuestCard } from "@/lib/services/temples/questRoomPicker";
  import type { RoomQuestHolding } from "../hooks/grid/roomQuest";
  import QuestRoomRow from "./QuestRoomRow.vue";

  /**
   * The config of a quest room (shown in the room type modal): the quest card, Change quest, Edit quest (opens the
   * Compendium's quest form), the lock-on-enter toggle and Test fight. A room whose quest was deleted, or whose
   * shipped template no quest fills yet, says so instead of showing a card.
   */
  const props = defineProps<{
    holding: RoomQuestHolding;
    /** The card of the room's quest, or of the live quest that fills its template; null when there is none */
    card: QuestCard | null;
    /** "Dormant: Dust Dervish, no quest yet" for a template nothing fills */
    dormantText?: string;
    lockOnEnter: boolean;
    canTestFight: boolean;
  }>();

  const emit = defineEmits<{
    (e: "change-quest"): void;
    (e: "edit-quest", questId: string): void;
    (e: "toggle-auto-lock"): void;
    (e: "test-fight"): void;
  }>();

  const isMissing = computed(() => props.holding.kind === "missing");
  const fillsTemplate = computed(() => props.holding.kind === "template" && Boolean(props.holding.filler));
  const editableId = computed(() => {
    const { holding } = props;
    if (holding.kind === "picked") return String(holding.quest.id);
    if (holding.kind === "template" && holding.filler) return String(holding.filler.id);
    return "";
  });
  const lairText = computed(() => {
    if (isMissing.value) return "The quest for this room was deleted, or it is still a draft. Pick another, or the lair stays empty.";
    return props.dormantText || "No quest yet.";
  });
</script>

<style lang="scss" scoped>
  @use "@/styles/themes/earthbound.scss" as *;

  .quest-config {
    display: flex;
    flex-direction: column;
    gap: 12px;
    color: $eb-color-cream;
  }

  .config-label {
    font-family: "Press Start 2P";
    font-size: 0.65rem;
    color: #fff;
    opacity: 0.7;
    letter-spacing: 0.5px;
  }

  .config-hint {
    margin: 0;
    font-size: 0.95rem;
    line-height: 1.35;
    opacity: 0.8;
  }

  .lair {
    margin: 0;
    padding: 12px 14px;
    display: flex;
    align-items: center;
    gap: 12px;
    border-radius: 8px;
    background: rgba(20, 6, 28, 0.55);
    border: 2px dashed rgba(231, 230, 179, 0.3);
    font-family: $eb-font-status;
    font-size: 1.05rem;
    line-height: 1.3;

    i {
      font-size: 1.6rem;
      --fa-primary-color: #{$eb-color-pale-yellow};
      --fa-secondary-color: #{$eb-color-pale-yellow};
      --fa-secondary-opacity: 0.5;
    }

    &.is-missing {
      border-color: rgba(255, 82, 82, 0.7);

      i {
        --fa-primary-color: #ff5252;
        --fa-secondary-color: #ff5252;
      }
    }
  }

  .quest-actions {
    display: flex;
    gap: 10px;
  }

  .quest-button {
    flex: 1;
    min-height: 52px;
    padding: 8px 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-family: $eb-font-status;
    font-size: 1rem;
    line-height: 1.15;
    color: $eb-color-cream;
    background: $eb-color-medium-purple;
    border: none;
    border-radius: 1px;
    box-shadow: 0 0 0 3px $eb-color-slate, 0 0 0 5px rgba(104, 208, 184, 0.35);
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;

    i {
      --fa-primary-color: currentColor;
      --fa-secondary-color: currentColor;
    }

    &:active:not(:disabled) {
      transform: translateY(2px);
    }

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    &:focus-visible {
      outline: 2px solid $eb-color-pale-yellow;
      outline-offset: 4px;
    }
  }

  .test-fight {
    flex: none;
    color: #ffb4b4;
  }

  .trap-config {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .trap-row {
    min-height: 52px;
    padding: 8px 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    border-radius: 8px;
    background: rgba(20, 6, 28, 0.55);
    border: 2px solid rgba(231, 230, 179, 0.18);
    cursor: pointer;

    &.active {
      border-color: rgba(255, 82, 82, 0.7);
    }

    &:focus-visible {
      outline: 2px solid $eb-color-pale-yellow;
      outline-offset: 2px;
    }
  }

  .trap-info {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .trap-icon {
    font-size: 1.4rem;
    --fa-primary-color: #ff5252;
    --fa-secondary-color: #ff5252;
    --fa-secondary-opacity: 0.5;

    &.neutral {
      --fa-primary-color: #{$eb-color-cream};
      --fa-secondary-color: #{$eb-color-cream};
      opacity: 0.6;
    }
  }

  .trap-label {
    font-family: $eb-font-status;
    font-size: 1.15rem;
    color: #fff;
  }
</style>

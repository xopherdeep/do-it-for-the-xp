<template>
  <div class="xp-battle-radial-menu" data-cy="battle-radial-menu">
    <!-- Short prompt (e.g. "Do its chores to win!" or "Run away?") -->
    <ion-label v-if="prompt" class="radial-prompt" data-cy="radial-prompt">
      {{ prompt }}
    </ion-label>

    <!-- Standard 5-action combat layout -->
    <div v-if="!isRunConfirm" class="radial-cluster" :class="{ 'is-open': isOpen }">
      <!-- TOP: Attack / Tackle -->
      <div class="radial-slot slot-top" v-if="attackAction">
        <ion-button
          shape="round"
          class="battle-pill pill-attack"
          data-cy="action-attack"
          :disabled="disabled || attackAction.disabled"
          :class="{ 'is-disabled': attackAction.disabled }"
          @click="onActionClick(attackAction)"
        >
          <xp-icon :icon="attackAction.faIcon || 'fist-raised'" size="lg" class="pill-icon" />
          <span class="pill-text">
            <ion-label class="pill-label">{{ attackAction.label }}</ion-label>
            <span v-if="attackAction.note" class="pill-note">{{ attackAction.note }}</span>
          </span>
        </ion-button>
      </div>

      <!-- LEFT (Start): Powers & Defend -->
      <div class="radial-slot slot-left">
        <ion-button
          v-if="powersAction"
          shape="round"
          class="battle-pill pill-powers"
          data-cy="action-powers"
          :disabled="disabled || powersAction.disabled"
          :class="{ 'is-disabled': powersAction.disabled }"
          @click="onActionClick(powersAction)"
        >
          <xp-icon :icon="powersAction.faIcon || 'book-spells'" size="lg" class="pill-icon" />
          <span class="pill-text">
            <ion-label class="pill-label">{{ powersAction.label }}</ion-label>
            <span v-if="powersAction.note" class="pill-note">{{ powersAction.note }}</span>
          </span>
        </ion-button>

        <ion-button
          v-if="defendAction"
          shape="round"
          class="battle-pill pill-defend"
          data-cy="action-defend"
          :disabled="disabled || defendAction.disabled"
          :class="{ 'is-disabled': defendAction.disabled }"
          @click="onActionClick(defendAction)"
        >
          <xp-icon :icon="defendAction.faIcon || 'shield-alt'" size="lg" class="pill-icon" />
          <span class="pill-text">
            <ion-label class="pill-label">{{ defendAction.label }}</ion-label>
            <span v-if="defendAction.note" class="pill-note">{{ defendAction.note }}</span>
          </span>
        </ion-button>
      </div>

      <!-- CENTER: Hero Avatar / 3D Voxel -->
      <div class="radial-slot slot-center">
        <ion-fab-button
          class="center-avatar-btn"
          data-cy="radial-avatar-btn"
          :disabled="disabled"
          @click="onCenterTap"
        >
          <xp-hero-model
            v-if="heroLook"
            :look="heroLook"
            :animation="animation"
            :interactive="false"
            class="hero-voxel-model"
            data-cy="radial-hero-voxel"
          />
          <ion-img v-else-if="heroAvatar" :src="heroAvatar" class="avatar-img" />
          <xp-icon v-else icon="shield-cross" size="2x" />
        </ion-fab-button>
        <!-- The weapon the centre tap swings. A sibling of the button, not a child: the fab button's shadow
             root clips everything slotted into it to the circle. -->
        <xp-icon v-if="attackAction" :icon="attackAction.faIcon || 'fist-raised'" size="sm" class="center-badge" />
      </div>

      <!-- RIGHT (End): Goods & Run Away -->
      <div class="radial-slot slot-right">
        <ion-button
          v-if="goodsAction"
          shape="round"
          class="battle-pill pill-goods"
          data-cy="action-goods"
          :disabled="disabled || goodsAction.disabled"
          :class="{ 'is-disabled': goodsAction.disabled }"
          @click="onActionClick(goodsAction)"
        >
          <xp-icon :icon="goodsAction.faIcon || 'backpack'" size="lg" class="pill-icon" />
          <span class="pill-text">
            <ion-label class="pill-label">{{ goodsAction.label }}</ion-label>
            <span v-if="goodsAction.note" class="pill-note">{{ goodsAction.note }}</span>
          </span>
        </ion-button>

        <ion-button
          v-if="runAction"
          shape="round"
          class="battle-pill pill-run"
          data-cy="action-run"
          :disabled="disabled || runAction.disabled"
          :class="{ 'is-disabled': runAction.disabled }"
          @click="onActionClick(runAction)"
        >
          <xp-icon :icon="runAction.faIcon || 'running'" size="lg" class="pill-icon" />
          <span class="pill-text">
            <ion-label class="pill-label">{{ runAction.label }}</ion-label>
            <span v-if="runAction.note" class="pill-note">{{ runAction.note }}</span>
          </span>
        </ion-button>
      </div>
    </div>

    <!-- Run confirmation layout -->
    <div v-else class="radial-cluster cluster-confirm" :class="{ 'is-open': isOpen }">
      <!-- TOP: Run -->
      <div class="radial-slot slot-top" v-if="confirmRunAction">
        <ion-button
          shape="round"
          class="battle-pill pill-run-confirm"
          data-cy="action-confirm-run"
          :disabled="disabled || confirmRunAction.disabled"
          :class="{ 'is-disabled': confirmRunAction.disabled }"
          @click="onActionClick(confirmRunAction)"
        >
          <xp-icon :icon="confirmRunAction.faIcon || 'running'" size="lg" class="pill-icon" />
          <span class="pill-text">
            <ion-label class="pill-label">{{ confirmRunAction.label }}</ion-label>
            <span v-if="confirmRunAction.note" class="pill-note">{{ confirmRunAction.note }}</span>
          </span>
        </ion-button>
      </div>

      <!-- LEFT: Keep fighting -->
      <div class="radial-slot slot-left" v-if="keepFightingAction">
        <ion-button
          shape="round"
          class="battle-pill pill-keep-fighting"
          data-cy="action-keep-fighting"
          :disabled="disabled || keepFightingAction.disabled"
          :class="{ 'is-disabled': keepFightingAction.disabled }"
          @click="onActionClick(keepFightingAction)"
        >
          <xp-icon :icon="keepFightingAction.faIcon || 'fist-raised'" size="lg" class="pill-icon" />
          <span class="pill-text">
            <ion-label class="pill-label">{{ keepFightingAction.label }}</ion-label>
            <span v-if="keepFightingAction.note" class="pill-note">{{ keepFightingAction.note }}</span>
          </span>
        </ion-button>
      </div>

      <div class="radial-slot slot-center">
        <ion-fab-button
          class="center-avatar-btn is-confirm"
          data-cy="radial-confirm-cancel-btn"
          :disabled="disabled"
          @click="onCenterTap"
        >
          <xp-icon icon="times" size="2x" />
        </ion-fab-button>
      </div>

      <!-- RIGHT: Bribes -->
      <div class="radial-slot slot-right">
        <ion-button
          v-if="bribeFullAction"
          shape="round"
          class="battle-pill pill-bribe-full"
          id="bribe-full"
          data-cy="action-bribe-full"
          :disabled="disabled || bribeFullAction.disabled"
          :class="{ 'is-disabled': bribeFullAction.disabled }"
          @click="onActionClick(bribeFullAction)"
        >
          <xp-icon icon="coins" size="lg" class="pill-icon" />
          <span class="pill-text">
            <ion-label class="pill-label">{{ bribeFullAction.label }}</ion-label>
            <span v-if="bribeFullAction.note" class="pill-note">{{ bribeFullAction.note }}</span>
          </span>
        </ion-button>

        <ion-button
          v-if="bribeLowAction"
          shape="round"
          class="battle-pill pill-bribe-low"
          id="bribe-low"
          data-cy="action-bribe-low"
          :disabled="disabled || bribeLowAction.disabled"
          :class="{ 'is-disabled': bribeLowAction.disabled }"
          @click="onActionClick(bribeLowAction)"
        >
          <xp-icon icon="badge-percent" size="lg" class="pill-icon" />
          <span class="pill-text">
            <ion-label class="pill-label">{{ bribeLowAction.label }}</ion-label>
            <span v-if="bribeLowAction.note" class="pill-note">{{ bribeLowAction.note }}</span>
          </span>
        </ion-button>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { IonButton, IonFabButton, IonImg, IonLabel } from "@ionic/vue";
import XpIcon from "@/components/atoms/Icon/XpIcon.vue";
import XpHeroModel from "@/components/organisms/HeroModel/XpHeroModel.vue";
import type { HeroAnimation, HeroLook } from "@/lib/hero-look/types";
import type { BattleMenuAction } from "../battle/battleMenu";

interface XpBattleRadialMenuProps {
  actions: BattleMenuAction[];
  heroAvatar?: string;
  heroLook?: HeroLook;
  animation?: HeroAnimation;
  prompt?: string;
  isOpen?: boolean;
  disabled?: boolean;
}

const props = withDefaults(
  defineProps<XpBattleRadialMenuProps>(),
  {
    heroAvatar: "",
    prompt: "",
    isOpen: true,
    disabled: false,
    animation: "idle",
  }
);

const emit = defineEmits<{
  (e: "action", actionId: string): void;
  (e: "center-tap"): void;
}>();

const isRunConfirm = computed(() => props.actions.some((action) => action.id === "keep-fighting"));

const attackAction = computed(() => props.actions.find((action) => action.id === "attack"));
const powersAction = computed(() => props.actions.find((action) => action.id === "powers"));
const defendAction = computed(() => props.actions.find((action) => action.id === "defend"));
const goodsAction = computed(() => props.actions.find((action) => action.id === "item"));
const runAction = computed(() => props.actions.find((action) => action.id === "run-away"));

const keepFightingAction = computed(() => props.actions.find((action) => action.id === "keep-fighting"));
const confirmRunAction = computed(() => props.actions.find((action) => action.id === "run"));
const bribeFullAction = computed(() => props.actions.find((action) => action.id === "bribe-full"));
const bribeLowAction = computed(() => props.actions.find((action) => action.id === "bribe-low"));

const onActionClick = (action?: BattleMenuAction) => {
  const isUnavailable = !action || props.disabled || action.disabled;
  if (isUnavailable) return;
  emit("action", action.id);
  action.click();
};

const onCenterTap = () => {
  const isDisabled = props.disabled;
  if (isDisabled) return;
  emit("center-tap");
  const shouldKeepFighting = isRunConfirm.value && keepFightingAction.value;
  const shouldAttack = !isRunConfirm.value && attackAction.value;
  if (shouldKeepFighting) {
    onActionClick(keepFightingAction.value);
  } else if (shouldAttack) {
    onActionClick(attackAction.value);
  }
};
</script>

<style lang="scss" scoped>
.xp-battle-radial-menu {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
  user-select: none;
  z-index: 120;
}

.radial-prompt {
  font-family: var(--gs-font);
  font-size: 1.15rem;
  letter-spacing: 1px;
  color: var(--gs-accent);
  text-shadow: var(--gs-text-shadow);
  text-align: center;
  margin-bottom: 6px;
  animation: prompt-fade 0.25s ease-out;
}

.radial-cluster {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-height: 140px;
  padding: 38px 8px 6px;
  transition: opacity 0.2s ease-out, transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);

  &.is-open {
    opacity: 1;
    transform: scale(1);
  }

  &:not(.is-open) {
    opacity: 0.6;
    transform: scale(0.96);
  }
}

.radial-slot {
  display: flex;
  align-items: center;
  justify-content: center;

  &.slot-top {
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    z-index: 10;
  }

  &.slot-left {
    flex-direction: column;
    align-items: flex-end;
    gap: 8px;
    flex: 1;
    padding-right: 6px;
  }

  &.slot-center {
    position: relative;
    flex-shrink: 0;
    padding: 0 4px;
    z-index: 15;
  }

  &.slot-right {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    flex: 1;
    padding-left: 6px;
  }
}

.cluster-confirm {
  justify-content: center;
  padding-top: 38px;

  .slot-left {
    flex: 0 1 auto;
  }
  .slot-right {
    flex: 0 1 auto;
  }
}

.center-avatar-btn {
  width: 68px;
  height: 68px;
  --border-radius: 50%;
  --background: var(--gs-window-color);
  --color: var(--gs-text);
  --box-shadow: 0 4px 12px rgba(0, 0, 0, 0.7);
  border: 3px solid var(--gs-accent);
  border-radius: 50%;
  overflow: hidden;
  transition: transform 0.15s ease-out, box-shadow 0.15s ease-out;

  &:active {
    transform: scale(0.92);
  }

  .hero-voxel-model {
    width: 100%;
    height: 100%;
    transform: scale(1.15) translateY(2px);
  }

  .avatar-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

// Under .slot-center so these win over XpIcon's own scoped `.fad { display: inline-block }`.
.slot-center .center-badge {
  position: absolute;
  right: 2px;
  bottom: -2px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--gs-window-color);
  color: var(--gs-accent);
  box-shadow: 0 0 0 2px var(--gs-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.battle-pill {
  --border-radius: 24px;
  --background: var(--gs-window);
  --color: var(--gs-text);
  --box-shadow: none;
  box-shadow: 0 0 0 2px var(--gs-divider), 0 3px 8px rgba(0, 0, 0, 0.6);
  border-radius: 24px;
  font-family: var(--gs-font);
  font-size: 1.15rem;
  letter-spacing: 0.5px;
  min-height: 40px;
  margin: 0;
  transition: transform 0.12s ease-out;

  &:active {
    transform: scale(0.94);
  }

  &.is-disabled {
    opacity: 0.45;
  }

  .pill-text {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    line-height: 1.05;
  }

  .pill-label {
    margin: 0 4px;
    font-weight: bold;
    text-shadow: var(--gs-text-shadow);
  }

  .pill-note {
    margin: 0 4px;
    font-family: "StatusPlz", monospace;
    font-size: 0.72em;
    font-weight: normal;
    color: var(--gs-text-dim);
    white-space: nowrap;
    max-width: 9ch;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .pill-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-right: 4px;
  }

  &.pill-attack {
    min-width: 130px;
    box-shadow: 0 0 0 2px var(--gs-accent), 0 3px 8px rgba(0, 0, 0, 0.6);

    .pill-icon {
      color: var(--gs-accent);
    }
  }

  &.pill-powers,
  &.pill-defend,
  &.pill-goods,
  &.pill-run {
    min-width: 104px;
  }

  &.pill-run .pill-icon {
    color: var(--gs-text-dim);
  }

  &.pill-keep-fighting {
    min-width: 130px;
    box-shadow: 0 0 0 2px var(--gs-good), 0 3px 8px rgba(0, 0, 0, 0.6);

    .pill-icon {
      color: var(--gs-good);
    }
  }

  &.pill-run-confirm {
    min-width: 110px;
    box-shadow: 0 0 0 2px var(--gs-danger), 0 3px 8px rgba(0, 0, 0, 0.6);

    .pill-icon {
      color: var(--gs-danger);
    }
  }

  &.pill-bribe-full,
  &.pill-bribe-low {
    box-shadow: 0 0 0 2px var(--gs-accent), 0 3px 8px rgba(0, 0, 0, 0.6);

    .pill-icon {
      color: var(--gs-accent);
    }
  }
}

@keyframes prompt-fade {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>

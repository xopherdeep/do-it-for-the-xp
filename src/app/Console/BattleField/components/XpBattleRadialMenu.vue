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
          color="success"
          class="battle-pill pill-attack"
          data-cy="action-attack"
          :disabled="disabled"
          @click="onActionClick(attackAction)"
        >
          <xp-icon :icon="attackAction.faIcon || 'fist-raised'" size="lg" class="pill-icon" />
          <ion-label class="pill-label">{{ attackAction.label }}</ion-label>
        </ion-button>
      </div>

      <!-- LEFT (Start): Powers & Defend -->
      <div class="radial-slot slot-left">
        <ion-button
          v-if="powersAction"
          shape="round"
          color="tertiary"
          class="battle-pill pill-powers"
          data-cy="action-powers"
          :disabled="disabled"
          @click="onActionClick(powersAction)"
        >
          <xp-icon :icon="powersAction.faIcon || 'book-spells'" size="lg" class="pill-icon" />
          <ion-label class="pill-label">{{ powersAction.label }}</ion-label>
        </ion-button>

        <ion-button
          v-if="defendAction"
          shape="round"
          color="warning"
          class="battle-pill pill-defend"
          data-cy="action-defend"
          :disabled="disabled"
          @click="onActionClick(defendAction)"
        >
          <xp-icon :icon="defendAction.faIcon || 'shield-alt'" size="lg" class="pill-icon" />
          <ion-label class="pill-label">{{ defendAction.label }}</ion-label>
        </ion-button>
      </div>

      <!-- CENTER: Hero Avatar / 3D Voxel -->
      <div class="radial-slot slot-center">
        <ion-fab-button
          color="light"
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
      </div>

      <!-- RIGHT (End): Goods & Run Away -->
      <div class="radial-slot slot-right">
        <ion-button
          v-if="goodsAction"
          shape="round"
          color="danger"
          class="battle-pill pill-goods"
          data-cy="action-goods"
          :disabled="disabled"
          @click="onActionClick(goodsAction)"
        >
          <xp-icon :icon="goodsAction.faIcon || 'backpack'" size="lg" class="pill-icon" />
          <ion-label class="pill-label">{{ goodsAction.label }}</ion-label>
        </ion-button>

        <ion-button
          v-if="runAction"
          shape="round"
          color="dark"
          class="battle-pill pill-run"
          data-cy="action-run"
          :disabled="disabled"
          @click="onActionClick(runAction)"
        >
          <xp-icon :icon="runAction.faIcon || 'running'" size="lg" class="pill-icon" />
          <ion-label class="pill-label">{{ runAction.label }}</ion-label>
        </ion-button>
      </div>
    </div>

    <!-- Run confirmation layout -->
    <div v-else class="radial-cluster cluster-confirm" :class="{ 'is-open': isOpen }">
      <!-- TOP: Run -->
      <div class="radial-slot slot-top" v-if="confirmRunAction">
        <ion-button
          shape="round"
          color="danger"
          class="battle-pill pill-run-confirm"
          data-cy="action-confirm-run"
          :disabled="disabled"
          @click="onActionClick(confirmRunAction)"
        >
          <xp-icon :icon="confirmRunAction.faIcon || 'running'" size="lg" class="pill-icon" />
          <ion-label class="pill-label">{{ confirmRunAction.label }}</ion-label>
        </ion-button>
      </div>

      <!-- LEFT: Keep fighting -->
      <div class="radial-slot slot-left" v-if="keepFightingAction">
        <ion-button
          shape="round"
          color="success"
          class="battle-pill pill-keep-fighting"
          data-cy="action-keep-fighting"
          :disabled="disabled"
          @click="onActionClick(keepFightingAction)"
        >
          <xp-icon :icon="keepFightingAction.faIcon || 'fist-raised'" size="lg" class="pill-icon" />
          <ion-label class="pill-label">{{ keepFightingAction.label }}</ion-label>
        </ion-button>
      </div>

      <div class="radial-slot slot-center">
        <ion-fab-button
          color="light"
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
          color="warning"
          class="battle-pill pill-bribe-full"
          id="bribe-full"
          data-cy="action-bribe-full"
          :disabled="disabled"
          @click="onActionClick(bribeFullAction)"
        >
          <xp-icon icon="coins" size="lg" class="pill-icon" />
          <ion-label class="pill-label">{{ bribeFullAction.label }}</ion-label>
        </ion-button>

        <ion-button
          v-if="bribeLowAction"
          shape="round"
          color="secondary"
          class="battle-pill pill-bribe-low"
          id="bribe-low"
          data-cy="action-bribe-low"
          :disabled="disabled"
          @click="onActionClick(bribeLowAction)"
        >
          <xp-icon icon="badge-percent" size="lg" class="pill-icon" />
          <ion-label class="pill-label">{{ bribeLowAction.label }}</ion-label>
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
  if (!action || props.disabled) return;
  emit("action", action.id);
  action.click();
};

const onCenterTap = () => {
  if (props.disabled) return;
  emit("center-tap");
  if (isRunConfirm.value && keepFightingAction.value) {
    onActionClick(keepFightingAction.value);
  } else if (!isRunConfirm.value && attackAction.value) {
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
  font-family: "StatusPlz", monospace;
  font-size: 1.15rem;
  letter-spacing: 1px;
  color: #ffd700;
  text-shadow: 1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000;
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
  --background: #1e1e24;
  --box-shadow: 0 4px 12px rgba(0, 0, 0, 0.7);
  border: 3px solid #ffd700;
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

.battle-pill {
  --border-radius: 24px;
  --box-shadow: 0 3px 8px rgba(0, 0, 0, 0.6);
  font-family: "Apple Kid", "StatusPlz", monospace, sans-serif;
  font-size: 1.15rem;
  letter-spacing: 0.5px;
  min-height: 40px;
  margin: 0;
  transition: transform 0.12s ease-out;

  &:active {
    transform: scale(0.94);
  }

  .pill-label {
    margin: 0 4px;
    font-weight: bold;
    text-shadow: 1px 1px 1px rgba(0, 0, 0, 0.5);
  }

  .pill-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-right: 4px;
  }

  &.pill-attack {
    min-width: 130px;
    --background: #2ed573;
    --color: #0b2e13;
  }

  &.pill-powers {
    min-width: 104px;
    --background: #70a1ff;
    --color: #ffffff;
  }

  &.pill-defend {
    min-width: 104px;
    --background: #ffa502;
    --color: #2b1d00;
  }

  &.pill-goods {
    min-width: 104px;
    --background: #ff4757;
    --color: #ffffff;
  }

  &.pill-run {
    min-width: 104px;
    --background: #f1f2f6;
    --color: #2f3542;
  }

  &.pill-keep-fighting {
    min-width: 130px;
    --background: #2ed573;
    --color: #0b2e13;
  }

  &.pill-run-confirm {
    min-width: 110px;
    --background: #ff4757;
    --color: #ffffff;
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

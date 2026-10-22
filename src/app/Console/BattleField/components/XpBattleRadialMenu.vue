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

<style lang="scss" scoped src="./_XpBattleRadialMenu.scss" />

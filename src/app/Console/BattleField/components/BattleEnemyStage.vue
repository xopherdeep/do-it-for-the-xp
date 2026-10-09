<template>
  <div class="enemy-container" v-show="visible">
    <div v-if="enemy" class="enemy-name rpg-box icon-colors">{{ enemy.name }}</div>

    <div class="enemy-sprite-container" :class="[animationClass, sizeClass]">
      <img v-if="avatarSrc" :src="avatarSrc" class="enemy-sprite" :alt="enemy?.name || 'Enemy'" />
      <div v-else-if="enemy?.emoji" class="enemy-emoji">{{ enemy.emoji }}</div>
      <div v-else class="enemy-placeholder">?</div>
    </div>

    <div v-if="enemy" class="enemy-bars">
      <!-- Chores left = the beast's remaining health -->
      <div v-if="showHp" class="enemy-progress-bar-container hp">
        <i class="fad fa-skull hp-icon"></i>
        <div class="enemy-progress-bar hp">
          <div class="enemy-progress-fill hp" :style="{ width: progressPercent + '%' }"></div>
          <span class="progress-label">{{ choresLeft }} {{ choresLeft === 1 ? "chore" : "chores" }} left</span>
        </div>
      </div>

      <!-- Attack timer: when it empties, the beast strikes -->
      <div class="enemy-progress-bar-container attack-timer" v-if="timerVisible">
        <i class="fad fa-claw-marks attack-icon" :style="{ color: atbIconColor }"></i>
        <div class="enemy-progress-bar attack-timer">
          <div class="enemy-progress-fill attack" :style="atbBarStyle"></div>
          <span class="progress-label" v-if="atbTimeRemaining">{{ atbTimeRemaining }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CSSProperties } from "vue";
import type { Enemy } from "@/lib/services/battle/BattleService";

defineProps<{
  enemy: Enemy | null;
  avatarSrc: string;
  visible: boolean;
  animationClass: string;
  sizeClass: string;
  showHp: boolean;
  progressPercent: number;
  choresLeft: number;
  timerVisible: boolean;
  atbBarStyle: CSSProperties;
  atbIconColor: string;
  atbTimeRemaining: string;
}>();
</script>

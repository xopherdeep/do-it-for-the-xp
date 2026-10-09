<template>
  <ion-page class="battlefield">
    <!-- Animated Earthbound-style arena background -->
    <canvas ref="canvasRef" class="battle-bg"></canvas>

    <div class="battle-ui-container">
      <!-- TOP: message box with the command menu inside it -->
      <div class="battle-zone battle-zone--top">
        <BattleDialogBox
          ref="typingRef"
          :text="dialogText"
          :accumulated-lines="dialogLines"
          :is-append-mode="dialogIsAppendMode"
          :is-victory="dialogIsVictory"
          :has-more="dialogHasMore"
          :show-menu="showMenu"
          :menu-actions="menuActions"
          @advance="advanceDialog"
          @typing-complete="onDialogTypingComplete"
        />
      </div>

      <!-- MIDDLE: the beast, its chores-left bar and the attack timer -->
      <div class="battle-zone battle-zone--middle">
        <BattleEnemyStage
          :enemy="currentEnemy"
          :avatar-src="avatarSrc"
          :visible="showEnemy"
          :animation-class="enemyAnimationClass"
          :size-class="enemySizeClass"
          :show-hp="showEnemyHp"
          :progress-percent="enemyProgressPercent"
          :chores-left="choresLeft"
          :timer-visible="battleStarted && !!currentEnemy"
          :atb-bar-style="atbBarStyle"
          :atb-icon-color="atbIconColor"
          :atb-time-remaining="atbTimeRemaining"
        />
      </div>

      <!-- BOTTOM: the hero's HP / MP -->
      <div class="battle-zone battle-zone--bottom">
        <XpHpMpHud />
      </div>

      <!-- Attack = pick a chore from the beast's checklist -->
      <transition name="fade">
        <XpBattleTaskMenu
          v-if="showTaskMenu && currentEnemy"
          :tasks="combatTasks"
          :enemy-name="currentEnemy.name"
          @cancel="closeTaskMenu"
          @task-complete="finishCombatTask"
          @attack-end="onTaskAttackEnd"
        />
      </transition>
    </div>
  </ion-page>
</template>

<script lang="ts" src="./BattleField.ts" />
<style lang="scss" src="./_BattleField.scss" />

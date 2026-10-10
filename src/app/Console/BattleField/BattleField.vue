<template>
  <ion-page class="battlefield">
    <!-- Animated Earthbound-style arena background -->
    <canvas ref="canvasRef" class="battle-bg"></canvas>

    <div class="battle-ui-container" :class="{ 'screen-shake': shaking }">
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
          :prompt="menuPrompt"
          @advance="advanceDialog"
          @typing-complete="onDialogTypingComplete"
        />
      </div>

      <!-- MIDDLE: the beast, its chores left and the attack clock -->
      <div class="battle-zone battle-zone--middle">
        <BattleEnemyStage
          :enemy="currentEnemy"
          :avatar-src="avatarSrc"
          :visible="showEnemy"
          :animation-class="enemyAnimationClass"
          :size-class="enemySizeClass"
          :chores-total="choresTotal"
          :chores-left="choresLeft"
          :timer-visible="battleStarted && !!currentEnemy"
          :timer-percent="timerPercent"
          :timer-label="timerLabel"
          :timer-critical="timerCritical"
          :last-hit="lastHit"
          @tap="advanceDialog"
        />
      </div>

      <!-- BOTTOM: the hero -->
      <div class="battle-zone battle-zone--bottom">
        <BattleHeroCard :user-id="heroId" :hit-signal="hitSignal" :downed="heroDowned" />
      </div>
    </div>

    <!-- Overlays sit beside the shaking container so they never shake with it -->
    <!-- Attack = pick a chore from the beast's checklist -->
    <transition name="sheet">
      <XpBattleTaskMenu
        v-if="showTaskMenu && currentEnemy"
        :tasks="combatTasks"
        :enemy-name="currentEnemy.name"
        :damage-per-task="damagePerTask"
        @cancel="closeTaskMenu"
        @task-complete="finishCombatTask"
      />
    </transition>

    <!-- The red sting when the beast lands a hit -->
    <div class="hit-flash" :class="{ 'is-on': flashing }" aria-hidden="true"></div>

    <!-- The loot, counted up over the folded arena -->
    <transition name="victory-pop">
      <div v-if="victoryCard" class="victory-overlay">
        <BattleVictoryCard :visible="true" :card="victoryCard" @continue="continueAfterVictory" />
      </div>
    </transition>
  </ion-page>
</template>

<script lang="ts" src="./BattleField.ts" />
<style lang="scss" src="./_BattleField.scss" />

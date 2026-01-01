<template>
  <ion-page ref="pageRef" class="battlefield">
    <!-- Canvas background for battle scene -->
    <canvas ref="battleBackground" class="battle-bg"></canvas>

    <!-- Battle UI container - Fluid Flexbox Layout -->
    <div class="battle-ui-container">

      <!-- TOP ZONE: Battle dialog/menu -->
      <div class="battle-zone battle-zone--top">
        <!-- Battle dialog box -->
        <div class="battle-dialog rpg-box icon-colors" v-if="battleDialogText || isPlayerTurn">
          <div class="dialog-content" v-if="battleDialogText" @click="advanceBattleDialog">
            <XpTypingText ref="battleDialogRef" :text="battleDialogText" :is-victory="isVictoryMessage"
              @typing-complete="onBattleDialogComplete" />
            <div v-if="hasMoreBattleDialog" class="dialog-more-indicator">▼</div>
          </div>

          <!-- Battle Menu (Replacing FAB) -->
          <div class="dialog-menu" v-else-if="isPlayerTurn">
            <XpRpgMenu :actions="battleMenuActions" borderless />
          </div>
        </div>
      </div>

      <!-- MIDDLE ZONE: Enemy display (flexible height) -->
      <div class="battle-zone battle-zone--middle">
        <div class="enemy-container" v-show="showEnemy">
          <div class="enemy-sprite-container" :class="[enemyAnimationClass, enemySizeClass]">
            <img v-if="currentEnemy && currentEnemy.avatar" :src="getAvatar(currentEnemy.avatar)" class="enemy-sprite"
              alt="Enemy" />
            <div v-else-if="currentEnemy && currentEnemy.emoji" class="enemy-emoji">
              {{ currentEnemy.emoji }}
            </div>
            <div v-else class="enemy-placeholder">?</div>
          </div>

          <!-- Simple progress bar (task completion %) -->
          <div v-if="currentEnemy" class="enemy-bars">
            <div v-if="showEnemyHp" class="enemy-progress-bar hp">
              <div class="enemy-progress-fill hp" :style="{ width: enemyProgressPercent + '%' }"></div>
              <span class="progress-label">PROGRESS</span>
            </div>

            <!-- Attack Timer Bar (ATB) -->
            <div class="enemy-progress-bar-container attack-timer" v-if="battleStarted && currentEnemy">
              <i class="fad fa-claw-marks attack-icon" :style="{ color: atbIconColor }"></i>
              <div class="enemy-progress-bar attack-timer">
                <div class="enemy-progress-fill attack" :style="atbBarStyle"></div>
                <span class="progress-label" v-if="atbTimeRemaining">{{ atbTimeRemaining }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- BOTTOM ZONE: Player HUD -->
      <div class="battle-zone battle-zone--bottom">
        <XpHpMpHud />

      </div>

      <!-- Dev Tools FAB - only visible in dev mode -->
      <DevToolsFab v-if="devMode" @open-profile-selector="openProfileSelector" @open-beast-selector="openBeastSelector"
        @open-controls-modal="openControlsModal" />

      <!-- Dev Battle Actions FAB - only visible in dev mode -->
      <DevBattleActionsFab v-if="devMode" @attack-animation="triggerAttackAnimation" @enemy-hit="triggerEnemyHit"
        @player-hit="triggerPlayerHit" @victory-animation="triggerVictoryAnimation"
        @defeat-animation="triggerDefeatAnimation" @reset-battle="resetBattle" />

      <!-- Dev mode controls -->
      <div v-if="devMode" class="dev-controls">
        <ion-fab vertical="top" horizontal="end" slot="fixed">
          <ion-fab-button color="primary">
            <ion-icon :icon="settings"></ion-icon>
          </ion-fab-button>
          <ion-fab-list side="bottom">
            <ion-fab-button @click="loadSampleBeast" color="light">
              <ion-icon :icon="refresh"></ion-icon>
            </ion-fab-button>
            <ion-fab-button @click="devDamageEnemy(50)" color="danger">
              <ion-icon :icon="flame"></ion-icon>
            </ion-fab-button>
            <ion-fab-button @click="devHealEnemy(50)" color="success">
              <ion-icon :icon="medkit"></ion-icon>
            </ion-fab-button>
            <ion-fab-button @click="devSkipTurn()" color="warning">
              <ion-icon :icon="time"></ion-icon>
            </ion-fab-button>
          </ion-fab-list>
        </ion-fab>
      </div>

      <!-- New Battle Task Menu for "Attack" -->
      <transition name="fade">
        <XpBattleTaskMenu v-if="showTaskMenu && currentEnemy" :tasks="combatTasks" :enemy-name="currentEnemy.name"
          @cancel="closeTaskMenu" @task-complete="finishCombatTask" @attack-end="handleTaskAttackResult" />
      </transition>


      <!-- XpCombatTasks removed - functionality consolidated into XpBattleTaskMenu -->


    </div>
  </ion-page>
</template>

<script lang="ts" src="./BattleField.ts"></script>

<style lang="scss" scoped>
.battlefield {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  background-color: #000;

  .battle-bg {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    z-index: 0;
  }

  // ============================================
  // FLUID FLEXBOX LAYOUT SYSTEM
  // Three zones: Top (dialog) | Middle (enemy) | Bottom (player HUD)
  // ============================================

  .battle-ui-container {
    position: relative;
    z-index: 1;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: 8px;
    gap: 8px;

    // Battle Zone System - no overlap, fluid layout
    .battle-zone {
      width: 100%;
      display: flex;
      justify-content: center;
      align-items: center;

      // TOP ZONE: Dialog/Menu (auto height based on content)
      &--top {
        flex-shrink: 0;
        min-height: 80px;
        z-index: 100;
      }

      // MIDDLE ZONE: Enemy display (flexible - takes remaining space)
      &--middle {
        flex: 1;
        min-height: 150px;
        position: relative;
        overflow: hidden;
      }

      // BOTTOM ZONE: Player HUD (fixed height)
      &--bottom {
        flex-shrink: 0;
        min-height: 120px;
        padding-bottom: env(safe-area-inset-bottom, 0);
        z-index: 50;
      }
    }

    // Enemy container - now relative within the middle zone
    .enemy-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;

      .enemy-sprite-container {
        display: flex;
        justify-content: center;
        align-items: center;
        transition: all 0.3s ease;

        // Default size (monster) - use max dimensions to fit in zone
        width: 55%;
        max-width: 400px;
        max-height: 60%;

        &.monster {
          width: 55%;
        }

        &.miniboss {
          width: 75%;
        }

        &.boss {
          width: 90%;
          max-width: 500px;
        }

        &.appear {
          animation: enemy-appear 0.5s ease-out;
        }

        &.damaged {
          animation: enemy-damaged 0.3s ease-in-out;
        }

        &.fadeout {
          animation: enemy-fadeout 1s ease-in forwards;
        }

        &.victory-strobe {
          animation: victory-strobe 0.2s infinite alternate;
        }

        &.victory-fadeout {
          animation: victory-fadeout 1s ease-in forwards;
        }

        .enemy-sprite {
          width: 100%;
          height: auto;
          max-height: 100%;
          object-fit: contain;
          filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.5));
        }

        .enemy-emoji {
          font-size: clamp(48px, 15vw, 100px);
        }

        .enemy-placeholder {
          width: 100px;
          height: 100px;
          background-color: rgba(0, 0, 0, 0.5);
          border-radius: 50%;
          display: flex;
          justify-content: center;
          align-items: center;
          font-size: 40px;
          color: white;
        }
      }

      // Simple progress bar below enemy
      .enemy-bars {
        width: 80%;
        max-width: 300px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-top: 15px;
        flex-shrink: 0;
      }

      .enemy-progress-bar-container {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 12px;

        .attack-icon {
          font-size: 32px; // Large enough to see clearly
          color: #ff9900;
          filter: drop-shadow(0 0 8px rgba(255, 153, 0, 0.6));
          flex-shrink: 0;
        }
      }

      .enemy-progress-bar {
        width: 100%;
        height: 16px;
        background-color: rgba(0, 0, 0, 0.8);
        border: 2px solid rgba(255, 255, 255, 0.5);
        border-radius: 8px;
        overflow: hidden;
        position: relative;
        flex: 1;

        &.hp {
          height: 16px;
        }

        &.attack-timer {
          height: 18px; // Slightly thinner than HP for hierarchy
          background-color: rgba(0, 0, 0, 0.6);
          border-color: rgba(255, 200, 0, 0.4);
          box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.8);
        }

        .enemy-progress-fill {
          height: 100%;
          transition: width 0.3s ease-out;

          &.hp {
            background: linear-gradient(90deg, #00d2ff 0%, #3a7bd5 100%);
            box-shadow: 0 0 10px rgba(0, 210, 255, 0.5);
          }

          &.attack {
            background: linear-gradient(90deg, #ffcc00 0%, #ff6600 100%);
            box-shadow: 0 0 10px rgba(255, 153, 0, 0.7);
            transition: width 0.1s linear; // Smoother for a timer

            // Add a pulse when nearly empty (less than 30%)
            &[style*="width: 1"],
            &[style*="width: 2"],
            &[style*="width: 0"] {
              filter: brightness(1.2);
              animation: timer-pulse 0.5s infinite alternate;
            }
          }
        }

        .progress-label {
          position: absolute;
          width: 100%;
          text-align: center;
          left: 0;
          top: 0;
          line-height: 14px;
          font-family: 'StatusPlz', sans-serif;
          font-size: 10px;
          color: white;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
          letter-spacing: 1px;
          pointer-events: none;
          z-index: 10;
        }
      }
    }

    .battle-message {
      display: none;
    }

    .battle-dialog {
      width: calc(100% - 40px);
      max-width: 700px;
      margin: 18px 20px;
      padding: 5px 0 0;

      min-height: 70px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      position: relative; // for the more indicator

      // Override primary color to theme all inner Ionic components (like ion-button)
      // using clear background and RPG yellow text
      --ion-color-primary: transparent;
      --ion-color-primary-rgb: var(--ion-color-rpg-rgb);
      --ion-color-primary-contrast: var(--ion-color-rpg);
      --ion-color-primary-shade: transparent;
      --ion-color-primary-tint: rgba(255, 255, 255, 0.1);

      // Earthbound RPG Box styling
      border-radius: 1px;
      box-shadow:
        0 0 0 5px #383050, // medium purple
        0 0 0 10px #68d0b8, // minty blue
        0 0 0 12px #f7e8a8, // pale yellow
        0 0 0 16px #3d3c55; // slate
      background-color: #280828; // dark purple
      color: var(--ion-color-rpg); // rpg yellow text

      .dialog-content {
        font-family: inherit;
        font-size: 1.2rem;
        line-height: 1.4;
      }

      .dialog-more-indicator {
        position: absolute;
        bottom: 5px;
        right: 15px;
        font-size: 20px;
        animation: bounce 0.5s infinite alternate;
        color: var(--ion-color-rpg);
      }
    }

    .dev-controls {
      position: absolute;
      top: 10px;
      right: 10px;
      z-index: 20;
    }

    // Screen shake animation for player hit
    &.screen-shake {
      animation: screen-shake 0.5s cubic-bezier(.36, .07, .19, .97) both;
    }
  }
}

// Animations
@keyframes enemy-appear {
  0% {
    opacity: 0;
    transform: translateY(-20px);
  }

  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes enemy-damaged {
  0% {
    transform: translateX(0);
    filter: brightness(1);
  }

  33% {
    transform: translateX(-10px);
    filter: brightness(2) sepia(1) hue-rotate(-50deg);
  }

  66% {
    transform: translateX(10px);
    filter: brightness(2) sepia(1) hue-rotate(-50deg);
  }

  100% {
    transform: translateX(0);
    filter: brightness(1);
  }
}

@keyframes enemy-fadeout {
  0% {
    opacity: 1;
  }

  100% {
    opacity: 0;
    transform: translateY(-20px);
  }
}

@keyframes victory-strobe {
  0% {
    filter: brightness(1);
    transform: scale(1);
  }

  100% {
    filter: brightness(2);
    transform: scale(1.1);
  }
}

@keyframes victory-fadeout {
  0% {
    opacity: 1;
    filter: brightness(2);
    transform: scale(1.1);
  }

  100% {
    opacity: 0;
    filter: brightness(0);
    transform: scale(0.5);
  }
}

@keyframes message-pulse {
  0% {
    transform: translate(-50%, -50%) scale(1);
  }

  100% {
    transform: translate(-50%, -50%) scale(1.05);
  }
}

@keyframes bounce {
  0% {
    transform: translateY(0);
  }

  100% {
    transform: translateY(-5px);
  }
}

@keyframes screen-shake {

  0%,
  100% {
    transform: translateX(0);
  }

  20%,
  60% {
    transform: translateX(-5px);
  }

  40%,
  80% {
    transform: translateX(5px);
  }
}

@keyframes timer-pulse {
  0% {
    filter: brightness(1);
  }

  100% {
    filter: brightness(1.5);
  }
}
</style>

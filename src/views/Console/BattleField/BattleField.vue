<template>
  <ion-page ref="page" class="battlefield">
    <!-- Canvas background for battle scene -->
    <canvas ref="battleBackground" class="battle-bg"></canvas>

    <!-- Battle UI container -->
    <div class="battle-ui-container">
      <!-- Enemy display section -->
      <div class="enemy-container">
        <div class="enemy-stats" v-if="currentEnemy && showEnemyInfo">
          <div class="enemy-name">{{ currentEnemy.name }}</div>
          <div class="enemy-health-bar">
            <div
              class="enemy-health"
              :style="{
                width: `${
                  (currentEnemy.health / currentEnemy.maxHealth) * 100
                }%`,
                backgroundColor: enemyHealthColor,
              }"
            ></div>
          </div>
          <div class="enemy-health-text">
            {{ currentEnemy.health }} / {{ currentEnemy.maxHealth }}
          </div>
        </div>
        
        <div class="enemy-sprite-container" :class="enemyAnimationClass">
          <img
            v-if="currentEnemy && currentEnemy.avatar"
            :src="getAvatar(currentEnemy.avatar)"
            class="enemy-sprite"
            alt="Enemy"
          />
          <div v-else-if="currentEnemy && currentEnemy.emoji" class="enemy-emoji">
            {{ currentEnemy.emoji }}
          </div>
          <div v-else class="enemy-placeholder">?</div>
        </div>
        
        <!-- Battle message overlay -->
        <div v-if="battleMessage" class="battle-message">
          {{ battleMessage }}
        </div>
      </div>

      <!-- Player HUD component -->
      <XpHpMpHud />
      
      <!-- Battle dialog box -->
      <div v-if="battleDialogText" class="battle-dialog" @click="advanceBattleDialog">
        <XpTypingText
          ref="battleDialogText"
          :text="battleDialogText"
          :is-victory="isVictoryMessage"
          @typing-complete="onBattleDialogComplete"
        />
        <div v-if="hasMoreBattleDialog" class="dialog-more-indicator">▼</div>
      </div>
      
      <!-- Battle actions FAB -->
      <XpFabBattleActions
        v-if="isPlayerTurn && !battleDialogText"
        @action="handleBattleAction"
        :get-icon="getBattleActionIcon"
        :get-color="getBattleActionColor"
      />
      
      <!-- Dev Tools FAB - only visible in dev mode -->
      <DevToolsFab 
        v-if="devMode" 
        @open-profile-selector="openProfileSelector"
        @open-beast-selector="openBeastSelector"
        @open-controls-modal="openControlsModal"
      />
      
      <!-- Dev Battle Actions FAB - only visible in dev mode -->
      <DevBattleActionsFab
        v-if="devMode"
        @attack-animation="triggerAttackAnimation"
        @enemy-hit="triggerEnemyHit"
        @player-hit="triggerPlayerHit"
        @victory-animation="triggerVictoryAnimation"
        @defeat-animation="triggerDefeatAnimation"
        @reset-battle="resetBattle"
      />
      
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
      
      <!-- Rewards Modal -->
      <ion-modal :is-open="showRewardsModal" class="rewards-modal">
        <ion-header>
          <ion-toolbar>
            <ion-title>Victory!</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="closeRewardsModal">
                <ion-icon :icon="closeCircle"></ion-icon>
              </ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        
        <ion-content class="ion-padding">
          <div class="rewards-container" v-if="completedTask">
            <h2>{{ completedTask.name }} Defeated!</h2>
            
            <div class="reward-item">
              <ion-icon :icon="medalOutline" class="reward-icon"></ion-icon>
              <div class="reward-text">{{ completedTask.xpReward }} XP</div>
            </div>
            
            <div class="reward-item">
              <ion-icon :icon="cashOutline" class="reward-icon"></ion-icon>
              <div class="reward-text">{{ completedTask.gpReward }} GP</div>
            </div>
            
            <div class="reward-item" v-if="completedTask.itemReward">
              <ion-icon :icon="giftOutline" class="reward-icon"></ion-icon>
              <div class="reward-text">{{ completedTask.itemReward }}</div>
            </div>
            
            <ion-button expand="block" @click="closeRewardsModal">
              Continue
            </ion-button>
          </div>
        </ion-content>
      </ion-modal>
    </div>
  </ion-page>
</template>

<script src="./BattleField.ts"></script>

<style lang="scss" scoped>
.battlefield {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  
  .battle-bg {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    z-index: 0;
  }
  
  .battle-ui-container {
    position: relative;
    z-index: 1;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 10px;
  }
  
  .enemy-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-top: 40px;
    position: relative;
    
    .enemy-stats {
      background-color: rgba(0, 0, 0, 0.7);
      border-radius: 10px;
      padding: 5px 10px;
      margin-bottom: 10px;
      width: 80%;
      max-width: 300px;
      
      .enemy-name {
        font-weight: bold;
        margin-bottom: 5px;
      }
      
      .enemy-health-bar {
        height: 10px;
        background-color: #333;
        border-radius: 5px;
        overflow: hidden;
        
        .enemy-health {
          height: 100%;
          transition: width 0.3s, background-color 0.3s;
        }
      }
      
      .enemy-health-text {
        font-size: 0.8rem;
        text-align: right;
        margin-top: 2px;
      }
    }
    
    .enemy-sprite-container {
      width: 150px;
      height: 150px;
      display: flex;
      justify-content: center;
      align-items: center;
      
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
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
      }
      
      .enemy-emoji {
        font-size: 80px;
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
  }
  
  .battle-message {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background-color: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 10px 20px;
    border-radius: 5px;
    font-size: 1.5rem;
    font-weight: bold;
    text-align: center;
    z-index: 10;
    animation: message-pulse 1s infinite alternate;
  }
  
  .battle-dialog {
    position: absolute;
    bottom: 100px;
    left: 10px;
    right: 10px;
    background-color: rgba(0, 0, 0, 0.8);
    border: 2px solid #666;
    border-radius: 10px;
    padding: 15px;
    min-height: 80px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    z-index: 10;
    
    .dialog-more-indicator {
      position: absolute;
      bottom: 5px;
      right: 15px;
      font-size: 20px;
      animation: bounce 0.5s infinite alternate;
    }
  }
  
  .dev-controls {
    position: absolute;
    top: 10px;
    right: 10px;
    z-index: 20;
  }
  
  .rewards-modal {
    --border-radius: 10px;
    --width: 90%;
    --max-width: 400px;
    
    .rewards-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 20px 0;
      
      h2 {
        margin-bottom: 20px;
        text-align: center;
      }
      
      .reward-item {
        display: flex;
        align-items: center;
        margin-bottom: 15px;
        
        .reward-icon {
          font-size: 24px;
          margin-right: 10px;
        }
        
        .reward-text {
          font-size: 18px;
          font-weight: bold;
        }
      }
    }
  }
  
  // Screen shake animation for player hit
  &.screen-shake {
    animation: screen-shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
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
  0%, 100% {
    transform: translateX(0);
  }
  20%, 60% {
    transform: translateX(-5px);
  }
  40%, 80% {
    transform: translateX(5px);
  }
}
</style>

<template>
  <ion-page ref="page">
    <canvas ref="battleBackground" class="battle-bg"></canvas>
    
    <ion-content class="battle-bg">
      <!-- Battle Grid for party members and enemies -->
      <div class="battle-grid" :class="{ earthbound: $fx.theme.rpg == 'earthbound' }">
        <!-- Party Section -->
        <section class="party">
          <ion-chip
            v-if="user && user.name"
            :color="$fx.theme.color"
            @click="clickUserChip(user)"
          >
            <ion-avatar v-if="user && user.avatar">
              <ion-img :src="getUserAvatar(user)" alt=""></ion-img>
            </ion-avatar>
            <ion-label>{{ user.name.nick || user.name.full }}</ion-label>
          </ion-chip>
        </section>

        <!-- Enemy Section -->
        <section class="enemy-container" v-if="battleEngine.currentEnemy">
          <div 
            class="enemy-sprite" 
            :class="[battleEngine.state.enemyAnimationClass]"
          >
            <ion-avatar v-if="battleEngine.currentEnemy.avatar" class="beast-avatar-battle">
              <ion-img :src="getAvatar(battleEngine.currentEnemy.avatar)" alt="Enemy"></ion-img>
            </ion-avatar>
            <div v-else :class="['enemy-placeholder', { 'boss': battleEngine.currentEnemy.isBoss }]">
              {{ battleEngine.currentEnemy.emoji || '👾' }}
            </div>
            
            <!-- Defense Shield Effect -->
            <div class="defense-shield" v-if="battleEngine.state.isDefending">
              <div class="shield-effect"></div>
            </div>
          </div>
          
          <div class="enemy-info" v-if="showEnemyInfo && battleEngine.currentEnemy">
            <h3 class="enemy-name">{{ battleEngine.currentEnemy.name }}</h3>
            <div class="enemy-health-bar">
              <div class="health-label">
                HP: {{ battleEngine.currentEnemy.health }} / {{ battleEngine.currentEnemy.maxHealth }}
              </div>
              <div class="health-bar-container">
                <div 
                  class="health-bar" 
                  :style="{
                    width: `${(battleEngine.currentEnemy.health / battleEngine.currentEnemy.maxHealth) * 100}%`,
                    backgroundColor: battleEngine.enemyHealthColor
                  }"
                ></div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <!-- Battle Messages -->
      <div class="battle-message" v-if="battleEngine.state.battleMessage">
        {{ battleEngine.state.battleMessage }}
      </div>

      <!-- Player HUD -->
      <XpHpMpHud :userId="userId" class="player-hud" />
    </ion-content>
    
    <!-- Battle Dialog Box -->
    <div class="battle-dialog-overlay" v-if="battleEngine.battleDialog.showDialog" @click="battleEngine.battleDialog.advanceDialog">
      <div class="battle-dialog-box rpg-box">
        <div class="dialog-content">
          <XpTypingText
            ref="battleDialogText"
            :text="battleEngine.battleDialog.dialogText"
            :speed="25"
            :auto-start="true"
            :sound-theme="$fx?.theme?.rpg"
            sound-type="text"
            @typing-complete="battleEngine.battleDialog.onDialogComplete"
            class="battle-text"
            :class="{'victory-text': battleEngine.battleDialog.isVictoryMessage}"
            :has-more-text="battleEngine.battleDialog.hasMoreDialog"
          />
        </div>
        <div v-if="battleEngine.battleDialog.hasMoreDialog" class="dialog-indicator">
          <i class="fad fa-chevron-down blink"></i>
        </div>
      </div>
    </div>
    
    <!-- Battle Actions Floating Action Button -->
    <XpFabBattleActions 
      v-if="battleEngine.state.isPlayerTurn && !battleEngine.battleDialog.showDialog" 
      @select-action="handleBattleAction" 
    />
    
    <!-- Rewards Modal -->
    <ion-modal 
      :is-open="showRewardsModal" 
      @didDismiss="closeRewardsModal" 
      class="rewards-modal"
    >
      <ion-header>
        <ion-toolbar>
          <ion-title>Victory Rewards</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="closeRewardsModal">
              <ion-icon :icon="closeCircle" slot="icon-only"></ion-icon>
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      
      <ion-content>
        <div class="rewards-container">
          <h2>{{ completedTask?.name || 'Enemy' }} Defeated!</h2>
          
          <div class="rewards-list">
            <div class="reward-item">
              <ion-icon :icon="medalOutline"></ion-icon>
              <span>{{ completedTask?.xpReward || 50 }} XP</span>
            </div>
            <div class="reward-item">
              <ion-icon :icon="cashOutline"></ion-icon>
              <span>{{ completedTask?.gpReward || 10 }} GP</span>
            </div>
            <div v-if="completedTask?.itemReward" class="reward-item">
              <ion-icon :icon="giftOutline"></ion-icon>
              <span>{{ completedTask.itemReward }}</span>
            </div>
          </div>
          
          <ion-button expand="block" @click="closeRewardsModal">
            Continue
          </ion-button>
        </div>
      </ion-content>
    </ion-modal>
  </ion-page>
</template>

<script src="./BattleField.ts"></script>
<style lang="scss" src="./_BattleField.scss"></style>

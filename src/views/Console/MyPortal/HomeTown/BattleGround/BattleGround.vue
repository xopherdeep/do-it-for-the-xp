<template>
  <ion-page ref="page">
    <ion-header :translucent="true" v-if="user"> </ion-header>
    <ion-content :fullscreen="false">
      <canvas class="battle-bg" ref="battleBackground"/>
      
      <!-- Task Enemy Display -->
      <div class="enemy-container" v-if="currentEnemy">
        <div class="enemy-sprite" :class="[currentEnemy.type, enemyAnimationClass]">
          <!-- Enemy sprite would be here - for now using a placeholder -->
          <div class="enemy-placeholder" :class="currentEnemy.type">
            {{ currentEnemy.emoji }}
          </div>
        </div>
        <div class="enemy-info">
          <h3 class="enemy-name">{{ currentEnemy.name }}</h3>
          <div class="enemy-health-bar">
            <div class="health-label">HP: {{ currentEnemy.health }} / {{ currentEnemy.maxHealth }}</div>
            <div class="health-bar-container">
              <div class="health-bar" :style="{ width: `${(currentEnemy.health / currentEnemy.maxHealth) * 100}%`, backgroundColor: enemyHealthColor }"></div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Battle Actions FAB - new dynamic component -->
      <XpFabBattleActions 
        v-if="user"
        :user="user"
        :actions="userActions"
        isBattleFabOn="true"
        @battle-action="handleBattleAction"
      />
      
      <!-- Battle Message Display -->
      <div class="battle-message" v-if="battleMessage">
        {{ battleMessage }}
      </div>
      
      <ion-grid class="battle-grid" :class="$fx.theme.rpg">
        <ion-row>
          <ion-col class="tasks">
            <ion-avatar button v-for="task in xp_achievement" :key="task.id" @click="clickTask(task)">
              <ion-img v-bind="getImgObj(task.featured_media)"></ion-img>

              <MyTask @didDismiss="activeModal = 0" :item="task" :userId="user.id" v-if="activeModal == task.id" />
            </ion-avatar>
          </ion-col>
          <ion-col size="5" class="party">
            <ion-avatar v-for="member in users" :key="member.id">
              <ion-img :src="$getUserAvatar(member)" />
            </ion-avatar>
          </ion-col>
        </ion-row>
      </ion-grid>
      
      <!-- Task Completion Rewards Modal -->
      <ion-modal :is-open="showRewardsModal" class="rewards-modal">
        <ion-header>
          <ion-toolbar>
            <ion-title>Quest Complete!</ion-title>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
          <div class="rewards-container">
            <h2>You defeated {{ completedTask?.name }}</h2>
            <div class="rewards-list">
              <div class="reward-item">
                <ion-icon :icon="medalOutline"></ion-icon>
                <span>{{ completedTask?.xpReward }} XP</span>
              </div>
              <div class="reward-item">
                <ion-icon :icon="cashOutline"></ion-icon>
                <span>{{ completedTask?.gpReward }} GP</span>
              </div>
              <div v-if="completedTask?.itemReward" class="reward-item">
                <ion-icon :icon="giftOutline"></ion-icon>
                <span>{{ completedTask?.itemReward }}</span>
              </div>
            </div>
            <ion-button expand="block" @click="closeRewardsModal">
              Claim Rewards
            </ion-button>
          </div>
        </ion-content>
      </ion-modal>
    </ion-content>
    <ion-footer class="text-center">
      <XpHpMpHud v-if="user" :user="user" />
    </ion-footer>
  </ion-page>
</template>

<style src="./_BattleGround.scss" lang="scss" />
<script src="./BattleGround" />

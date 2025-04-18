<template>
  <ion-card class="user-stats" v-if="user">
    <ion-card-header>
      <ion-card-title class="flex items-center justify-between">
        <span>{{ user.name.full }}</span>
        <div class="flex items-center gap-2">
          <xp-icon 
            icon="shield" 
            primary="gold" 
            secondary="blue" 
            size="2x"
          />
          {{ user.jobClass }}
        </div>
      </ion-card-title>
    </ion-card-header>

    <ion-card-content>
      <ion-grid>
        <!-- Stats Section -->
        <ion-row>
          <!-- HP Bar -->
          <ion-col size="12">
            <div class="stat-bar">
              <div class="stat-icon">
                <xp-icon 
                  icon="heart-circle" 
                  primary="red" 
                  secondary="darkred"
                  size="lg"
                />
              </div>
              <div class="stat-content">
                <ion-progress-bar 
                  color="danger"
                  :value="user.stats.hp.current / user.stats.hp.max"
                ></ion-progress-bar>
                <div class="stat-text">
                  <span>HP</span>
                  <span>{{ user.stats.hp.current }}/{{ user.stats.hp.max }}</span>
                </div>
              </div>
            </div>
          </ion-col>

          <!-- MP Bar -->
          <ion-col size="12">
            <div class="stat-bar">
              <div class="stat-icon">
                <xp-icon 
                  icon="hat-wizard" 
                  primary="blue" 
                  secondary="purple"
                  size="lg"
                />
              </div>
              <div class="stat-content">
                <ion-progress-bar 
                  color="tertiary"
                  :value="user.stats.mp.current / user.stats.mp.max"
                ></ion-progress-bar>
                <div class="stat-text">
                  <span>MP</span>
                  <span>{{ user.stats.mp.current }}/{{ user.stats.mp.max }}</span>
                </div>
              </div>
            </div>
          </ion-col>

          <!-- XP Bar -->
          <ion-col size="12">
            <div class="stat-bar">
              <div class="stat-icon">
                <xp-icon 
                  icon="sparkles" 
                  primary="yellow" 
                  secondary="gold"
                  size="lg"
                />
              </div>
              <div class="stat-content">
                <ion-progress-bar 
                  color="warning"
                  :value="user.stats.xp.current / user.stats.xp.max"
                ></ion-progress-bar>
                <div class="stat-text">
                  <span>XP</span>
                  <span>Level {{ user.stats.level }} - {{ user.stats.xp.current }}/{{ user.stats.xp.max }}</span>
                </div>
              </div>
            </div>
          </ion-col>

          <!-- GP Display -->
          <ion-col size="12">
            <div class="stat-bar">
              <div class="stat-icon">
                <xp-icon 
                  icon="coins" 
                  primary="gold" 
                  secondary="bronze"
                  size="lg"
                />
              </div>
              <div class="stat-content">
                <ion-progress-bar 
                  color="success"
                  :value="user.stats.gp.wallet / user.stats.gp.limit"
                ></ion-progress-bar>
                <div class="stat-text">
                  <span>GP</span>
                  <span>{{ user.stats.gp.wallet }}/{{ user.stats.gp.limit }}</span>
                </div>
              </div>
            </div>
          </ion-col>
        </ion-row>

        <!-- Action Buttons -->
        <ion-row class="action-buttons" v-if="!hideMenu">
          <ion-col size="6">
            <ion-button expand="block" color="success" @click="$emit('action', 'quest')">
              <xp-icon icon="scroll-old" primary="green" secondary="brown" />
              Quest
            </ion-button>
          </ion-col>
          <ion-col size="6">
            <ion-button expand="block" color="tertiary" @click="$emit('action', 'abilities')">
              <xp-icon icon="book-spells" primary="purple" secondary="blue" />
              Abilities
            </ion-button>
          </ion-col>
          <ion-col size="6">
            <ion-button expand="block" color="warning" @click="$emit('action', 'inventory')">
              <xp-icon icon="backpack" primary="brown" secondary="gold" />
              Items
            </ion-button>
          </ion-col>
          <ion-col size="6">
            <ion-button expand="block" color="primary" @click="$emit('action', 'wallet')">
              <xp-icon icon="wallet" primary="black" secondary="gray" />
              Wallet
            </ion-button>
          </ion-col>
        </ion-row>
      </ion-grid>
    </ion-card-content>
  </ion-card>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import XpIcon from '@/components/XpIcon';

export default defineComponent({
  name: 'card-user-stats',
  components: {
    XpIcon
  },
  props: {
    user: {
      type: Object,
      required: true
    },
    hideMenu: {
      type: Boolean,
      default: false
    }
  }
});
</script>

<style lang="scss" scoped>
.user-stats {
  --padding-top: 1rem;
  --padding-bottom: 1rem;
}

.stat-bar {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;

  .stat-icon {
    flex-shrink: 0;
    width: 40px;
    display: flex;
    justify-content: center;
  }

  .stat-content {
    flex-grow: 1;

    ion-progress-bar {
      margin-bottom: 4px;
      border-radius: 4px;
      height: 8px;
      --buffer-background: rgba(var(--ion-color-light-rgb), 0.3);
    }

    .stat-text {
      display: flex;
      justify-content: space-between;
      font-size: 0.9em;
      color: var(--ion-color-medium);

      span:last-child {
        font-weight: 600;
        color: var(--ion-color-dark);
      }
    }
  }
}

.action-buttons {
  margin-top: 1rem;

  ion-button {
    --padding-start: 0.5rem;
    --padding-end: 0.5rem;

    xp-icon {
      margin-right: 0.5rem;
    }
  }
}</style>

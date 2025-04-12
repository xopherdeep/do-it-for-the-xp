<template>
  <ion-page :class="$options.name">
    <ion-header :translucent="true">
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <ion-back-button default-href="/xp-settings"></ion-back-button>
        </ion-buttons>
        <ion-title>Reward Settings</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="rpg-box">
      <ion-card>
        <ion-list>
          <!-- Cash-Out S'mores Toggle -->
          <ion-item>
            <ion-label>
              <h2>Cash-Out S'mores</h2>
              <p>Enable this option to allow cashing out S'mores</p>
            </ion-label>
            <ion-toggle v-model="settings.enableCashOut"></ion-toggle>
          </ion-item>

          <!-- Kids Section -->
          <ion-item v-if="settings.enableCashOut">
            <ion-label>
              <h3>Kids</h3>
              <p>Visible only for selected kids</p>
            </ion-label>
          </ion-item>
          <ion-item v-if="settings.enableCashOut" lines="none">
            <div class="avatar-group">
              <div v-for="user in kidUsers" :key="user.id" class="avatar-wrapper">
                <ion-avatar @click="toggleKidCashout(user.id)">
                  <img :src="appConfig.$getUserAvatar(user)" :alt="user.name.full">
                  <i class="fad fa-check-circle status-icon" v-if="settings.cashoutKids[user.id]"></i>
                </ion-avatar>
                <span class="avatar-name">{{ user.name.nick }}</span>
              </div>
            </div>
          </ion-item>

          <!-- Conversion Rate Section -->
          <ion-item v-if="settings.enableCashOut">
            <ion-label>
              <h3>Conversion Rate for 1 local currency</h3>
              <p>Conversion rate for S'mores to Cash</p>
            </ion-label>
          </ion-item>
          <ion-item v-if="settings.enableCashOut" lines="none">
            <div class="coin-grid">
              <div class="coin-option custom" @click="selectRate('custom')">
                <div class="coin-circle">
                  <i class="fad fa-plus"></i>
                </div>
                <span>Custom</span>
              </div>
              <div 
                v-for="rate in [1, 10, 50, 100]" 
                :key="rate"
                class="coin-option"
                :class="{ active: settings.conversionRate === rate }"
                @click="selectRate(rate)"
              >
                <div class="coin-circle">
                  <span>{{ rate }}</span>
                </div>
              </div>
            </div>
          </ion-item>

          <!-- Reward Approval Toggle -->
          <ion-item>
            <ion-label>
              <h2>Reward Approval</h2>
              <p>Parents approve the rewards that is redeemed by the kids</p>
            </ion-label>
            <ion-toggle v-model="settings.requireApproval"></ion-toggle>
          </ion-item>
        </ion-list>
      </ion-card>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from 'vue'
import { useStore } from 'vuex'
import { 
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonList, IonItem, IonLabel, IonToggle, IonCard,
  IonBackButton, IonButtons, IonAvatar
} from '@ionic/vue'
import appConfig from '@/app.config'
import ionic from "@/mixins/ionic"

export default defineComponent({
  name: 'RewardSettings',
  components: {
    IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
    IonList, IonItem, IonLabel, IonToggle, IonCard,
    IonBackButton, IonButtons, IonAvatar
  },
  mixins: [ionic],
  setup() {
    const store = useStore()
    const settings = ref({
      enableCashOut: true,
      requireApproval: true,
      conversionRate: 10,
      cashoutKids: {} as Record<string, boolean>
    })

    // Get all users sorted A-Z from Vuex store
    const users = computed(() => store.getters.usersAz)
    
    // Filter for kid users
    const kidUsers = computed(() => users.value.filter(u => !u.isAdult))

    // Initialize cashoutKids with default values (all true)
    kidUsers.value.forEach(kid => {
      settings.value.cashoutKids[kid.id] = true
    })

    const toggleKidCashout = (kidId: string) => {
      settings.value.cashoutKids[kidId] = !settings.value.cashoutKids[kidId]
    }

    const selectRate = (rate: number | 'custom') => {
      if (rate === 'custom') {
        // TODO: Show custom rate input dialog
        return
      }
      settings.value.conversionRate = rate
    }

    return {
      settings,
      kidUsers,
      toggleKidCashout,
      selectRate,
      appConfig
    }
  }
})
</script>

<style lang="scss" scoped>
.avatar-group {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  padding: 0.5rem;

  .avatar-wrapper {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    cursor: pointer;
  }

  ion-avatar {
    width: 60px;
    height: 60px;
    position: relative;
    
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 50%;
      aspect-ratio: 1;
    }

    .status-icon {
      position: absolute;
      bottom: -5px;
      right: -5px;
      font-size: 1.2rem;
      color: var(--ion-color-success);
      background: var(--ion-background-color);
      border-radius: 50%;
    }
  }

  .avatar-name {
    font-size: 0.8rem;
    margin-top: 0.25rem;
    text-align: center;
  }
}

.coin-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
  gap: 1rem;
  padding: 1rem;
  width: 100%;

  .coin-option {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;

    &.active .coin-circle {
      background: var(--ion-color-success);
      color: white;
    }

    .coin-circle {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: var(--ion-color-light);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.2rem;
      font-weight: bold;
      transition: all 0.2s ease;

      &:hover {
        transform: scale(1.05);
      }
    }

    &.custom .coin-circle {
      background: var(--ion-color-medium);
      color: white;
    }

    span {
      font-size: 0.9rem;
      color: var(--ion-color-medium);
    }
  }
}
</style>
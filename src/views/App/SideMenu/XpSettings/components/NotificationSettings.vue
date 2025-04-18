<template>
  <ion-page :class="$options.name">
    <ion-header :translucent="true">
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <ion-back-button default-href="/xp-settings"></ion-back-button>
        </ion-buttons>
        <ion-title>Notifications Settings</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content
      :fullscreen="true"
      class="rpg-box bg-slide"
    >
      <ion-card class="max-w-2xl">
        <ion-list>
          <!-- Chore Due Notifications -->
          <ion-item>
            <ion-label>
              <h2>When a Kid's chore is due, remind parents</h2>
              <p>Enable this option if you share device with kids</p>
            </ion-label>
            <ion-toggle v-model="settings.notifyParentsOnDue"></ion-toggle>
          </ion-item>

          <ion-item v-if="settings.notifyParentsOnDue">
            <ion-label>Parents to notify:</ion-label>
          </ion-item>
          <ion-item
            v-if="settings.notifyParentsOnDue"
            lines="none"
          >
            <div class="avatar-group">
              <ion-avatar
                v-for="user in adultUsers"
                :key="user.id"
              >
                <img
                  :src="appConfig.$getUserAvatar(user)"
                  :alt="user.name.full"
                >
                <span class="avatar-name">{{ user.name.nick }}</span>
              </ion-avatar>
            </div>
          </ion-item>

          <!-- Chore Complete Notifications -->
          <ion-item>
            <ion-label>
              <h2>When a chore is complete, notify</h2>
              <p>Enable this option if you share device with kids</p>
            </ion-label>
            <ion-toggle v-model="settings.notifyOnComplete"></ion-toggle>
          </ion-item>

          <!-- Parents Section -->
          <ion-item v-if="settings.notifyOnComplete">
            <ion-label>
              <h3>Notify Parents</h3>
              <p>A reminder will be sent to parents</p>
            </ion-label>
          </ion-item>
          <ion-item
            v-if="settings.notifyOnComplete"
            lines="none"
          >
            <div class="avatar-group">
              <ion-avatar
                v-for="user in adultUsers"
                :key="user.id"
              >
                <img
                  :src="appConfig.$getUserAvatar(user)"
                  :alt="user.name.full"
                >
                <span class="avatar-name">{{ user.name.nick }}</span>
              </ion-avatar>
            </div>
          </ion-item>

          <!-- Kids Section -->
          <ion-item v-if="settings.notifyOnComplete">
            <ion-label>
              <h3>Notify Kids</h3>
              <p>By default, no kids will be notified</p>
            </ion-label>
          </ion-item>
          <ion-item
            v-if="settings.notifyOnComplete"
            lines="none"
          >
            <div class="avatar-group">
              <ion-avatar
                v-for="user in kidUsers"
                :key="user.id"
              >
                <img
                  :src="appConfig.$getUserAvatar(user)"
                  :alt="user.name.full"
                >
                <span class="avatar-name">{{ user.name.nick }}</span>
                <i
                  :class="notifiedKids[user.id] ? 'fad fa-check-circle' : 'fad fa-circle'"
                  class="notification-status"
                  @click="toggleKidNotification(user.id)"
                ></i>
              </ion-avatar>
            </div>
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
  name: 'NotificationSettings',
  components: {
    IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
    IonList, IonItem, IonLabel, IonToggle, IonCard,
    IonBackButton, IonButtons, IonAvatar
  },
  mixins: [ionic],
  setup() {
    const store = useStore()
    const settings = ref({
      notifyParentsOnDue: true,
      notifyOnComplete: true
    })

    const notifiedKids = ref({})

    // Get all users sorted A-Z from Vuex store
    const users = computed(() => store.getters.usersAz)

    // Filter for adult users
    const adultUsers = computed(() => users.value.filter(u => u.isAdult))

    // Filter for kid users
    const kidUsers = computed(() => users.value.filter(u => !u.isAdult))

    // Initialize notifiedKids with default values
    kidUsers.value.forEach(kid => {
      notifiedKids.value[kid.id] = true
    })

    const toggleKidNotification = (kidId: string) => {
      notifiedKids.value[kidId] = !notifiedKids.value[kidId]
    }

    return {
      settings,
      adultUsers,
      kidUsers,
      notifiedKids,
      toggleKidNotification,
      appConfig
    }
  }
})
</script>

<style lang="scss" scoped>
.avatar-group {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  padding: 0.5rem;

  ion-avatar {
    width: 60px;
    height: 60px;
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 50%;
      aspect-ratio: 1;
    }

    .avatar-name {
      font-size: 0.8rem;
      margin-top: 0.25rem;
      text-align: center;
    }

    .notification-status {
      position: absolute;
      bottom: 20px;
      right: -5px;
      font-size: 1.2rem;
      background: var(--ion-background-color);
      border-radius: 50%;
      cursor: pointer;
    }
  }
}
</style>
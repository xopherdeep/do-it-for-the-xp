<template>
  <ion-page :class="[$options.name, 'xp-settings-page']">
    <ion-header :translucent="true">
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <xp-back-button></xp-back-button>
        </ion-buttons>
        <ion-title>Notifications Settings</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="rpg-box bg-slide ion-padding">
      <ion-card class="max-w-2xl">
        <ion-list>
          <!-- Ambush Alerts -->
          <ion-item>
            <ion-label>
              <h2>Ambush alerts on this device</h2>
              <p>{{ ambushAlertsMessage }}</p>
            </ion-label>
            <ion-toggle
              v-model="ambushAlerts"
              :disabled="ambushAlertsDisabled"
              @ionChange="handleAmbushAlertsChange"
            ></ion-toggle>
          </ion-item>

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
          <ion-item v-if="settings.notifyParentsOnDue" lines="none">
            <div class="avatar-group">
              <ion-avatar v-for="user in adultUsers" :key="user.id">
                <img
                  :src="appConfig.$getUserAvatar(user)"
                  :alt="user.name.full"
                />
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
          <ion-item v-if="settings.notifyOnComplete" lines="none">
            <div class="avatar-group">
              <ion-avatar v-for="user in adultUsers" :key="user.id">
                <img
                  :src="appConfig.$getUserAvatar(user)"
                  :alt="user.name.full"
                />
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
          <ion-item v-if="settings.notifyOnComplete" lines="none">
            <div class="avatar-group">
              <ion-avatar v-for="user in kidUsers" :key="user.id">
                <img
                  :src="appConfig.$getUserAvatar(user)"
                  :alt="user.name.full"
                />
                <span class="avatar-name">{{ user.name.nick }}</span>
                <i
                  :class="
                    notifiedKids[user.id]
                      ? 'fad fa-check-circle'
                      : 'fad fa-circle'
                  "
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
  import { defineComponent, ref, computed, onMounted } from "vue";
  import { useUserStore } from "@/lib/store/stores/user";
  import {
    IonPage,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonToggle,
    IonCard,
    IonButtons,
    IonAvatar,
    toastController,
  } from "@ionic/vue";
  import appConfig from "@/app.config";
  import ionic from "@/lib/mixins/ionic";
  import {
    alertPermission,
    requestAlertPermission,
    battleAlertsChoice,
    setBattleAlertsChoice,
  } from "@/lib/services/notifications/alertBridge";

  export default defineComponent({
    name: "NotificationSettings",
    components: {
      IonPage,
      IonHeader,
      IonToolbar,
      IonTitle,
      IonContent,
      IonList,
      IonItem,
      IonLabel,
      IonToggle,
      IonCard,
      IonButtons,
      IonAvatar,
    },
    mixins: [ionic],
    setup() {
      const userStore = useUserStore();
      const settings = ref({
        notifyParentsOnDue: true,
        notifyOnComplete: true,
      });

      const notifiedKids = ref({});
      const ambushAlerts = ref(battleAlertsChoice() === "on");
      const ambushAlertsDisabled = ref(false);
      const ambushAlertsMessage = ref(
        "A heads-up when a beast ambushes your hero while the game is in the background."
      );

      // Get all users sorted A-Z from Pinia store
      const users = computed(() => userStore.usersAz);

      // Filter for adult users
      const adultUsers = computed(() => users.value.filter((u) => u.isAdult));

      // Filter for kid users
      const kidUsers = computed(() => users.value.filter((u) => !u.isAdult));

      // Initialize notifiedKids with default values
      kidUsers.value.forEach((kid) => {
        notifiedKids.value[kid.id] = true;
      });

      const toggleKidNotification = (kidId: string) => {
        notifiedKids.value[kidId] = !notifiedKids.value[kidId];
      };

      onMounted(async () => {
        const perm = await alertPermission();
        if (perm === "unsupported") {
          ambushAlertsDisabled.value = true;
          ambushAlertsMessage.value = "This browser can't show alerts.";
        } else if (perm !== "granted") {
          // Alerts were turned off in the browser since the hero said yes
          ambushAlerts.value = false;
        }
      });

      const handleAmbushAlertsChange = async (event: any) => {
        const isOn = event.detail.checked;

        if (isOn) {
          const perm = await requestAlertPermission();
          if (perm === "granted") {
            setBattleAlertsChoice("on");
            ambushAlerts.value = true;
          } else {
            setBattleAlertsChoice("off");
            ambushAlerts.value = false;
            const toast = await toastController.create({
              message:
                "Your browser blocked alerts. Allow them in the site settings, then try again.",
              cssClass: "rpg-toast",
              position: "top",
              duration: 3000,
            });
            await toast.present();
          }
        } else {
          setBattleAlertsChoice("off");
        }
      };

      return {
        settings,
        adultUsers,
        kidUsers,
        notifiedKids,
        toggleKidNotification,
        appConfig,
        ambushAlerts,
        ambushAlertsDisabled,
        ambushAlertsMessage,
        handleAmbushAlertsChange,
      };
    },
  });
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

<template>
  <ion-page :class="[$options.name, 'xp-settings-page']">
    <ion-header :translucent="true">
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <xp-back-button></xp-back-button>
        </ion-buttons>
        <ion-title>Alerts</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="rpg-box bg-slide ion-padding">
      <ion-card class="max-w-2xl">
        <ion-list>
          <ion-item-group>
            <ion-item-divider>
              <ion-label>On this device</ion-label>
            </ion-item-divider>
            <ion-item lines="none">
              <ion-label>
                <h2>Ambush alerts</h2>
                <p>{{ ambushAlertsMessage }}</p>
              </ion-label>
              <ion-toggle
                v-model="ambushAlerts"
                :disabled="ambushAlertsDisabled"
                @ionChange="handleAmbushAlertsChange"
              ></ion-toggle>
            </ion-item>
            <ion-item lines="none">
              <ion-label>
                <h2>Chore reminders</h2>
                <p>A reminder on your phone half an hour before a chore is due, even when the game is closed.</p>
              </ion-label>
              <ion-toggle
                v-model="choreReminders"
                :disabled="ambushAlertsDisabled"
                @ionChange="handleChoreRemindersChange"
              ></ion-toggle>
            </ion-item>
            <approval-reminder-row />
          </ion-item-group>
        </ion-list>
      </ion-card>

      <xp-coming-soon-card title="For the family" :items="comingSoon" />
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
  import { defineComponent, ref, onMounted } from "vue";
  import {
    IonPage,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonList,
    IonItem,
    IonItemDivider,
    IonItemGroup,
    IonLabel,
    IonToggle,
    IonCard,
    IonButtons,
    toastController,
  } from "@ionic/vue";
  import ionic from "@/lib/mixins/ionic";
  import { rpgToastOptions } from "@/hooks/useToast";
  import ApprovalReminderRow from "./ApprovalReminderRow.vue";
  import XpComingSoonCard from "./XpComingSoonCard.vue";
  import { ALERTS_COMING_SOON } from "./comingSoon";
  import {
    alertPermission,
    requestAlertPermission,
    battleAlertsChoice,
    setBattleAlertsChoice,
  } from "@/lib/services/notifications/alertBridge";
  import { choreRemindersChoice, setChoreRemindersChoice } from "@/lib/services/notifications/reminderChoice";

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
      IonItemDivider,
      IonItemGroup,
      IonLabel,
      IonToggle,
      IonCard,
      IonButtons,
      XpComingSoonCard,
      ApprovalReminderRow,
    },
    mixins: [ionic],
    setup() {
      const ambushAlerts = ref(battleAlertsChoice() === "on");
      const choreReminders = ref(choreRemindersChoice() === "on");
      const ambushAlertsDisabled = ref(false);
      const ambushAlertsMessage = ref(
        "A heads-up when a beast ambushes your hero while the game is in the background."
      );

      onMounted(async () => {
        const perm = await alertPermission();
        const isUnsupported = perm === "unsupported";
        const isRevoked = perm !== "granted";
        if (isUnsupported) {
          ambushAlertsDisabled.value = true;
          ambushAlertsMessage.value = "This browser can't show alerts.";
        } else if (isRevoked) {
          // Alerts were turned off in the browser since the hero said yes
          ambushAlerts.value = false;
        }
      });

      const handleAmbushAlertsChange = async (event: any) => {
        const isOn = event.detail.checked;

        if (isOn) {
          const perm = await requestAlertPermission();
          const isGranted = perm === "granted";
          if (isGranted) {
            setBattleAlertsChoice("on");
            ambushAlerts.value = true;
          } else {
            setBattleAlertsChoice("off");
            ambushAlerts.value = false;
            const toast = await toastController.create(
              rpgToastOptions("Alerts are blocked. Allow notifications in the site or phone settings, then try again.", 3000)
            );
            await toast.present();
          }
        } else {
          setBattleAlertsChoice("off");
        }
      };

      const handleChoreRemindersChange = async (event: any) => {
        const isOn = event.detail.checked;
        if (!isOn) {
          setChoreRemindersChoice("off");
          return;
        }
        const perm = await requestAlertPermission();
        const isGranted = perm === "granted";
        if (isGranted) {
          setChoreRemindersChoice("on");
          return;
        }
        setChoreRemindersChoice("off");
        choreReminders.value = false;
        const toast = await toastController.create(
          rpgToastOptions("Alerts are blocked. Allow notifications in your phone's settings, then try again.", 3000)
        );
        await toast.present();
      };

      return {
        choreReminders,
        handleChoreRemindersChange,
        ambushAlerts,
        ambushAlertsDisabled,
        ambushAlertsMessage,
        handleAmbushAlertsChange,
        comingSoon: ALERTS_COMING_SOON,
      };
    },
  });
</script>

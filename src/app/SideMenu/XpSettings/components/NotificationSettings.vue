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
          </ion-item-group>
        </ion-list>
      </ion-card>
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
      IonItemDivider,
      IonItemGroup,
      IonLabel,
      IonToggle,
      IonCard,
      IonButtons,
    },
    mixins: [ionic],
    setup() {
      const ambushAlerts = ref(battleAlertsChoice() === "on");
      const ambushAlertsDisabled = ref(false);
      const ambushAlertsMessage = ref(
        "A heads-up when a beast ambushes your hero while the game is in the background."
      );

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
            const toast = await toastController.create(
              rpgToastOptions("Your browser blocked alerts. Allow them in the site settings, then try again.", 3000)
            );
            await toast.present();
          }
        } else {
          setBattleAlertsChoice("off");
        }
      };

      return {
        ambushAlerts,
        ambushAlertsDisabled,
        ambushAlertsMessage,
        handleAmbushAlertsChange,
      };
    },
  });
</script>

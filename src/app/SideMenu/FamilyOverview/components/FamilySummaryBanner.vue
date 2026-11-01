<template>
  <ion-card class="family-summary-banner rpg-box">
    <ion-card-content class="ion-no-padding">
      <ion-grid>
        <ion-row class="ion-align-items-center">
          <!-- Chores Progress -->
          <ion-col size="12" size-md="4" class="summary-col">
            <ion-item lines="none" class="summary-item">
              <ion-icon slot="start" :icon="checkboxOutline" color="primary" class="summary-icon" />
              <ion-label>
                <ion-note class="summary-label">Today's Chores</ion-note>
                <ion-text color="dark">
                  <h2 class="summary-value">{{ completedChores }} / {{ totalChores }}</h2>
                </ion-text>
                <ion-progress-bar :value="progressFraction" color="success" class="summary-progress" />
              </ion-label>
            </ion-item>
          </ion-col>

          <!-- Household GP -->
          <ion-col size="6" size-md="4" class="summary-col">
            <ion-item lines="none" class="summary-item">
              <ion-icon slot="start" :icon="walletOutline" color="warning" class="summary-icon" />
              <ion-label>
                <ion-note class="summary-label">Family Vault</ion-note>
                <ion-text color="warning">
                  <h2 class="summary-value">₲{{ formattedGp }}</h2>
                </ion-text>
                <ion-note class="summary-sub">{{ totalMembers }} Members</ion-note>
              </ion-label>
            </ion-item>
          </ion-col>

          <!-- Longest Streak -->
          <ion-col size="6" size-md="4" class="summary-col">
            <ion-item lines="none" class="summary-item">
              <ion-icon slot="start" :icon="flameOutline" color="danger" class="summary-icon" />
              <ion-label>
                <ion-note class="summary-label">Top Streak</ion-note>
                <ion-text color="danger">
                  <h2 class="summary-value">{{ longestStreak }} Days</h2>
                </ion-text>
                <ion-note class="summary-sub">Momentum</ion-note>
              </ion-label>
            </ion-item>
          </ion-col>
        </ion-row>

        <!-- Pending Approvals Banner (visible when approvals wait) -->
        <ion-row v-if="pendingApprovals > 0">
          <ion-col size="12">
            <ion-item color="warning" class="pending-alert-item" lines="none">
              <ion-icon slot="start" :icon="alertCircleOutline" />
              <ion-label class="ion-text-wrap">
                <ion-text>
                  <strong>{{ pendingApprovals }} quest{{ pendingApprovals === 1 ? '' : 's' }} awaiting Game Master approval</strong>
                </ion-text>
              </ion-label>
              <ion-button v-if="canManage" slot="end" size="small" color="dark" router-link="/game-master/approvals">
                Review
              </ion-button>
            </ion-item>
          </ion-col>
        </ion-row>
      </ion-grid>
    </ion-card-content>
  </ion-card>
</template>

<script lang="ts">
import { computed, defineComponent } from "vue";
import {
  IonCard,
  IonCardContent,
  IonGrid,
  IonRow,
  IonCol,
  IonItem,
  IonIcon,
  IonLabel,
  IonNote,
  IonText,
  IonProgressBar,
  IonButton,
} from "@ionic/vue";
import {
  checkboxOutline,
  walletOutline,
  flameOutline,
  alertCircleOutline,
} from "ionicons/icons";

export default defineComponent({
  name: "FamilySummaryBanner",
  components: {
    IonCard,
    IonCardContent,
    IonGrid,
    IonRow,
    IonCol,
    IonItem,
    IonIcon,
    IonLabel,
    IonNote,
    IonText,
    IonProgressBar,
    IonButton,
  },
  props: {
    completedChores: { type: Number, required: true },
    totalChores: { type: Number, required: true },
    totalGp: { type: Number, required: true },
    totalMembers: { type: Number, required: true },
    longestStreak: { type: Number, required: true },
    pendingApprovals: { type: Number, required: true },
    canManage: { type: Boolean, default: false },
  },
  setup(props) {
    const progressFraction = computed(() => {
      const hasChores = props.totalChores > 0;
      if (!hasChores) return 1;
      return Math.min(1, Math.max(0, props.completedChores / props.totalChores));
    });

    const formattedGp = computed(() => {
      const gp = props.totalGp;
      const isThousands = gp >= 1000;
      if (isThousands) {
        return `${(gp / 1000).toFixed(1)}k`;
      }
      return gp.toLocaleString();
    });

    return {
      progressFraction,
      formattedGp,
      checkboxOutline,
      walletOutline,
      flameOutline,
      alertCircleOutline,
    };
  },
});
</script>

<style lang="scss" scoped>
.family-summary-banner {
  margin: 0 0 16px 0;
  border-radius: 12px;
}
.summary-col {
  padding: 4px;
}
.summary-item {
  --background: transparent;
}
.summary-icon {
  font-size: 28px;
  margin-right: 12px;
}
.summary-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
  display: block;
}
.summary-value {
  margin: 2px 0 4px 0;
  font-size: 20px;
  font-weight: bold;
}
.summary-sub {
  font-size: 11px;
  display: block;
}
.summary-progress {
  height: 6px;
  border-radius: 3px;
  margin-top: 4px;
}
.pending-alert-item {
  border-radius: 8px;
  margin: 4px;
}
</style>

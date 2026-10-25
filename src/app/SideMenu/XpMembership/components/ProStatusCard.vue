<template>
  <ion-card class="status-card" :class="`state-${status.state}`" data-cy="pro-status-card">
    <ion-card-header>
      <ion-card-title>Your family's XP Pro</ion-card-title>
      <ion-card-title class="ion-text-nowrap">
        <ion-icon :icon="isOn ? shieldCheckmark : ribbonOutline" :color="isOn ? 'success' : 'medium'" class="status-icon" />
        <ion-text :color="isOn ? 'success' : 'medium'" data-cy="pro-state">{{ status.label }}</ion-text>
      </ion-card-title>
    </ion-card-header>
    <ion-card-content>
      <ul class="status-lines">
        <li v-if="status.reasonLine" class="reason-line" data-cy="pro-reason">{{ status.reasonLine }}</li>
        <li v-if="status.planName">Plan: <ion-chip color="primary">{{ status.planName }}</ion-chip></li>
        <li v-if="status.dateLine" data-cy="pro-date">{{ status.dateLine }}</li>
        <li v-if="status.maskedKey" data-cy="pro-masked-key">Key: <ion-chip>{{ status.maskedKey }}</ion-chip></li>
        <li v-if="status.state === 'free'">XP Pro is off. Everything the heroes need stays free.</li>
      </ul>
      <div class="status-actions">
        <ion-button v-if="status.canManage" fill="outline" data-cy="manage-button" @click="pro.manage()">
          Manage subscription
        </ion-button>
        <ion-button fill="clear" router-link="/xp-settings/pro" data-cy="see-key-button">See key &amp; restore</ion-button>
      </div>
    </ion-card-content>
  </ion-card>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonChip, IonIcon, IonText } from "@ionic/vue";
import { ribbonOutline, shieldCheckmark } from "ionicons/icons";
import { useProStore } from "@/lib/store/stores/pro";
import { membershipOf } from "@/lib/services/pro/membershipStatus";

const pro = useProStore();
const status = computed(() => membershipOf(pro));
const isOn = computed(() => status.value.state === "active" || status.value.state === "lifetime");
</script>

<style lang="scss" scoped>
.status-card {
  border-left: 5px solid #7ed321;

  &.state-free,
  &.state-expired {
    border-left-color: #9aa0a6;
  }

  .status-icon {
    font-size: 1.8em;
    margin-right: 8px;
  }

  .status-lines {
    list-style: none;
    margin: 0 0 8px;
    padding: 0;

    li {
      margin: 4px 0;
    }

    .reason-line {
      color: var(--gs-text);
    }
  }

  .status-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
}
</style>

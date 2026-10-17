<template>
  <ion-card v-if="isShown" class="backup-nudge max-w-2xl" data-cy="backup-nudge">
    <ion-card-content>
      <p class="backup-nudge__title"><i class="fad fa-shield-alt" aria-hidden="true"></i> Back up your family</p>
      <p class="backup-nudge__text">
        {{ ageLabel }}. Everything lives on this phone, so one lost phone would lose every quest and level.
      </p>
      <div class="backup-nudge__actions">
        <ion-button color="rpg" data-cy="backup-now" @click="backUpNow">Back up now</ion-button>
        <ion-button fill="clear" color="medium" data-cy="backup-later" @click="later">Later</ion-button>
      </div>
    </ion-card-content>
  </ion-card>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { IonButton, IonCard, IonCardContent } from "@ionic/vue";
import { backupAgeLabel, isBackupDue, lastBackupAt, snoozeBackupNudge } from "@/lib/services/core/backupReminder";
import { useUserStore } from "@/lib/store/stores/user";
import { canManageFamily } from "@/router/_Guards/gm.guard";

/**
 * A card on the Settings page, for a Game Master only: once a week it asks them to back up, and takes them to General,
 * where the backup file is made. "Later" quiets it for a few days.
 */
const router = useRouter();
const userStore = useUserStore();
const hasFamily = computed(() => Object.keys(userStore.users).length > 0);
const isSnoozed = ref(false);
const isShown = computed(() => !isSnoozed.value && canManageFamily(userStore) && isBackupDue(hasFamily.value));
const ageLabel = computed(() => backupAgeLabel(lastBackupAt()));

const backUpNow = () => {
  void router.push("/xp-settings/general");
};
const later = () => {
  snoozeBackupNudge();
  isSnoozed.value = true;
};
</script>

<style lang="scss" scoped>
.backup-nudge__title {
  margin: 0 0 4px;
  font-size: 1.05rem;
  color: #fff2a8;
}

.backup-nudge__text {
  margin: 0 0 8px;
  font-size: 0.9rem;
}

.backup-nudge__actions {
  display: flex;
  gap: 8px;
}
</style>

<template>
  <ion-item v-if="isGameMaster" lines="none" data-cy="approval-reminders">
    <ion-label class="ion-text-wrap">
      <h2>Approval reminders</h2>
      <p>How long a chore waits for you before the phone reminds you.</p>
    </ion-label>
    <ion-select
      slot="end"
      interface="popover"
      data-cy="approval-reminders-select"
      :value="hours"
      @ionChange="handleChange"
    >
      <ion-select-option v-for="option in OPTIONS" :key="option.hours" :value="option.hours">
        {{ option.label }}
      </ion-select-option>
    </ion-select>
  </ion-item>
</template>

<script setup lang="ts">
  import { ref } from "vue";
  import { IonItem, IonLabel, IonSelect, IonSelectOption } from "@ionic/vue";
  import { canManageFamily } from "@/router/_Guards/gm.guard";
  import { approvalWaitHours, setApprovalWaitHours } from "@/lib/services/notifications/approvalReminders";

  interface WaitOption {
    hours: number;
    label: string;
  }

  const OPTIONS: WaitOption[] = [
    { hours: 0, label: "Off" },
    { hours: 1, label: "1 hour" },
    { hours: 2, label: "2 hours" },
    { hours: 4, label: "4 hours" },
    { hours: 8, label: "8 hours" },
  ];

  const isGameMaster = canManageFamily();
  const hours = ref(approvalWaitHours());

  const handleChange = (event: CustomEvent<{ value: number }>) => {
    const picked = Number(event.detail.value);
    const isKnown = OPTIONS.some((option) => option.hours === picked);
    if (!isKnown) return;
    hours.value = picked;
    setApprovalWaitHours(picked);
  };
</script>

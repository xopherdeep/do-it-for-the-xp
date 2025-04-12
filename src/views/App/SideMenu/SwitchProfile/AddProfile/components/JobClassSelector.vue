<template>
  <ion-popover 
    :is-open="isOpen" 
    @didDismiss="$emit('close')"
    :arrow="false"
    class="class-selector"
  >
    <ion-content class="ion-padding">
      <ion-list>
        <ion-item 
          v-for="job in jobClassOptions" 
          :key="job.name"
          button
          :class="{ active: job.name === modelValue }"
          @click="$emit('update:modelValue', job.name)"
        >
          <i :class="`fad ${job.icon} fa-2x mr-3`"></i>
          <ion-label>{{ job.name }}</ion-label>
        </ion-item>
      </ion-list>
    </ion-content>
  </ion-popover>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import { JOB_CLASS_OPTIONS } from "@/constants";

export default defineComponent({
  name: 'JobClassSelector',
  props: {
    isOpen: {
      type: Boolean,
      required: true
    },
    modelValue: {
      type: String,
      required: true
    }
  },
  emits: ['update:modelValue', 'close'],
  setup() {
    const jobClassOptions = ref(JOB_CLASS_OPTIONS);
    return {
      jobClassOptions
    };
  }
});
</script>

<style lang="scss" scoped>
.class-selector {
  --width: 300px;
}

ion-item {
  --padding-start: 1rem;
  --inner-padding-end: 1rem;
  transition: all 0.2s ease;

  &.active {
    --background: var(--ion-color-primary-tint);
    --color: var(--ion-color-primary);
    i {
      color: var(--ion-color-primary);
    }
  }

  &:hover {
    --background: var(--ion-color-light-tint);
  }
}
</style>
<template>
  <div class="xp-ap-battery" v-if="apPercent !== null">
    <span class="ap-value">{{ apPercent }}</span>
    <span class="ap-label">AP %</span>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, PropType } from "vue";

export default defineComponent({
  name: "xp-ap-battery",
  props: {
    stats: {
      type: Object as PropType<any>,
      required: true
    }
  },
  setup(props) {
    const apPercent = computed(() => {
      const ap = props.stats?.ap;
      if (ap === undefined || ap === null) return null;
      
      if (typeof ap === 'object') {
        const today = Number(ap.today) || 0;
        const week = Number(ap.week || ap.total) || 1;
        return Math.round((today / week) * 100);
      }
      return Number(ap) || 0;
    });

    return {
      apPercent
    };
  }
});
</script>

<style lang="scss" scoped>
.xp-ap-battery {
  display: flex;
  align-items: baseline;
  gap: 6px;
  line-height: 1;
  background: rgba(var(--ion-color-secondary-rgb), 0.25);
  padding: 6px 16px;
  border-radius: 20px;
  border: 1px solid rgba(var(--ion-color-secondary-rgb), 0.5);
  backdrop-filter: blur(8px);
  box-shadow: 0 0 20px rgba(var(--ion-color-secondary-rgb), 0.3),
              inset 0 0 10px rgba(var(--ion-color-secondary-rgb), 0.2);

  .ap-value {
    font-size: 1.2rem;
    font-weight: 900;
    color: var(--ion-color-secondary);
    text-shadow: 0 0 10px rgba(var(--ion-color-secondary-rgb), 0.6);
    letter-spacing: 0.5px;
  }

  .ap-label {
    font-size: 0.75rem;
    font-weight: 800;
    text-transform: uppercase;
    color: var(--ion-color-secondary);
    opacity: 0.9;
  }
}
</style>

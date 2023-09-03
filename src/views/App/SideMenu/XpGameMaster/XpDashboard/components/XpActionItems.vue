<template>
  <ion-item
    button
    detail
  >
    <i
      class="fad fa-clipboard-check fa-2x my-2"
      slot="start"
    ></i>
    <ion-label>
      {{ approvals?.total || 0 }} Approvals
      <p>
        {{ approvals?.chores || 0 }}
        Achievements
        |
        {{ approvals?.rewards || 0 }}
        Accessories
      </p>
    </ion-label>
  </ion-item>
</template>

<script lang="ts">
  import ionic from '@/mixins/ionic';
  import { defineComponent, ref, computed } from 'vue';

  export default defineComponent({
    name: 'xp-action-items',
    mixins: [ionic],
    setup() {
      const approvals = ref({
        chores: 10,
        rewards: 5,
        total: computed(
          () => approvals.value.chores + approvals.value.rewards
        )
      });

      return {
        approvals
      }
    }
  })
</script>

<style></style>


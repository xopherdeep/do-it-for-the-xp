<template>
  <ion-item
    button
    detail
    @click="navigateToApprovals"
    class="approval-item"
  >
    <i
      class="fad fa-clipboard-check fa-2x my-2"
      slot="start"
    ></i>
    <ion-label>
      <div class="approval-header">
        <span>{{ approvals?.total || 0 }} Approvals</span>
        <ion-badge color="primary" v-if="hasUrgentApprovals">Urgent</ion-badge>
      </div>
      <p>
        <ion-badge color="success" class="mr-2">
          {{ approvals?.chores || 0 }}
          <i class="fad fa-medal ml-1"></i>
        </ion-badge>
        <ion-badge color="warning">
          {{ approvals?.rewards || 0 }}
          <i class="fad fa-backpack ml-1"></i>
        </ion-badge>
      </p>
    </ion-label>
    <ion-note slot="end" color="medium">
      <i class="fad fa-clock mr-1"></i>
      Updated {{ lastUpdated }}
    </ion-note>
  </ion-item>
</template>

<script lang="ts">
  import ionic from '@/mixins/ionic';
  import { defineComponent, ref, computed } from 'vue';
  import { useRouter } from 'vue-router';

  export default defineComponent({
    name: 'xp-action-items',
    mixins: [ionic],
    setup() {
      const router = useRouter();
      
      const approvals = ref({
        chores: 10,
        rewards: 5,
        total: computed(
          () => approvals.value.chores + approvals.value.rewards
        ),
        urgent: 3 // Number of urgent approvals
      });
      
      const lastUpdated = ref('Just now');
      
      const hasUrgentApprovals = computed(() => {
        return approvals.value.urgent > 0;
      });
      
      const navigateToApprovals = () => {
        // Navigate to approvals page
        router.push('/game-master/approvals');
      };

      return {
        approvals,
        lastUpdated,
        hasUrgentApprovals,
        navigateToApprovals
      }
    }
  })
</script>

<style lang="scss" scoped>
  .approval-item {
    --background: rgba(var(--ion-color-primary-rgb), 0.05);
    margin-bottom: 8px;
    border-radius: 8px;
    
    ion-note {
      font-size: 12px;
      display: flex;
      align-items: center;
    }
  }
  
  .approval-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    
    ion-badge {
      margin-left: 8px;
    }
  }
  
  ion-badge {
    display: inline-flex;
    align-items: center;
    padding: 4px 8px;
  }
</style>


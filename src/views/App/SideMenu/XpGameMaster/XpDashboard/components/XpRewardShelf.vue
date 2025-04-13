<template>
  <ion-item-sliding>
    <ion-item-options side="start">
      <ion-item-option color="warning">
        History
        <i
          class="fad fa-cash-register fa-lg my-2"
          slot="bottom"
        ></i>
      </ion-item-option>
    </ion-item-options>
    <ion-item
      button
      detail
      class="reward-item"
      @click="navigateToRewards"
    >
      <i
        slot="start"
        class="fad fa-grip-vertical fa-lg mr-4"
      ></i>
      <i
        class="fad fa-hand-holding-box fa-2x mr-3"
        slot="start"
      ></i>
      <ion-label>
        <div class="reward-header">
          <span>{{ rewards.total }} Accessories Redeemed</span>
          <ion-badge color="warning" v-if="rewards.active > 0">{{ rewards.active }} Active</ion-badge>
        </div>
        <p>
          <ion-badge color="success" class="mr-2">
            {{ rewards.active }} Active
          </ion-badge>
          <ion-badge color="danger" class="mr-2">
            {{ rewards.expired }} Expired
          </ion-badge>
          <ion-badge color="tertiary" class="mr-2">
            {{ rewards.redeemed }} Redeemed
          </ion-badge>
          <ion-badge color="warning">
            <xp-gp :gp="rewards.cashed" />
            Cashed
          </ion-badge>
        </p>
      </ion-label>
      <ion-note slot="end" color="medium">
        <i class="fad fa-clock mr-1"></i>
        Updated {{ lastUpdated }}
      </ion-note>
    </ion-item>
  </ion-item-sliding>
</template>

<script lang="ts">
  import { defineComponent, ref, computed } from 'vue'
  import ionic from '@/mixins/ionic'
  import { useRouter } from 'vue-router'

  export default defineComponent({
    name: 'xp-reward-shelf',
    mixins: [ionic],
    setup() {
        const rewards = ref({
          active: 80,
          expired: 0,
          redeemed: 0,
          cashed: 0,
          total: computed(() => rewards.value.active + rewards.value.expired)
        });

        const router = useRouter();
        
        const navigateToRewards = () => {
          router.push('/game-master/rewards');
        };

        return {
          rewards,
          navigateToRewards
        };
    }
  })
</script>

<style lang="scss" scoped>
  .reward-item {
    --background: rgba(var(--ion-color-success-rgb), 0.05);
    margin-bottom: 8px;
    border-radius: 8px;
    
    ion-note {
      font-size: 12px;
      display: flex;
      align-items: center;
    }
  }
  
  .reward-header {
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
    margin-right: 4px;
  }
</style>

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
        {{ rewards.total }} Accessories Redeemed
        <p>
          {{ rewards.active }} Active
          |
          {{ rewards.expired }} Expired
          |
          {{ rewards.redeemed }} Redeemed
          |
          <xp-gp :gp="rewards.cashed" />
          Cashed
        </p>
      </ion-label>

    </ion-item>
  </ion-item-sliding>
</template>

<script lang="ts">
  import { defineComponent, ref, computed } from 'vue'
  import ionic from '@/mixins/ionic'

  export default defineComponent({
    name: 'xp-reward-shelf',
    mixins: [ionic],
    setup() {
      const rewards = ref({
        active: 10,
        expired: 5,
        redeemed: 0,
        cashed: 0,
        total: computed(() => rewards.value.active + rewards.value.expired)
      });

      return {
        rewards
      }
    }
  })
</script>

<style></style>

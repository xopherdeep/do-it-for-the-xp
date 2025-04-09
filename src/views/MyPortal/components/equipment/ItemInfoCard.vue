<template>
  <ion-card class="info mb-4">
    <ion-card-header>
      <ion-card-title v-if="item" class="item-title">{{ item.name }}</ion-card-title>
    </ion-card-header>
    <ion-card-content class="item-content">
      <div class="item-details">
        <div class="icon-container">
          <i class="fad" :class="`fa-${item.faIcon}`"></i>
          <div v-if="item.mpCost" class="mp-cost">{{ item.mpCost }}MP</div>
        </div>
        <div class="description">
          <p>{{ item.desc }}</p>
          <div v-if="item.rechargeTime" class="recharge-time">
            <i class="fad fa-clock"></i> Recharge: {{ item.rechargeTime }}
          </div>
        </div>
      </div>
      <div class="action-buttons">
        <ion-button expand="block" color="secondary" @click="handleAction" class="equip-btn">
          {{ item.click ? 'View' : 'Equip' }}
        </ion-button>
      </div>
    </ion-card-content>
  </ion-card>
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue";
import { EquipmentItem } from "./EquipmentItems";

export default defineComponent({
  name: "item-info-card",
  props: {
    item: {
      type: Object as PropType<EquipmentItem>,
      required: true
    }
  },
  methods: {
    handleAction() {
      if (this.item.click) {
        this.item.click();
      } else {
        this.$emit("equip", this.item);
      }
    }
  }
});
</script>

<style lang="scss" scoped>
.info {
  min-height: 15vh;
  max-height: 20vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  ion-card-header {
    padding: 8px 16px;
    background-color: rgba(255, 255, 255, 0.05);
  }

  .item-title {
    font-size: 1.2rem;
    font-weight: bold;
    text-align: center;
  }

  .item-content {
    display: flex;
    flex-direction: column;
    padding: 8px;
    height: calc(100% - 44px);
  }

  .item-details {
    display: flex;
    flex: 1;
    margin-bottom: 8px;
  }

  .icon-container {
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    width: 70px;
    height: 70px;
    margin-right: 10px;
    background-color: rgba(255, 255, 255, 0.05);
    border-radius: 8px;

    i {
      font-size: 2.5rem;
    }

    .mp-cost {
      position: absolute;
      bottom: -5px;
      right: -5px;
      background-color: #3880ff;
      color: white;
      border-radius: 10px;
      padding: 2px 6px;
      font-size: 0.7rem;
      font-weight: bold;
    }
  }

  .description {
    flex: 1;
    display: flex;
    flex-direction: column;
    font-size: 0.85rem;
    overflow: hidden;

    p {
      flex: 1;
      margin: 0 0 5px 0;
      overflow-y: auto;
      max-height: 60px;
      line-height: 1.2;
    }

    .recharge-time {
      font-size: 0.75rem;
      color: #ffb74d;
      display: flex;
      align-items: center;
      
      i {
        margin-right: 5px;
      }
    }
  }

  .action-buttons {
    display: flex;
    gap: 8px;

    ion-button {
      margin: 0;
      height: 30px;
      font-size: 0.9rem;
      --padding-top: 0;
      --padding-bottom: 0;
    }

    .equip-btn {
      --background: #2dd36f;
      width: 100%;
    }
  }
}
</style>

<template>
  <ion-card class="info mb-4">
    <ion-card-header>
      <ion-card-title v-if="item" class="item-title">{{ item.name }}</ion-card-title>
    </ion-card-header>
    <ion-card-content class="item-content">
      <div class="item-details">
        <div class="icon-container" @click="handleEquip" :class="{ 'equipped': isEquipped }">
          <i class="fad" :class="`fa-${item.faIcon}`"></i>
          <div v-if="item.mpCost" class="mp-cost">{{ item.mpCost }}MP</div>
          <div v-if="isEquipped" class="equipped-badge">
            <i class="fad fa-check"></i>
          </div>
        </div>
        <div class="description">
          <p>{{ item.desc }}</p>
          <div class="item-stats">
            <div v-if="item.rechargeTime" class="recharge-time">
              <i class="fad fa-clock"></i> Recharge: {{ item.rechargeTime }}
            </div>
            <div v-if="item.hand" class="equipped-in">
              <i class="fad fa-hand-paper"></i> {{ item.hand === 'left' ? 'Left' : 'Right' }} Hand
            </div>
          </div>
        </div>
      </div>
      <div class="action-buttons">
        <ion-button v-if="item.click" expand="block" color="primary" @click="handleView" class="view-btn">
          View
        </ion-button>
        <ion-button v-else expand="block" :color="isEquipped ? 'danger' : 'secondary'" @click="handleEquip" class="equip-btn">
          {{ isEquipped ? 'Unequip' : 'Equip' }}
        </ion-button>
      </div>
    </ion-card-content>
  </ion-card>
</template>

<script lang="ts">
import { defineComponent, PropType, computed } from "vue";
import { EquipmentItem } from "./EquipmentItems";
import { toastController } from "@ionic/vue";

export default defineComponent({
  name: "item-info-card",
  props: {
    item: {
      type: Object as PropType<EquipmentItem>,
      required: true
    },
    equippedItems: {
      type: Array as PropType<EquipmentItem[]>,
      default: () => []
    }
  },
  emits: ["equip"],
  setup(props, { emit }) {
    const isEquipped = computed(() => {
      return props.equippedItems.some(i => i.faIcon === props.item.faIcon);
    });

    const handleView = () => {
      if (props.item.click) {
        props.item.click();
      }
    };

    const handleEquip = async () => {
      if (props.item.click) {
        props.item.click();
        return;
      }

      if (isEquipped.value) {
        // Unequip the item
        emit("equip", null);
        
        // Show toast
        const toast = await toastController.create({
          message: `${props.item.name} unequipped`,
          duration: 2000,
          position: 'bottom',
          color: 'medium',
          cssClass: 'rpg-toast'
        });
        await toast.present();
      } else {
        // Equip the item
        emit("equip", props.item);
        
        // Show toast
        const toast = await toastController.create({
          message: `${props.item.name} equipped`,
          duration: 2000,
          position: 'bottom',
          color: 'success',
          cssClass: 'rpg-toast'
        });
        await toast.present();
      }
    };

    return {
      isEquipped,
      handleView,
      handleEquip
    };
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
    cursor: pointer;
    transition: all 0.2s ease;
    
    &:hover {
      transform: scale(1.05);
      background-color: rgba(255, 255, 255, 0.1);
    }
    
    &.equipped {
      background-color: rgba(45, 211, 111, 0.2);
      border: 1px solid rgba(45, 211, 111, 0.5);
    }

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
    
    .equipped-badge {
      position: absolute;
      top: -5px;
      right: -5px;
      background-color: #2dd36f;
      color: white;
      border-radius: 50%;
      width: 20px;
      height: 20px;
      display: flex;
      justify-content: center;
      align-items: center;
      font-size: 0.7rem;
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
    
    .item-stats {
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
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
    
    .equipped-in {
      font-size: 0.75rem;
      color: #2dd36f;
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

    .view-btn {
      --background: #3880ff;
      width: 100%;
    }
    
    .equip-btn {
      width: 100%;
    }
  }
}
</style>

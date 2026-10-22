<template>
  <ion-modal
    ref="modalRef"
    :is-open="isOpen"
    @did-dismiss="$emit('close')"
    class="shop-item-modal"
  >
    <div v-if="item" class="shop-item-modal__content">
      <div class="shop-item-modal__header">
        <span class="header-spacer" />
        <h2 class="modal-title">{{ item.name }}</h2>
        <xp-close-button size="md" color="light" @click="handleDismiss" />
      </div>

      <div class="shop-item-modal__showcase">
        <xp-item-model :icon="item.icon" :tint="tint" :photo="item.photo" :name="item.name" :size="150" spinning />
      </div>

      <div class="shop-item-modal__desc-box">
        <p class="item-desc">
          {{ item.description || "A fine find, if you can afford it." }}
        </p>
      </div>

      <div class="shop-item-modal__economics">
        <div class="econ-pill">
          <span class="econ-label">WALLET</span>
          <span class="econ-value">
            <i class="fa fa-coins" />
            {{ wallet }} GP
          </span>
        </div>
        <div class="econ-pill price">
          <span class="econ-label">PRICE</span>
          <span class="econ-value">
            <i class="fa fa-coins" />
            {{ item.price }} GP
          </span>
        </div>
        <div class="econ-pill" :class="canAfford ? 'balance' : 'short'">
          <span class="econ-label">{{ canAfford ? 'AFTER' : 'SHORT' }}</span>
          <span class="econ-value">
            <i class="fa fa-coins" />
            {{ canAfford ? wallet - item.price : item.price - wallet }} GP
          </span>
        </div>
      </div>

      <div class="shop-item-modal__actions">
        <ion-button
          expand="block"
          color="success"
          class="buy-button"
          :disabled="!canAfford || isBuying"
          @click.stop="$emit('buy', item)"
        >
          <template v-if="canAfford">
            <i class="fad fa-shopping-bag" />
            Buy Item ({{ item.price }} GP)
          </template>
          <template v-else>
            <i class="fa fa-lock" />
            Not Enough GP
          </template>
        </ion-button>

        <ion-button
          expand="block"
          fill="clear"
          color="medium"
          class="cancel-button"
          @click.stop="handleDismiss"
        >
          Never Mind
        </ion-button>
      </div>
    </div>
  </ion-modal>
</template>

<script lang="ts">
import { computed, defineComponent, PropType, ref } from "vue";
import { IonButton, IonModal } from "@ionic/vue";
import type { ShelfItem } from "@/lib/services/shop/PurchaseService";
import XpCloseButton from "@/components/atoms/CloseButton/XpCloseButton.vue";
import XpItemModel from "@/components/organisms/ItemModel/XpItemModel.vue";
import { potionTintOf } from "@/lib/services/battle/BattlePotions";

export default defineComponent({
  name: "ShopItemModal",
  components: {
    IonButton,
    IonModal,
    XpCloseButton,
    XpItemModel,
  },
  props: {
    isOpen: {
      type: Boolean,
      default: false,
    },
    item: {
      type: Object as PropType<ShelfItem | null>,
      default: null,
    },
    canAfford: {
      type: Boolean,
      default: true,
    },
    wallet: {
      type: Number,
      default: 0,
    },
    isBuying: {
      type: Boolean,
      default: false,
    },
  },
  emits: ["close", "buy"],
  setup(props, { emit }) {
    const modalRef = ref<any>(null);

    const handleDismiss = async () => {
      await modalRef.value?.$el?.dismiss();
      emit("close");
    };

    /** Potions share one duotone flask and are told apart by colour (HP red, MP blue, Elixir gold). */
    const tint = computed(() => potionTintOf(props.item?.name ?? ""));

    return {
      modalRef,
      handleDismiss,
      tint,
    };
  },
});
</script>

<style lang="scss" scoped>
.shop-item-modal {
  --width: 92%;
  --max-width: 420px;
  --height: auto;
  --max-height: 85vh;
  --border-radius: 28px;
  --background: transparent;

  &::part(content) {
    background: transparent;
    border-radius: 28px;
  }
}

.shop-item-modal__content {
  background: rgba(22, 14, 34, 0.92);
  backdrop-filter: blur(24px) saturate(160%);
  border: 2px solid rgba(247, 232, 168, 0.35);
  border-radius: 28px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.7), inset 0 0 1px 1px rgba(255, 255, 255, 0.08);
}

.shop-item-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;

  .header-spacer {
    width: 36px;
  }

  .modal-title {
    margin: 0;
    font-family: "Twoson", "Apple Kid", sans-serif;
    font-size: 1.5rem;
    color: #ffffff;
    text-align: center;
    letter-spacing: 0.5px;
    flex: 1;
    text-shadow: 0 2px 6px rgba(0, 0, 0, 0.6);
  }
}

.shop-item-modal__showcase {
  display: flex;
  justify-content: center;

}

.shop-item-modal__desc-box {
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 14px;

  .item-desc {
    margin: 0;
    font-family: "Apple Kid", sans-serif;
    font-size: 1.25rem;
    line-height: 1.3;
    color: #e7e6b3;
    text-align: center;
  }
}

.shop-item-modal__economics {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;

  .econ-pill {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 8px 6px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    text-align: center;

    &.price {
      border-color: rgba(247, 232, 168, 0.4);
      background: rgba(247, 232, 168, 0.08);
      .econ-value {
        color: #f7e8a8;
      }
    }

    &.balance {
      border-color: rgba(128, 216, 144, 0.3);
      .econ-value {
        color: #80d890;
      }
    }

    &.short {
      border-color: rgba(255, 73, 97, 0.4);
      background: rgba(255, 73, 97, 0.08);
      .econ-value {
        color: #ffa1ad;
      }
    }
  }

  .econ-label {
    font-family: "StatusPlz", "Apple Kid", sans-serif;
    font-size: 0.7rem;
    color: rgba(255, 255, 255, 0.5);
    letter-spacing: 0.5px;
  }

  .econ-value {
    font-family: "Twoson", "Apple Kid", sans-serif;
    font-size: 0.85rem;
    font-weight: bold;
    display: inline-flex;
    align-items: center;
    gap: 3px;
    white-space: nowrap;

    i {
      font-size: 0.75rem;
    }
  }
}

.shop-item-modal__actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 4px;

  .buy-button {
    --border-radius: 14px;
    font-family: "Twoson", "Apple Kid", sans-serif;
    font-size: 1.1rem;
    letter-spacing: 0.5px;
    height: 46px;

    i {
      margin-right: 6px;
    }
  }

  .cancel-button {
    font-family: "Apple Kid", sans-serif;
    font-size: 1.05rem;
  }
}
</style>

<template>
  <div
    class="shop-wallet-ware"
    :class="[`is-${walletWare.status}`, { 'is-disabled': isBuying }]"
    @click="$emit('buy')"
  >
    <div class="shop-wallet-ware__badge-col">
      <div class="wallet-icon-frame">
        <i class="fad fa-wallet" />
      </div>
    </div>
    <div class="shop-wallet-ware__info-col">
      <div class="shop-wallet-ware__title-row">
        <span class="wallet-name">{{ walletWare.name }}</span>
        <span
          class="wallet-price-pill"
          :class="walletWare.status === 'for-sale' ? 'is-available' : 'is-muted'"
        >
          <i class="fa fa-coins" />
          {{ walletWare.price }} GP
        </span>
      </div>
      <p class="wallet-blurb">{{ walletWare.blurb }}</p>
      <div class="wallet-status-row">
        <span v-if="walletWare.status === 'locked'" class="wallet-status is-locked">
          <i class="fa fa-lock" />
          {{ walletWare.note }}
        </span>
        <span v-else-if="walletWare.status === 'owned'" class="wallet-status is-owned">
          <i class="fa fa-check" />
          Owned
        </span>
        <span v-else-if="walletWare.status === 'for-sale'" class="wallet-status is-ready">
          <i class="fad fa-sparkles" />
          Tap to upgrade wallet
        </span>
        <span v-else class="wallet-status is-hint">
          {{ walletWare.note }}
        </span>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue";

export interface WalletWareData {
  name: string;
  blurb: string;
  price: number;
  status: "for-sale" | "locked" | "owned" | "ahead";
  note: string;
  offer?: any;
  hint?: string;
}

export default defineComponent({
  name: "ShopWalletWare",
  props: {
    walletWare: {
      type: Object as PropType<WalletWareData>,
      required: true,
    },
    isBuying: {
      type: Boolean,
      default: false,
    },
  },
  emits: ["buy"],
});
</script>

<style lang="scss" scoped>
.shop-wallet-ware {
  margin: 12px 14px;
  padding: 12px 14px;
  background: rgba(35, 20, 50, 0.85);
  border: 2px solid rgba(247, 232, 168, 0.4);
  border-radius: 16px;
  display: flex;
  align-items: center;
  gap: 14px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4), inset 0 0 10px rgba(247, 232, 168, 0.05);
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(10px);

  &:hover:not(.is-disabled) {
    border-color: #f7e8a8;
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.5), 0 0 12px rgba(247, 232, 168, 0.25);
  }

  &.is-disabled {
    pointer-events: none;
    opacity: 0.6;
  }

  &.is-locked,
  &.is-owned,
  &.is-ahead {
    opacity: 0.75;
    border-color: rgba(255, 255, 255, 0.15);
    background: rgba(25, 15, 35, 0.75);
  }

  &__badge-col {
    flex-shrink: 0;
  }

  .wallet-icon-frame {
    width: 48px;
    height: 48px;
    background: linear-gradient(135deg, rgba(247, 232, 168, 0.25), rgba(104, 208, 184, 0.1));
    border: 1.5px solid rgba(247, 232, 168, 0.5);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    color: #f7e8a8;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
  }

  &__info-col {
    flex: 1;
    min-width: 0;
  }

  &__title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .wallet-name {
    font-family: "Twoson", "Apple Kid", sans-serif;
    font-size: 1.05rem;
    color: #ffffff;
    letter-spacing: 0.4px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .wallet-price-pill {
    font-family: "StatusPlz", "Apple Kid", sans-serif;
    font-size: 0.85rem;
    padding: 3px 8px;
    border-radius: 8px;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    white-space: nowrap;

    &.is-available {
      background: rgba(247, 232, 168, 0.2);
      border: 1px solid #f7e8a8;
      color: #f7e8a8;
    }

    &.is-muted {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #cbd5e1;
    }
  }

  .wallet-blurb {
    margin: 3px 0;
    font-family: "Apple Kid", sans-serif;
    font-size: 1rem;
    color: #e7e6b3;
    line-height: 1.2;
  }

  .wallet-status-row {
    margin-top: 2px;
  }

  .wallet-status {
    font-family: "StatusPlz", "Apple Kid", sans-serif;
    font-size: 0.8rem;
    display: inline-flex;
    align-items: center;
    gap: 4px;

    &.is-locked {
      color: var(--ion-color-danger, #ff4961);
    }

    &.is-owned {
      color: #80d890;
    }

    &.is-ready {
      color: #68d0b8;
    }

    &.is-hint {
      color: #94a3b8;
    }
  }
}
</style>

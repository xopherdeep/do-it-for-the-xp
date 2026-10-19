<template>
  <ion-item-sliding class="claim-row">
    <ion-item lines="none" class="claim-row__item">
      <div class="claim">
        <div class="claim__head">
          <span class="claim__avatar" aria-hidden="true">
            <img v-if="avatar" :src="avatar" alt="" />
            <i v-else class="fad fa-gift"></i>
          </span>
          <div class="claim__who">
            <h2 class="claim__quest">{{ entry.itemName }}</h2>
            <p class="claim__meta">
              Bought by {{ heroName }}
              <span v-if="boughtOn" data-test="purchase-date">· {{ boughtOn }}</span>
            </p>
          </div>
        </div>

        <p class="claim__paid">Paid {{ entry.price }} GP · {{ deliveryLine }}</p>

        <div class="claim__actions">
          <button
            type="button"
            class="claim__btn claim__btn--approve"
            data-test="purchase-fulfil"
            :aria-label="`Fulfil ${entry.itemName} for ${heroName}`"
            @click="emit('fulfil', entry)"
          >
            <i class="fad fa-hand-holding-box" aria-hidden="true"></i> Fulfil
          </button>
          <button
            type="button"
            class="claim__btn claim__btn--back"
            data-test="purchase-refund"
            :aria-label="`Refund ${entry.itemName} to ${heroName}`"
            @click="emit('refund', entry)"
          >
            <i class="fad fa-coins" aria-hidden="true"></i> Refund
          </button>
        </div>
      </div>
    </ion-item>
    <ion-item-options side="end">
      <ion-item-option color="success" @click="emit('fulfil', entry)">
        <i class="fad fa-hand-holding-box fa-lg" aria-hidden="true"></i>
        Fulfil
      </ion-item-option>
      <ion-item-option color="danger" @click="emit('refund', entry)">
        <i class="fad fa-coins fa-lg" aria-hidden="true"></i>
        Refund
      </ion-item-option>
    </ion-item-options>
  </ion-item-sliding>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { IonItem, IonItemOption, IonItemOptions, IonItemSliding } from "@ionic/vue";
import type { PurchaseLogEntry } from "@/lib/databases/PurchaseLogDb";

defineOptions({ name: "approval-purchase-row" });

/**
 * One shop purchase waiting on the Game Master: the item, the hero, what they paid, and big Fulfil / Refund buttons
 * that look like the quest card's Approve / Send back. Swiping the row left still shows the same two actions as a
 * shortcut. The row only asks; XpApprovals runs the confirm dialogs and fulfillPurchase / refundPurchase.
 */
interface ApprovalPurchaseRowProps {
  entry: PurchaseLogEntry;
  heroName: string;
  /** The hero's avatar image, or "" for the gift glyph */
  avatar: string;
  /** The purchase date, already formatted ("" leaves it off) */
  boughtOn: string;
}

const props = defineProps<ApprovalPurchaseRowProps>();

const emit = defineEmits<{
  (e: "fulfil", entry: PurchaseLogEntry): void;
  (e: "refund", entry: PurchaseLogEntry): void;
}>();

const deliveryLine = computed(() => (props.entry.packed ? "game item, goes in their bag when you fulfil it" : "waiting to be delivered"));
</script>

<style lang="scss" scoped>
.claim-row__item {
  --padding-start: 8px;
  --padding-end: 8px;
  --inner-padding-end: 0;
  --background: transparent;
  --min-height: 0;
}

// Colours, frame and corners come from the kit tokens of the page's skin (`.xp-app--retro` / `.xp-app--modern`),
// the same ones the quest card (ApprovalClaimRow) wears
.claim {
  display: grid;
  gap: 8px;
  width: 100%;
  box-sizing: border-box;
  margin: 6px 0;
  padding: 10px;
  background: var(--xp-app-surface);
  border: var(--xp-app-section-border);
  border-radius: var(--xp-app-radius-section);
  color: var(--xp-app-text);
  font-family: var(--xp-app-font-body);
  text-shadow: var(--xp-app-text-shadow);
}

.claim__head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.claim__avatar {
  display: grid;
  flex: 0 0 40px;
  width: 40px;
  height: 40px;
  place-items: center;
  overflow: hidden;
  background: var(--xp-app-tile-bg);
  border: var(--xp-app-tile-border);
  border-radius: var(--xp-app-radius-tile);
  color: var(--xp-app-tile-fg);
  font-size: 1.2rem;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.claim__who {
  min-width: 0;
}

.claim__quest {
  margin: 0;
  font-size: 1rem;
  line-height: 1.2;
  font-family: var(--xp-app-font-title);
  color: var(--xp-app-text);
  white-space: normal;
  overflow-wrap: anywhere;
}

.claim__meta {
  margin: 2px 0 0;
  font-size: 0.75rem;
  color: var(--xp-app-text-dim);
}

.claim__paid {
  margin: 0;
  font-size: 0.8rem;
  color: var(--xp-app-text-dim);
}

.claim__actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.claim__btn {
  min-height: 44px;
  padding: 0 8px;
  border: var(--xp-app-btn-border, 0);
  border-radius: var(--xp-app-radius-control);
  font-family: inherit;
  font-size: 0.95rem;
  text-transform: var(--xp-app-title-transform);
  letter-spacing: 0.5px;
  color: var(--xp-app-on-accent);
  text-shadow: var(--xp-app-on-accent-shadow, 1px 1px 0 rgba(0, 0, 0, 0.7));
  box-shadow: var(--xp-app-btn-ring, none);
  cursor: pointer;
  --fa-primary-color: var(--xp-app-on-accent);
  --fa-secondary-color: var(--xp-app-on-accent);

  &:active {
    transform: translateY(1px);
    filter: brightness(0.85);
  }

  &:focus-visible {
    outline: 2px solid #fff;
    outline-offset: 2px;
  }

  &--approve {
    background: #2f7a3c;
  }

  &--back {
    background: #9a4a1c;
  }
}
</style>

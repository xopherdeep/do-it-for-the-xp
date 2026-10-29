<template>
  <ion-item-sliding class="claim-row">
    <ion-item lines="none" class="claim-row__item">
      <div class="claim">
        <div class="claim__head">
          <span class="claim__avatar" aria-hidden="true">
            <img v-if="avatar" :src="avatar" alt="" />
            <i v-else class="fad" :class="row.kind === 'beast' ? 'fa-paw-claws' : 'fa-scroll'"></i>
          </span>
          <div class="claim__who">
            <h2 class="claim__quest">{{ row.name }}</h2>
            <p class="claim__meta" data-test="creation-meta">
              {{ meta }}
              <span v-if="waited" class="claim__waited" data-test="creation-waited">· {{ waited }}</span>
            </p>
          </div>
        </div>

        <img v-if="portrait" class="claim__portrait" :src="portrait" alt="" data-test="creation-portrait" />

        <p v-if="paired" class="claim__paired" data-test="creation-paired">
          <i class="fad fa-scroll" aria-hidden="true"></i> {{ paired }}
        </p>

        <div class="claim__actions">
          <button
            type="button"
            class="claim__btn claim__btn--approve"
            data-test="creation-approve"
            :aria-label="`Approve ${row.name} by ${makerName}`"
            @click="emit('approve', row)"
          >
            <i class="fad fa-check" aria-hidden="true"></i> Approve
          </button>
          <button
            type="button"
            class="claim__btn claim__btn--back"
            data-test="creation-send-back"
            :aria-label="`Send ${row.name} back to ${makerName}`"
            @click="emit('reject', row)"
          >
            <i class="fad fa-undo" aria-hidden="true"></i> Send back
          </button>
          <button
            type="button"
            class="claim__btn claim__btn--ghost"
            data-test="creation-edit"
            :aria-label="`Edit ${row.name}`"
            @click="emit('edit', row)"
          >
            <i class="fad fa-edit" aria-hidden="true"></i> Edit
          </button>
        </div>
      </div>
    </ion-item>
    <ion-item-options side="end">
      <ion-item-option color="success" @click="emit('approve', row)">
        <i class="fad fa-check fa-lg" aria-hidden="true"></i>
        Approve
      </ion-item-option>
      <ion-item-option color="danger" @click="emit('reject', row)">
        <i class="fad fa-undo fa-lg" aria-hidden="true"></i>
        Send back
      </ion-item-option>
    </ion-item-options>
  </ion-item-sliding>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { IonItem, IonItemOption, IonItemOptions, IonItemSliding } from "@ionic/vue";
import { waitedLabel } from "@/lib/services/quests/waitedLabel";
import type { CreationRow } from "@/lib/services/creations/creations";
import { creationMetaLine, pairedLine } from "./creationMeta";

defineOptions({ name: "approval-creation-row" });

/**
 * One kid's creation waiting on the Game Master: the beast (with its picture) or the quest, who made it and what it
 * is, how long it has waited, the quest a beast was sent with, and Approve / Send back / Edit. Swiping the row left
 * still shows Approve and Send back as a shortcut. The row only asks; XpApprovals runs the dialogs and the review.
 */
interface ApprovalCreationRowProps {
  row: CreationRow;
  /** The maker's name, as the credit line says it */
  makerName: string;
  /** The maker's avatar image, or "" for a glyph */
  avatar: string;
  /** Who the quest is for (a quest row), or who the quest sent with the beast is for (a beast row); "" for none */
  targetNames: string;
  /** The beast's picture (the kid's own, or the library portrait), "" for a quest */
  portrait: string;
}

const props = defineProps<ApprovalCreationRowProps>();

const emit = defineEmits<{
  (e: "approve", row: CreationRow): void;
  (e: "reject", row: CreationRow): void;
  (e: "edit", row: CreationRow): void;
}>();

const meta = computed(() => creationMetaLine(props.row, props.makerName, props.targetNames));
const paired = computed(() => pairedLine(props.row, props.targetNames));
const waited = computed(() => waitedLabel(props.row.on));
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

// The kid's drawing (or the library portrait), a tile like the avatar's but big enough to judge
.claim__portrait {
  width: 96px;
  height: 96px;
  object-fit: cover;
  background: var(--xp-app-tile-bg);
  border: var(--xp-app-tile-border);
  border-radius: var(--xp-app-radius-tile);
  image-rendering: pixelated;
}

.claim__paired {
  margin: 0;
  font-size: 0.8rem;
  color: var(--xp-app-text);
}

.claim__actions {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
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

  // Edit is the quiet third choice: the frame's own colours, no fill
  &--ghost {
    background: transparent;
    border: 2px solid var(--xp-app-text-dim);
    color: var(--xp-app-text);
    text-shadow: var(--xp-app-text-shadow);
    --fa-primary-color: var(--xp-app-text);
    --fa-secondary-color: var(--xp-app-text-dim);
  }
}
</style>

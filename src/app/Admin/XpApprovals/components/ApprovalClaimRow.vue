<template>
  <ion-item-sliding class="claim-row">
    <ion-item lines="none" class="claim-row__item">
      <div class="claim">
        <div class="claim__head">
          <span class="claim__avatar" aria-hidden="true">
            <img v-if="avatar" :src="avatar" alt="" />
            <i v-else class="fad fa-scroll"></i>
          </span>
          <div class="claim__who">
            <h2 class="claim__quest">{{ entry.questName }}</h2>
            <p class="claim__meta">
              {{ heroName }}
              <span v-if="waited" class="claim__waited" data-test="claim-waited">· {{ waited }}</span>
            </p>
          </div>
        </div>

        <div class="claim__chips"><xp-app-chips :chips="chips" /></div>

        <approval-photo :entry="entry" />

        <div class="claim__actions">
          <button
            type="button"
            class="claim__btn claim__btn--approve"
            data-test="claim-approve"
            :aria-label="`Approve ${entry.questName} for ${heroName}`"
            @click="emit('approve', entry)"
          >
            <i class="fad fa-check" aria-hidden="true"></i> Approve
          </button>
          <button
            type="button"
            class="claim__btn claim__btn--back"
            data-test="claim-send-back"
            :aria-label="`Send ${entry.questName} back to ${heroName}`"
            @click="emit('reject', entry)"
          >
            <i class="fad fa-undo" aria-hidden="true"></i> Send back
          </button>
        </div>
      </div>
    </ion-item>
    <ion-item-options side="end">
      <ion-item-option color="success" @click="emit('approve', entry)">
        <i class="fad fa-check fa-lg" aria-hidden="true"></i>
        Approve
      </ion-item-option>
      <ion-item-option color="danger" @click="emit('reject', entry)">
        <i class="fad fa-undo fa-lg" aria-hidden="true"></i>
        Send back
      </ion-item-option>
    </ion-item-options>
  </ion-item-sliding>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { IonItem, IonItemOption, IonItemOptions, IonItemSliding } from "@ionic/vue";
import XpAppChips from "@/components/organisms/XpApp/XpAppChips.vue";
import ApprovalPhoto from "./ApprovalPhoto.vue";
import { claimChips } from "./claimChips";
import { withHuntBonus } from "@/lib/services/quests/huntBonus";
import { waitedLabel } from "@/lib/services/quests/waitedLabel";
import type { QuestLogEntry } from "@/lib/databases/QuestLogDb";

defineOptions({ name: "approval-claim-row" });

/**
 * One chore waiting on the Game Master: the quest, the hero and how long they have waited, what they earn as chips, the
 * photo proof if there is one, and big Approve / Send back buttons. Swiping the row left still shows the same two
 * actions as a shortcut. The row only asks; XpApprovals runs the confirm dialogs and approveClaim / rejectClaim.
 */
interface ApprovalClaimRowProps {
  entry: QuestLogEntry;
  heroName: string;
  /** The hero's avatar image, or "" for the scroll glyph */
  avatar: string;
}

const props = defineProps<ApprovalClaimRowProps>();

const emit = defineEmits<{
  (e: "approve", entry: QuestLogEntry): void;
  (e: "reject", entry: QuestLogEntry): void;
}>();

const chips = computed(() => claimChips(withHuntBonus(props.entry), props.entry.requiresPhoto));
const waited = computed(() => waitedLabel(props.entry.completedAt));
</script>

<style lang="scss" scoped>
.claim-row__item {
  --padding-start: 8px;
  --padding-end: 8px;
  --inner-padding-end: 0;
  --background: transparent;
  --min-height: 0;
}

// Colours, frame and corners come from the kit tokens of the page's skin (`.xp-app--retro` / `.xp-app--modern`)
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

.claim__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
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

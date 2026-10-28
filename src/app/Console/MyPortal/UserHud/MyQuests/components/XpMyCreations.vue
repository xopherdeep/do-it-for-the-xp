<template>
  <!-- display: contents (the scss): the header, the list and the footer stay the direct children of the Maker's modal -->
  <div class="my-creations" data-test="my-creations">
    <ion-header>
      <ion-toolbar>
        <xp-app-header :title="t('beastMaker.list.title')" icon="paint-brush">
          <template #end>
            <xp-close-button size="lg" color="light" aria-label="Close" data-test="list-close" @click="emit('close')" />
          </template>
        </xp-app-header>
      </ion-toolbar>
    </ion-header>

    <ion-content :scroll-y="true">
      <ul class="mc-list">
        <li v-for="row in rows" :key="row.key" class="mc-item" :data-key="row.key" :data-state="row.state">
          <!-- A swipe left bares Delete, on a creation that is waiting or came back; one in the game is not deleted from here -->
          <ion-item-sliding :disabled="!canDelete(row)">
            <ion-item lines="none" class="mc-slide">
              <div class="mc-card">
                <xp-app-row
                  :title="row.name"
                  :image="row.portrait"
                  :icon="row.kind === 'beast' ? 'dragon' : 'scroll'"
                  :chevron="canOpen(row)"
                  data-test="row"
                  @click="onRow(row)"
                >
                  <template #chips>
                    <xp-app-chip kind="tag" :value="stateChip(row.state, voice)" :class="`mc-chip--${row.state}`" data-test="chip" />
                  </template>
                </xp-app-row>

                <!-- Came back: the Game Master's note, then fix it (a beast) or send it as it is -->
                <template v-if="row.state === 'back'">
                  <p v-if="row.note" class="mc-note" data-test="note">
                    <i class="fad fa-comment-alt-lines" aria-hidden="true"></i>
                    <span>{{ row.note }}</span>
                  </p>
                  <div class="mc-actions">
                    <button v-if="row.beast" type="button" class="xp-app-btn xp-app-btn--ghost" data-test="fix" @click="emit('fix', row.beast)">
                      <i class="fad fa-pencil" aria-hidden="true"></i>
                      {{ t("beastMaker.list.fix") }}
                    </button>
                    <button type="button" class="xp-app-btn" data-test="resend" @click="emit('resend', row)">
                      <i class="fad fa-paper-plane" aria-hidden="true"></i>
                      {{ t("beastMaker.list.resend") }}
                    </button>
                  </div>
                </template>
              </div>
            </ion-item>
            <ion-item-options v-if="canDelete(row)" side="end">
              <ion-item-option color="danger" :aria-label="`${t('beastMaker.list.delete')} ${row.name}`" data-test="delete" @click="emit('delete', row)">
                <i class="fad fa-trash-alt fa-lg" aria-hidden="true"></i>
                {{ t("beastMaker.list.delete") }}
              </ion-item-option>
            </ion-item-options>
          </ion-item-sliding>
        </li>
      </ul>
    </ion-content>

    <!-- Controls stay in thumb reach: Draw a new beast sits at the bottom, under the cap's line when the hero is at it -->
    <ion-footer class="mc-footer">
      <p v-if="full" class="mc-full" data-test="full">
        <i class="fad fa-hourglass-half" aria-hidden="true"></i>
        <span>{{ t("beastMaker.cap") }}</span>
      </p>
      <button type="button" class="xp-app-btn mc-new" :disabled="full" data-test="new" @click="emit('new')">
        <i class="fad fa-paint-brush" aria-hidden="true"></i>
        {{ t("beastMaker.list.new") }}
      </button>
    </ion-footer>
  </div>
</template>

<script setup lang="ts">
import { IonContent, IonFooter, IonHeader, IonItem, IonItemOption, IonItemOptions, IonItemSliding, IonToolbar } from "@ionic/vue";
import XpCloseButton from "@/components/atoms/CloseButton/XpCloseButton.vue";
import XpAppChip from "@/components/organisms/XpApp/XpAppChip.vue";
import XpAppHeader from "@/components/organisms/XpApp/XpAppHeader.vue";
import XpAppRow from "@/components/organisms/XpApp/XpAppRow.vue";
import { useCopy, useVoice } from "@/hooks/useVoice";
import type { Beast } from "@/lib/databases/BestiaryDb";
import { stateChip } from "@/lib/services/creations/myCreations";
import type { MyCreationRow } from "@/lib/services/creations/myCreations";

defineOptions({ name: "xp-my-creations" });

/**
 * The Beast Maker's opening screen when the hero has made things (kid-creations design, section 5): their creations
 * newest first, each with a state chip (Waiting, Came back, In the game). A creation that came back shows the Game
 * Master's note with Fix it (a beast) and Send again; one that is in the game opens its Beast Card, when it has one.
 * Swiping a waiting or came-back row left offers Delete. The list only says what was asked for: the Maker answers.
 */
defineProps<{
  rows: readonly MyCreationRow[];
  /** The hero is at the cap: Draw a new beast is shut and the cap's line says why */
  full: boolean;
}>();

interface MyCreationsEvents {
  new: [];
  fix: [beast: Beast];
  resend: [row: MyCreationRow];
  open: [row: MyCreationRow];
  delete: [row: MyCreationRow];
  close: [];
}

const emit = defineEmits<MyCreationsEvents>();

const t = useCopy();
const { voice } = useVoice();

const canDelete = (row: MyCreationRow): boolean => row.state !== "inGame";
const canOpen = (row: MyCreationRow): boolean => row.card !== undefined;

const onRow = (row: MyCreationRow) => {
  if (canOpen(row)) emit("open", row);
};
</script>

<style lang="scss" scoped src="./_XpMyCreations.scss" />

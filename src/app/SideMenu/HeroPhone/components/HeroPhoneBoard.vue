<template>
  <div class="hero-phone-board" data-cy="hero-phone-board">
    <div v-if="stats" class="hero-stats rpg-box" data-cy="hero-stats">
      <span class="stat"><i class="fad fa-heart"></i> {{ stats.hp }}/{{ stats.maxHp }}</span>
      <span class="stat"><i class="fad fa-hat-wizard"></i> {{ stats.mp }}/{{ stats.maxMp }}</span>
      <span class="stat"><i class="fad fa-star"></i> {{ stats.xp }}/{{ stats.nextLevelXp }}</span>
      <span class="stat"><i class="fad fa-coins"></i> {{ stats.gp }}</span>
    </div>

    <section class="board-section">
      <h2 class="section-title">{{ t("family.phoneQuests") }}</h2>
      <p v-if="quests.length === 0" class="board-line" data-cy="no-quests">{{ t("family.phoneNoQuests") }}</p>
      <ul v-else class="quest-list">
        <li v-for="quest in quests" :key="quest.questId" class="quest-row rpg-box" :class="{ overdue: quest.overdue }" data-cy="phone-quest">
          <div class="quest-text">
            <span class="quest-name">{{ quest.name }}</span>
            <span class="quest-pay">+{{ quest.xp }} XP · +{{ quest.gp }} GP · +{{ quest.ap }} AP</span>
            <span v-if="quest.photo" class="quest-photo">{{ t("family.phonePhoto") }}</span>
          </div>
          <ion-button size="small" class="claim-btn" :disabled="claiming === quest.questId" data-cy="phone-claim" @click="claim(quest)">
            {{ t("family.phoneClaimDone") }}
          </ion-button>
        </li>
      </ul>
    </section>

    <section v-if="claims.length > 0" class="board-section">
      <h2 class="section-title">{{ t("family.phoneClaims") }}</h2>
      <ul class="claim-list">
        <li v-for="claim in claims" :key="claim.id" class="claim-row" :class="`is-${statusOf(claim)}`" data-cy="phone-claim-row">
          <span class="claim-name">{{ claim.questName }}</span>
          <span class="claim-status">{{ t(`family.claim.${statusOf(claim)}`) }}</span>
          <span v-if="claim.status === 'approved'" class="claim-paid">+{{ claim.paid.xp }} XP · +{{ claim.paid.gp }} GP</span>
          <span v-if="claim.note" class="claim-note">{{ claim.note }}</span>
        </li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
/**
 * A linked hero phone's board (two-phone play), shown once the family device has sent a sheet: the hero's numbers and the quests the family device says they can claim,
 * a Done button that claims one (kept on the phone until it is sent), and the claims with what became of them. The
 * phone shows what the family device sent; it never changes a number itself.
 */
import { computed, ref } from "vue";
import { IonButton, toastController } from "@ionic/vue";
import { play$fx } from "@/assets/fx";
import { rpgToastOptions } from "@/hooks/useToast";
import { useCopy } from "@/hooks/useVoice";
import type { SheetQuest } from "@/lib/services/multiplayer/heroSheet";
import { claimableQuests, isUnsent, type HeroPhoneState, type PhoneClaim } from "@/lib/services/multiplayer/phoneClaims";
import { useFamilyStore } from "@/lib/store/stores/family";
import debug from "@/lib/utils/debug";

const family = useFamilyStore();
const t = useCopy();
const claiming = ref("");

const state = computed<HeroPhoneState | null>(() => (family.phoneState as HeroPhoneState | undefined) ?? null);
const stats = computed(() => state.value?.sheet?.stats ?? null);
const quests = computed(() => (state.value ? claimableQuests(state.value) : []));
const claims = computed(() => state.value?.claims ?? []);

/** A waiting claim still on this phone reads "Not sent yet"; one on the server reads "Sent" */
const statusOf = (claim: PhoneClaim): string => {
  const isOnPhone = claim.status === "waiting" && state.value !== null && isUnsent(state.value, claim.id);
  return isOnPhone ? "unsent" : claim.status;
};

const sound = (key: string): void => {
  const canPlay = typeof play$fx === "function";
  if (canPlay) play$fx(key);
};

const say = async (message: string): Promise<void> => {
  const toast = await toastController.create(rpgToastOptions(message, 2400));
  await toast.present();
};

const claim = async (quest: SheetQuest): Promise<void> => {
  const isBusy = Boolean(claiming.value);
  if (isBusy) return;
  claiming.value = quest.questId;
  try {
    await family.claimOnPhone(quest);
    sound("select");
    const isOffline = typeof navigator !== "undefined" && navigator.onLine === false;
    const key = isOffline ? "family.phoneClaimOffline" : quest.needsApproval ? "family.phoneClaimed" : "family.phoneClaimedPaid";
    await say(t(key, { quest: quest.name }));
  } catch (error) {
    debug.warn("hero phone: the claim could not be kept", error);
    sound("no");
  } finally {
    claiming.value = "";
  }
};
</script>

<style scoped lang="scss" src="./_HeroPhoneBoard.scss"></style>

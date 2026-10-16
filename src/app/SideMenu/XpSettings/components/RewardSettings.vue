<template>
  <ion-page class="reward-settings xp-settings-page">
    <ion-header :translucent="true">
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <xp-back-button></xp-back-button>
        </ion-buttons>
        <ion-title>Rewards</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="rpg-box bg-slide ion-padding">
      <ion-card class="max-w-2xl">
        <ion-card-content>
          <p>Heroes spend GP in the shops, and Real Life rewards and cash outs wait in Approvals until a Game Master hands them over.</p>
        </ion-card-content>
      </ion-card>

      <ion-card class="max-w-2xl" data-cy="cash-out-settings">
        <ion-list>
          <ion-item-divider>
            <ion-label>Cash out GP</ion-label>
          </ion-item-divider>
          <ion-item>
            <ion-label>
              <h2>Let heroes cash out</h2>
              <p>Heroes trade GP for real money from their wallet; each one waits in Approvals for you</p>
            </ion-label>
            <ion-toggle
              :checked="cashOut.enabled"
              :disabled="!canManage"
              @ionChange="setCashOut({ enabled: $event.detail.checked })"
            ></ion-toggle>
          </ion-item>
          <ion-item :disabled="!cashOut.enabled || !canManage">
            <ion-label>
              <h2>Rate</h2>
              <p>How much GP makes $1</p>
            </ion-label>
            <ion-select
              slot="end"
              interface="popover"
              :value="cashOut.gpPerDollar"
              @ionChange="setCashOut({ gpPerDollar: Number($event.detail.value) })"
            >
              <ion-select-option
                v-for="rate in rates"
                :key="rate"
                :value="rate"
              >{{ rate }} GP = $1</ion-select-option>
            </ion-select>
          </ion-item>
          <ion-item-divider>
            <ion-label>Heroes who can cash out</ion-label>
          </ion-item-divider>
          <ion-item
            v-for="(hero, index) in heroes"
            :key="hero.id"
            :lines="index === heroes.length - 1 ? 'none' : undefined"
            :disabled="!cashOut.enabled || !canManage"
          >
            <ion-checkbox
              slot="start"
              :checked="isPicked(hero.id)"
              @ionChange="toggleHero(hero.id, $event.detail.checked)"
            ></ion-checkbox>
            <ion-label><h2>{{ heroName(hero) }}</h2></ion-label>
          </ion-item>
          <ion-item
            v-if="!heroes.length"
            lines="none"
          >
            <ion-label><p>No heroes yet.</p></ion-label>
          </ion-item>
        </ion-list>
        <ion-card-content class="reward-settings__note">
          <p>{{ cashOut.heroIds.length ? "Only the ticked heroes can cash out." : "Every hero can cash out. Tick some to limit it to them." }}</p>
        </ion-card-content>
      </ion-card>

      <xp-coming-soon-card :items="items" />
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import {
  IonButtons,
  IonCard,
  IonCardContent,
  IonCheckbox,
  IonContent,
  IonHeader,
  IonItem,
  IonItemDivider,
  IonLabel,
  IonList,
  IonPage,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToggle,
  IonToolbar,
} from "@ionic/vue";
import XpComingSoonCard from "./XpComingSoonCard.vue";
import { REWARD_COMING_SOON } from "./comingSoon";
import { useUserStore } from "@/lib/store/stores/user";
import { canManageFamily } from "@/router/_Guards/gm.guard";
import { heroName } from "@/lib/services/gp/gpGifts";
import {
  CASH_OUT_RATES,
  DEFAULT_FAMILY_SETTINGS,
  loadFamilySettings,
  saveFamilySettings,
  type CashOutSettings,
  type FamilySettings,
} from "@/lib/services/family/familySettings";

const items = REWARD_COMING_SOON;
const rates = CASH_OUT_RATES;

const userStore = useUserStore();
const canManage = computed(() => canManageFamily(userStore));
const heroes = computed(() => Object.values(userStore.users as Record<string, any>).filter((profile) => profile && !profile.isAdult));

const family = ref<FamilySettings>(JSON.parse(JSON.stringify(DEFAULT_FAMILY_SETTINGS)));
loadFamilySettings().then((loaded) => (family.value = loaded));
const cashOut = computed(() => family.value.cashOut);

/** Save a change to the cash out rules; only a Game Master can */
const setCashOut = (change: Partial<CashOutSettings>) => {
  if (!canManage.value) return;
  family.value = { ...family.value, cashOut: { ...family.value.cashOut, ...change } };
  void saveFamilySettings(family.value);
};

const isPicked = (heroId: string): boolean => cashOut.value.heroIds.includes(String(heroId));

const toggleHero = (heroId: string, picked: boolean) => {
  const others = cashOut.value.heroIds.filter((id) => id !== String(heroId));
  const isUnchanged = picked === isPicked(heroId);
  if (isUnchanged) return;
  setCashOut({ heroIds: picked ? [...others, String(heroId)] : others });
};
</script>

<style lang="scss" scoped>
.reward-settings__note p {
  margin: 0;
  font-size: 0.85rem;
  opacity: 0.8;
}
</style>

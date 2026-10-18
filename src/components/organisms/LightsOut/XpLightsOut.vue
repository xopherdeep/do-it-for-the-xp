<template>
  <div v-if="isAsleep" class="xp-lights-out" data-cy="lights-out" role="dialog" aria-modal="true" aria-labelledby="lights-out-title">
    <div class="xp-lights-out__stars" aria-hidden="true"></div>
    <div class="xp-lights-out__box rpg-box">
      <i class="fad fa-moon-stars xp-lights-out__moon" aria-hidden="true"></i>
      <h1 id="lights-out-title" class="xp-lights-out__title">Lights out</h1>
      <p class="xp-lights-out__line">Sleep well, {{ heroName }}. Your quests will keep until morning.</p>
      <p class="xp-lights-out__line">{{ wakeLine }}</p>
      <ion-button class="xp-lights-out__switch" fill="outline" @click="chooseProfile">
        <i class="fad fa-users mr-2" aria-hidden="true"></i>
        Choose a profile
      </ion-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { IonButton } from "@ionic/vue";
import { play$fx } from "@/assets/fx";
import { isLightsOut, wakeUpLine } from "@/lib/services/family/lightsOut";
import { useBattleStore } from "@/lib/store/stores/battle";
import { useGameRulesStore } from "@/lib/store/stores/gameRules";
import { useUserStore } from "@/lib/store/stores/user";
import { canManageFamily } from "@/router/_Guards/gm.guard";

/**
 * The family's bedtime (Settings > Family): a hero's screens sleep until the wake-up time. Game Masters are never put
 * to bed; "Choose a profile" goes to the profile chooser, where a Game Master can sign in.
 */
const CHECK_MS = 30 * 1000;

const router = useRouter();
const rules = useGameRulesStore();
const userStore = useUserStore();
const battleStore = useBattleStore();
void rules.load();

const now = ref(new Date());
let timer: number | undefined;
onMounted(() => {
  timer = window.setInterval(() => (now.value = new Date()), CHECK_MS);
});
onBeforeUnmount(() => window.clearInterval(timer));

const isAsleep = computed(() => {
  const route = router.currentRoute.value;
  return isLightsOut({
    bedtime: rules.bedtime,
    now: now.value,
    signedIn: Boolean(userStore.currentUser?.id && userStore.currentUser?.isAuthenticated),
    canManage: canManageFamily(userStore),
    isPublicScreen: route.meta?.requiresAuth === false || route.name === "log-in",
    inBattle: Boolean(battleStore.active),
  });
});

const heroName = computed(() => userStore.currentUser?.name?.nick || userStore.currentUser?.name?.full || "hero");
const wakeLine = computed(() => wakeUpLine(rules.bedtime));

const chooseProfile = () => {
  play$fx("select");
  void router.push({ name: "xp-profile" });
};
</script>

<style scoped lang="scss">
.xp-lights-out {
  position: fixed;
  inset: 0;
  z-index: 40000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: radial-gradient(ellipse at top, #1b2350 0%, #0a0d22 60%, #04050f 100%);
}

// A few pixel stars, twinkling slowly
.xp-lights-out__stars {
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(2px 2px at 12% 18%, #fff 50%, transparent 51%),
    radial-gradient(2px 2px at 72% 12%, #fff 50%, transparent 51%),
    radial-gradient(2px 2px at 40% 30%, #cfe3ff 50%, transparent 51%),
    radial-gradient(2px 2px at 85% 44%, #fff 50%, transparent 51%),
    radial-gradient(2px 2px at 22% 64%, #cfe3ff 50%, transparent 51%),
    radial-gradient(2px 2px at 60% 78%, #fff 50%, transparent 51%),
    radial-gradient(2px 2px at 90% 86%, #cfe3ff 50%, transparent 51%);
  animation: lights-out-twinkle 4s steps(2) infinite;
}

.xp-lights-out__box {
  position: relative;
  max-width: 360px;
  width: 100%;
  padding: 24px 20px;
  text-align: center;
}

.xp-lights-out__moon {
  font-size: 56px;
  --fa-primary-color: #ffe9a8;
  --fa-secondary-color: #fff7d6;
  margin-bottom: 8px;
}

.xp-lights-out__title {
  font-family: "StatusPlz", monospace;
  font-size: 1.6rem;
  margin: 4px 0 12px;
}

.xp-lights-out__line {
  margin: 0 0 8px;
  line-height: 1.4;
}

.xp-lights-out__switch {
  margin-top: 12px;
}

@keyframes lights-out-twinkle {
  50% {
    opacity: 0.55;
  }
}

@media (prefers-reduced-motion: reduce) {
  .xp-lights-out__stars {
    animation: none;
  }
}
</style>

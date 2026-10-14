<script setup lang="ts">
import { computed } from "vue";
import { alertController, toastController } from "@ionic/vue";
import { play$fx } from "@/assets/fx";
import { usePowerTimers } from "@/hooks/abilities/usePowerTimers";
import { useUserStore } from "@/lib/store/stores/user";

/**
 * "Game On · 24:13" on a hero's card in the Game Master's dashboard for each timed privilege the hero is using, with
 * an End action. Tapping it asks first; ending takes the time back at once and tells the hero who ended it.
 * Nothing draws for a hero with no timer running. The tap never reaches the card underneath, so it does not start a
 * masquerade.
 */
const props = defineProps<{ user: { id: string; name?: { nick?: string; first?: string } } }>();

const userStore = useUserStore();
const heroId = computed(() => String(props.user?.id ?? ""));
const heroName = computed(() => props.user?.name?.nick || props.user?.name?.first || "this hero");
const { timers, endEarly } = usePowerTimers(heroId, { quiet: true });

const end = async (abilityId: string, name: string) => {
  const ended = endEarly(abilityId, userStore.currentUser?.id ?? "");
  if (!ended) return;
  const toast = await toastController.create({
    message: `Ended ${heroName.value}'s ${name}.`,
    duration: 2500,
    position: "top",
    cssClass: "rpg-toast",
  });
  await toast.present();
};

const confirmEnd = async (abilityId: string, name: string, left: string) => {
  play$fx("cursor");
  const alert = await alertController.create({
    header: `End ${name}?`,
    message: `${heroName.value} has ${left} left. Ending it stops the timer now.`,
    buttons: [
      { text: "Let it run", role: "cancel" },
      { text: "End now", role: "confirm", handler: () => void end(abilityId, name) },
    ],
  });
  await alert.present();
};
</script>

<template>
  <button
    v-for="timer in timers"
    :key="timer.abilityId"
    type="button"
    class="gm-timer-chip"
    data-cy="gm-timer-chip"
    :aria-label="`${heroName} is using ${timer.name}, ${timer.left} left. End it now.`"
    @click.stop="confirmEnd(timer.abilityId, timer.name, timer.left)"
  >
    <span class="chip-line"><i class="fad fa-stopwatch" aria-hidden="true" /> {{ timer.name }} · {{ timer.left }}</span>
    <span class="chip-action">End</span>
  </button>
</template>

<style lang="scss" scoped>
.gm-timer-chip {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  max-width: 120px;
  margin-top: 6px;
  padding: 3px 8px;
  border: 1px solid rgba(255, 224, 102, 0.8);
  border-radius: 10px;
  background: rgba(27, 22, 64, 0.85);
  color: #fff;
  font-size: 10px;
  font-weight: 800;
  line-height: 1.2;
  letter-spacing: 0.4px;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
}

.chip-action {
  color: #ffe066;
  text-transform: uppercase;
}
</style>

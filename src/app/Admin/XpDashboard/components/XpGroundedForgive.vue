<script setup lang="ts">
import { computed } from "vue";
import { alertController, toastController } from "@ionic/vue";
import { play$fx } from "@/assets/fx";
import { hospitalBillOf } from "@/lib/services/gp/wallet";
import { forgiveBill } from "@/lib/services/hometown/hospitalAdmission";
import { useUserStore } from "@/lib/store/stores/user";

/**
 * "Grounded · ₲60 owed" on a hero's card in the Game Master's dashboard, with a Forgive action
 * (docs/Quest-Rooms-Spec.md 5.8). Tapping it asks first; forgiving wipes the bill, lifts the grounding, tells the hero
 * and logs "Dad forgave Mia's hospital bill (₲60)." in the family chat. Nothing draws for a hero who owes nothing.
 * The tap never reaches the card underneath, so it does not start a masquerade.
 */
const props = defineProps<{ user: { id: string; name?: { nick?: string; first?: string }; stats?: { gp?: { hospitalBill?: number } | null } | null } }>();

const userStore = useUserStore();
const bill = computed(() => hospitalBillOf(props.user?.stats?.gp));
const heroName = computed(() => props.user?.name?.nick || props.user?.name?.first || "this hero");

const forgive = async () => {
  // The Game Master on this device; a masquerade changes who is signed in, so the chat names whoever is
  const forgiven = forgiveBill(props.user.id, userStore.currentUser?.id ?? "");
  const isNothingForgiven = forgiven <= 0;
  if (isNothingForgiven) return;
  play$fx("select");
  const toast = await toastController.create({
    message: `Forgave ${heroName.value}'s ₲${forgiven} hospital bill.`,
    duration: 2500,
    position: "top",
    cssClass: "rpg-toast",
  });
  await toast.present();
};

const confirmForgive = async () => {
  play$fx("cursor");
  const alert = await alertController.create({
    header: "Forgive the bill?",
    message: `${heroName.value} owes the Hospital ₲${bill.value}. Forgiving it lifts the grounding right away.`,
    buttons: [
      { text: "Keep grounded", role: "cancel" },
      { text: "Forgive", role: "confirm", handler: () => void forgive() },
    ],
  });
  await alert.present();
};
</script>

<template>
  <button
    v-if="bill > 0"
    type="button"
    class="gm-grounded-chip"
    data-cy="gm-grounded-chip"
    :aria-label="`${heroName} is grounded and owes ${bill} gold. Forgive the bill.`"
    @click.stop="confirmForgive"
  >
    <span class="chip-line"><i class="fad fa-hospital" aria-hidden="true" /> Grounded · ₲{{ bill }} owed</span>
    <span class="chip-action">Forgive</span>
  </button>
</template>

<style lang="scss" scoped>
.gm-grounded-chip {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  max-width: 120px;
  margin-top: 6px;
  padding: 3px 8px;
  border: 1px solid rgba(255, 180, 180, 0.7);
  border-radius: 10px;
  background: rgba(150, 25, 25, 0.75);
  color: #fff;
  font-size: 10px;
  font-weight: 800;
  line-height: 1.2;
  letter-spacing: 0.4px;
  cursor: pointer;

  .chip-action {
    color: #ffe9a8;
    text-decoration: underline;
  }
}
</style>

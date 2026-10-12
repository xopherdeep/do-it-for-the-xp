<template>
  <div class="pro-upsell">
    <div class="pro-upsell__icon"><i class="fad fa-crown"></i></div>
    <p class="pro-upsell__text">
      <strong>{{ PRO_GATE_NAMES[gate] }}</strong> is part of XP Pro.
    </p>
    <p class="pro-upsell__sub">
      Heroes, custom quests and custom beasts stay free forever.
    </p>
    <div class="pro-upsell__buttons">
      <ion-button class="pro-upsell__not-now" @click="notNow">Not now</ion-button>
      <ion-button class="pro-upsell__see" @click="seePro">See XP Pro</ion-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import { IonButton, modalController } from "@ionic/vue";
import { useRouter } from "vue-router";
import { play$fx } from "@/assets/fx";
import { PRO_GATE_NAMES, ProGate } from "@/lib/services/pro/proPlans";

defineProps<{ gate: ProGate }>();

const router = useRouter();

onMounted(() => {
  play$fx("openMenu");
});

async function seePro() {
  await modalController.dismiss(undefined, "see");
  router.push("/pro");
}

async function notNow() {
  play$fx("no");
  await modalController.dismiss(undefined, "cancel");
}
</script>

<style lang="scss" scoped>
.pro-upsell {
  padding: 24px 20px 20px;
  text-align: center;
  color: #fff;
  background: linear-gradient(180deg, #2a2354, #14102e);
  border: 3px solid #f5c542;
  border-radius: 12px;

  &__icon {
    font-size: 2.4rem;
    color: #f5c542;
    margin-bottom: 8px;
  }

  &__text {
    font-size: 1.15rem;
    margin: 0 0 6px;
  }

  &__sub {
    font-size: 0.85rem;
    opacity: 0.7;
    margin: 0 0 18px;
  }

  &__buttons {
    display: flex;
    gap: 10px;

    ion-button {
      flex: 1;
      height: 46px;
      font-weight: 600;
    }
  }

  &__see {
    --background: linear-gradient(135deg, #f5c542, #e08a1e);
    --color: #1a1333;
  }

  &__not-now {
    --background: rgba(255, 255, 255, 0.12);
  }
}
</style>

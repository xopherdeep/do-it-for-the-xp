<template>
  <div
    class="xp-license-card"
    :class="`is-${tier}`"
    :style="tiltStyle"
    data-cy="license-card"
    @pointermove="tilt"
    @pointerleave="untilt"
  >
    <div class="xp-license-card__art" aria-hidden="true">
      <div class="xp-license-card__emblem">XP</div>
    </div>
    <div class="xp-license-card__face">
      <header class="xp-license-card__top">
        <div class="xp-license-card__brand">
          <span class="xp-license-card__coin" aria-hidden="true"><i class="fad fa-crown"></i></span>
          <span class="xp-license-card__names">
            <span class="xp-license-card__wordmark">XP Pro</span>
            <span class="xp-license-card__caption">Game Master License</span>
          </span>
        </div>
      </header>

      <div class="xp-license-card__middle">
        <div class="xp-license-card__chip" aria-hidden="true"></div>
        <span class="xp-license-card__tier" data-cy="pro-tier">
          <span class="xp-license-card__stars" aria-hidden="true">{{ "★".repeat(stars) }}</span>
          {{ planLabel }}
        </span>
      </div>

      <div class="xp-license-card__key">
        <span class="xp-license-card__label">License key</span>
        <span class="xp-license-card__key-row">
          <span class="xp-license-card__digits" data-cy="pro-masked-key" :aria-label="maskedKey">{{ cardKey }}</span>
          <button type="button" class="xp-license-card__copy" aria-label="Copy license key" @click="emit('copy')">
            <i class="fad fa-copy" aria-hidden="true"></i>
          </button>
        </span>
      </div>

      <footer class="xp-license-card__bottom">
        <div v-if="memberSince">
          <span class="xp-license-card__label">Member since</span>
          <span class="xp-license-card__value" data-cy="pro-member-since">{{ memberSince }}</span>
        </div>
        <div class="xp-license-card__thru">
          <span class="xp-license-card__label">{{ tier === "lifetime" ? "Valid thru" : "Renews" }}</span>
          <span class="xp-license-card__value">
            <template v-if="tier === 'lifetime'"><i class="fad fa-infinity" aria-hidden="true"></i> Forever</template>
            <!-- chemx-allow: TYPOGRAPHY_EM_DASH the dash is the card's printed blank for a date not known yet -->
            <template v-else>{{ validThru || "—" }}</template>
          </span>
        </div>
      </footer>
    </div>
    <div class="xp-license-card__holo" aria-hidden="true"></div>
    <div class="xp-license-card__sheen" aria-hidden="true"></div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";

const props = defineProps<{
  plan: string | null;
  planLabel: string;
  maskedKey: string;
  memberSince?: string;
  validThru?: string;
}>();
const emit = defineEmits<{ (e: "copy"): void }>();

/** The hidden groups as dots, the way a bank card hides its digits. */
const cardKey = computed(() => props.maskedKey.replace(/\*/g, "•"));

/** Rarity of the card: Lifetime is the gold one. */
const TIERS: Record<string, number> = { monthly: 1, yearly: 2, lifetime: 3 };
const tier = computed(() => (props.plan && TIERS[props.plan] ? props.plan : "monthly"));
const stars = computed(() => TIERS[tier.value]);

/** Tilt toward the finger or pointer, like turning a foil card in the light. */
const rx = ref(0);
const ry = ref(0);
function tilt(e: PointerEvent) {
  const box = (e.currentTarget as HTMLElement).getBoundingClientRect();
  const x = (e.clientX - box.left) / box.width - 0.5;
  const y = (e.clientY - box.top) / box.height - 0.5;
  rx.value = Math.round(-y * 10);
  ry.value = Math.round(x * 14);
}
function untilt() {
  rx.value = 0;
  ry.value = 0;
}
const tiltStyle = computed(() => ({ "--lc-rx": `${rx.value}deg`, "--lc-ry": `${ry.value}deg` }));
</script>

<style lang="scss" src="./_XpLicenseCard.scss" />

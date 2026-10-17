<template>
  <div
    class="xp-streak-card"
    :class="[`is-${model.tier}`, `is-${model.status}`]"
    :style="tiltStyle"
    data-cy="streak-card"
    @pointermove="tilt"
    @pointerleave="untilt"
  >
    <div class="xp-streak-card__art" aria-hidden="true">
      <i class="fad fa-fire xp-streak-card__watermark" />
    </div>
    <div class="xp-streak-card__embers" aria-hidden="true">
      <span v-for="n in 8" :key="n" class="xp-streak-card__ember" />
    </div>
    <div class="xp-streak-card__face">
      <header class="xp-streak-card__top">
        <span class="xp-streak-card__names">
          <span class="xp-streak-card__wordmark">Daily Streak</span>
          <span class="xp-streak-card__caption">{{ model.title }}</span>
        </span>
        <span class="xp-streak-card__status" data-cy="streak-status">{{ model.statusLabel }}</span>
      </header>

      <div class="xp-streak-card__hero">
        <span class="xp-streak-card__flame" aria-hidden="true"><i class="fad fa-fire" /></span>
        <span class="xp-streak-card__count" data-cy="streak-days">{{ model.days }}</span>
        <span class="xp-streak-card__unit">{{ model.days === 1 ? "DAY" : "DAYS" }}</span>
      </div>
      <div class="xp-streak-card__stars" :aria-label="`${model.stars} of 5 stars`">
        <span v-for="n in 5" :key="n" :class="{ lit: n <= model.stars }" aria-hidden="true">★</span>
      </div>

      <p v-if="model.lostNote" class="xp-streak-card__lost">{{ model.lostNote }}</p>
      <div v-else class="xp-streak-card__road" data-cy="streak-road">
        <span class="xp-streak-card__label">Next chest, day {{ model.chest.day }}</span>
        <span class="xp-streak-card__bar" role="progressbar" :aria-valuenow="model.chest.percent" aria-valuemin="0" aria-valuemax="100">
          <span class="xp-streak-card__fill" :style="fillStyle" />
          <i class="fad fa-treasure-chest xp-streak-card__chest" aria-hidden="true" />
        </span>
        <span class="xp-streak-card__prize">
          {{ model.chest.toGo }} {{ model.chest.toGo === 1 ? "day" : "days" }} to go: +{{ model.chest.xp }} XP, +{{ model.chest.gp }} GP
        </span>
      </div>

      <footer class="xp-streak-card__bottom">
        <div>
          <span class="xp-streak-card__label">Shields</span>
          <span class="xp-streak-card__shields" data-cy="streak-shields">
            <i v-for="(slot, i) in model.shields" :key="i" class="fad fa-shield" :class="{ empty: !slot.filled }" />
            <small v-if="model.shieldIn !== null">in {{ model.shieldIn }}d</small>
          </span>
        </div>
        <div class="xp-streak-card__best">
          <span class="xp-streak-card__label">Best</span>
          <span class="xp-streak-card__value">
            <i v-if="model.isRecord" class="fad fa-crown" aria-hidden="true" /> {{ model.best }}
          </span>
        </div>
      </footer>
    </div>
    <div class="xp-streak-card__holo" aria-hidden="true" />
    <div class="xp-streak-card__sheen" aria-hidden="true" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import type { StreakCardModel } from "@/lib/services/streaks/streakCard";

interface XpStreakCardProps {
  model: StreakCardModel;
}

const props = defineProps<XpStreakCardProps>();

/** The card leans toward the finger, like the license card */
const rx = ref(0);
const ry = ref(0);
const tilt = (event: PointerEvent): void => {
  const box = (event.currentTarget as HTMLElement).getBoundingClientRect();
  ry.value = ((event.clientX - box.left) / box.width - 0.5) * 14;
  rx.value = -((event.clientY - box.top) / box.height - 0.5) * 14;
};
const untilt = (): void => {
  rx.value = 0;
  ry.value = 0;
};
const fillStyle = computed(() => ({ width: `${props.model.chest.percent}%` }));
const tiltStyle = computed(() => ({ "--sc-rx": `${rx.value}deg`, "--sc-ry": `${ry.value}deg` }));
</script>

<style lang="scss" src="./_XpStreakCard.scss" />

<template>
  <transition name="item-fanfare">
    <div
      v-if="fanfare"
      :key="fanfare.key"
      class="item-fanfare"
      :class="`item-fanfare--${fanfare.kind}`"
      :style="{ '--fanfare-glow': glow }"
      role="status"
      data-cy="item-fanfare"
      @click="emit('dismiss')"
    >
      <div class="item-fanfare__dim" />
      <!-- Rays turning behind the item, in hard steps -->
      <div class="item-fanfare__rays" />
      <div class="item-fanfare__flash" />
      <div class="item-fanfare__item">
        <i class="fad" :class="icon" aria-hidden="true" />
      </div>
      <!-- Sparks burst off the item: each arm is turned once, and only its spark moves -->
      <span v-for="spark in SPARKS" :key="spark" class="item-fanfare__arm" :class="`item-fanfare__arm--${spark}`">
        <span class="item-fanfare__spark" />
      </span>
      <div class="item-fanfare__caption">
        <span class="item-fanfare__title">{{ fanfare.title }}</span>
        <span v-if="fanfare.line" class="item-fanfare__line">{{ fanfare.line }}</span>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { ItemFanfare } from "../templeGrounds/useItemFanfare";
import { templeGlow } from "./templeGlow";

const props = defineProps<{ fanfare: ItemFanfare | null; element?: string }>();
const emit = defineEmits<{ (e: "dismiss"): void }>();

const ICONS: Record<ItemFanfare["kind"], string> = {
  key: "fa-key",
  "boss-key": "fa-key",
  map: "fa-map",
  compass: "fa-compass",
};

const SPARKS = [1, 2, 3, 4, 5, 6, 7, 8];

const glow = computed(() => templeGlow(props.element));
const icon = computed(() => ICONS[props.fanfare?.kind ?? "key"]);
</script>

<style lang="scss" scoped>
.item-fanfare {
  position: absolute;
  inset: 0;
  z-index: 1001; /* above the room's move buttons */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;

  &__dim {
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at 50% 45%, transparent 0%, rgba(0, 0, 0, 0.55) 45%, rgba(0, 0, 0, 0.85) 100%);
    animation: item-fanfare-fade 300ms steps(4, end) both;
  }

  &__rays {
    position: absolute;
    left: 50%;
    top: 45%;
    width: 520px;
    height: 520px;
    margin: -260px 0 0 -260px;
    background: repeating-conic-gradient(from 0deg, var(--fanfare-glow) 0deg 8deg, transparent 8deg 30deg);
    mask-image: radial-gradient(circle, #000 0%, transparent 65%);
    -webkit-mask-image: radial-gradient(circle, #000 0%, transparent 65%);
    opacity: 0.55;
    animation: item-fanfare-spin 2400ms steps(24, end) both, item-fanfare-fade 300ms steps(4, end) both;
  }

  &__flash {
    position: absolute;
    inset: 0;
    background: var(--fanfare-glow);
    opacity: 0;
    animation: item-fanfare-flash 360ms steps(4, end) both;
  }

  /* The item rises out of the hero's hands and hangs over them */
  &__item {
    position: relative;
    margin-top: -6vh;
    font-size: 72px;
    line-height: 1;
    filter: drop-shadow(0 0 14px var(--fanfare-glow)) drop-shadow(4px 4px 0 #000);
    animation: item-fanfare-rise 600ms steps(8, end) both, item-fanfare-bob 1200ms steps(4, end) 600ms infinite;

    i {
      --fa-primary-color: #f3f6ff;
      --fa-secondary-color: #9aa6c4;
      --fa-secondary-opacity: 1;
    }
  }

  &--boss-key &__item {
    font-size: 96px;

    i {
      --fa-primary-color: #ffe27a;
      --fa-secondary-color: #d08a1c;
    }
  }

  &--map &__item i,
  &--compass &__item i {
    --fa-primary-color: #fff1c9;
    --fa-secondary-color: #b9864a;
  }

  /* Sparks bursting off the item as it lands */
  &__arm {
    position: absolute;
    left: 50%;
    top: 40%;
    width: 0;
    height: 0;
  }

  @for $i from 1 through 8 {
    &__arm--#{$i} {
      transform: rotate(#{($i - 1) * 45deg});
    }
  }

  &__spark {
    position: absolute;
    width: 8px;
    height: 8px;
    margin: -4px 0 0 -4px;
    background: #fff;
    border: 2px solid var(--fanfare-glow);
    opacity: 0;
    will-change: transform, opacity;
    animation: item-fanfare-spark 700ms steps(8, end) 420ms both;
  }

  &__caption {
    position: relative;
    margin-top: 28px;
    padding: 10px 18px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    background: rgba(8, 10, 24, 0.9);
    border: 3px solid var(--fanfare-glow);
    box-shadow: 4px 4px 0 #000;
    animation: item-fanfare-caption 300ms steps(4, end) 480ms both;
  }

  &__title {
    font-family: "StatusPlz", var(--gs-font, monospace);
    font-size: clamp(20px, 7vw, 28px);
    letter-spacing: 2px;
    text-transform: uppercase;
    color: #fff;
    text-shadow: 3px 3px 0 #000, 0 0 10px var(--fanfare-glow);
  }

  &__line {
    font-family: "StatusPlz", var(--gs-font, monospace);
    font-size: 14px;
    color: var(--fanfare-glow);
    text-align: center;
  }
}

.item-fanfare-leave-active {
  transition: opacity 0.3s steps(4, end);
}

.item-fanfare-leave-to {
  opacity: 0;
}

@keyframes item-fanfare-fade {
  from { opacity: 0; }
}

@keyframes item-fanfare-flash {
  0% { opacity: 0; }
  30% { opacity: 0.7; }
  100% { opacity: 0; }
}

@keyframes item-fanfare-spin {
  to { transform: rotate(90deg); }
}

@keyframes item-fanfare-rise {
  0% { opacity: 0; transform: translateY(80px) scale(0.4); }
  70% { opacity: 1; transform: translateY(-10px) scale(1.15); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes item-fanfare-bob {
  50% { transform: translateY(-6px); }
}

@keyframes item-fanfare-spark {
  0% { opacity: 1; transform: translate3d(0, 0, 0); }
  100% { opacity: 0; transform: translate3d(110px, 0, 0); }
}

@keyframes item-fanfare-caption {
  from { opacity: 0; transform: scaleY(0); }
  to { opacity: 1; transform: none; }
}

@media (prefers-reduced-motion: reduce) {
  .item-fanfare__dim,
  .item-fanfare__rays,
  .item-fanfare__flash,
  .item-fanfare__item,
  .item-fanfare__caption {
    animation: none;
  }

  .item-fanfare__spark {
    display: none;
  }
}
</style>

<template>
  <Transition name="backdrop-fade">
    <div v-if="show" class="xp-blur-backdrop" :style="backdropStyle" @click="$emit('close')" />
  </Transition>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';

export default defineComponent({
  name: 'XpBlurBackdrop',
  props: {
    show: {
      type: Boolean,
      required: true
    },
    blur: {
      type: Number,
      default: 8
    },
    opacity: {
      type: Number,
      default: 0.2
    },
    zIndex: {
      type: Number,
      default: 2000
    }
  },
  emits: ['close'],
  setup(props) {
    const backdropStyle = computed(() => ({
      backdropFilter: `blur(${props.blur}px)`,
      WebkitBackdropFilter: `blur(${props.blur}px)`,
      background: `rgba(0, 0, 0, ${props.opacity})`,
      zIndex: props.zIndex
    }));

    return { backdropStyle };
  }
});
</script>

<style lang="scss" scoped>
.xp-blur-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  cursor: pointer;
}

// Fade transition
.backdrop-fade-enter-active,
.backdrop-fade-leave-active {
  transition: opacity 0.2s ease;
}

.backdrop-fade-enter-from,
.backdrop-fade-leave-to {
  opacity: 0;
}
</style>

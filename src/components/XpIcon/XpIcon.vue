<template>
  <i 
    class="fad" 
    :class="[`fa-${icon}`, colorClass, sizeClass]"
    :style="customStyle"
  ></i>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue';

export default defineComponent({
  name: 'xp-icon',
  props: {
    icon: {
      type: String,
      required: true
    },
    primary: {
      type: String,
      default: null
    },
    secondary: {
      type: String,
      default: null
    },
    size: {
      type: String,
      default: '1x'
    }
  },
  setup(props) {
    const customStyle = computed(() => {
      const style: Record<string, string> = {};
      
      if (props.primary) {
        style['--fa-primary-color'] = `var(--xp-color-${props.primary})`;
      }
      if (props.secondary) {
        style['--fa-secondary-color'] = `var(--xp-color-${props.secondary})`;
        style['--fa-secondary-opacity'] = '1';
      }
      
      return style;
    });

    const sizeClass = computed(() => `fa-${props.size}`);

    return {
      customStyle,
      sizeClass
    };
  }
});
</script>

<style lang="scss" scoped>
.fad {
  display: inline-block;
  text-align: center;
}</style>
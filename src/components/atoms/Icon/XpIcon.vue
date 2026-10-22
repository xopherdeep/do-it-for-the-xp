<template>
  <i 
    class="fad" 
    :class="[`fa-${iconName}`, sizeClass]"
    :style="customStyle"
  ></i>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue';
import { faIconName } from '@/lib/services/items/faIcons';

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
      
      const primary = props.primary;
      if (primary) {
        style['--fa-primary-color'] = `var(--xp-color-${primary})`;
      }
      const secondary = props.secondary;
      if (secondary) {
        style['--fa-secondary-color'] = `var(--xp-color-${secondary})`;
        style['--fa-secondary-opacity'] = '1';
      }
      
      return style;
    });

    const sizeClass = computed(() => `fa-${props.size}`);
    /** The glyph the vendored Font Awesome 5 has for this name */
    const iconName = computed(() => faIconName(props.icon));

    return {
      customStyle,
      iconName,
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
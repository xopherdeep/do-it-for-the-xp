<template>
  <div class="temple-title">
    <div class="title-main">
      <i :class="['fad', iconClass, 'temple-icon']"></i>
      <h1 class="temple-name">{{ displayName }}</h1>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, inject } from 'vue';
import { TEMPLE_METADATA } from '@/lib/engine/temples/templeRegistry';
import { TempleDataInjectionKey } from '../../hooks/useTempleData';

export default defineComponent({
  name: 'XpTempleTitle',
  components: { },
  props: {
    templeId: { type: String, required: true }
  },
  setup(props) {
    // Try to inject shared temple data from parent (XpTempleSettings)
    const templeData = inject(TempleDataInjectionKey, null);

    // Fallback metadata from registry
    const registryMetadata = computed(() => {
      return TEMPLE_METADATA[props.templeId] || {
        name: props.templeId,
        icon: 'fa-dungeon'
      };
    });

    // Display name: DB customName > registry name > templeId
    const displayName = computed(() => {
      // Use injected data if available
      if (templeData?.temple?.value?.customName) {
        return templeData.temple.value.customName;
      }
      return registryMetadata.value.name;
    });

    // Icon: DB customIcon > registry icon > fallback
    const iconClass = computed(() => {
      // Check injected data for custom icon first
      const customIcon = templeData?.temple?.value?.customIcon;
      if (customIcon) {
        // Strip any prefix if present
        return customIcon.replace(/^(fad|fas|fal|far)\s+/, '');
      }
      return registryMetadata.value.icon;
    });

    return { displayName, iconClass };
  }
});
</script>

<style lang="scss" scoped>
  .temple-title {
    position: relative;
    text-align: center;
    padding: 1rem 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;

    .title-main {
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .title-actions {
      display: flex;
      gap: 12px;

      ion-button {
        --padding-start: 12px;
        --padding-end: 12px;
        color: rgba(255, 255, 255, 0.3);
        font-size: 1.1rem;
        transition: all 0.2s;

        &:hover {
          color: var(--ion-color-primary);
          transform: scale(1.1);
        }
      }
    }

    .temple-icon {
      font-size: 3rem;
      color: var(--ion-color-primary);
      filter: drop-shadow(0 0 20px rgba(var(--ion-color-primary-rgb), 0.5));
      margin-bottom: 0.5rem;
      display: block;
    }

    .temple-name {
      font-family: "Twoson", serif;
      font-size: 1.8rem;
      color: #fff;
      text-transform: uppercase;
      letter-spacing: 3px;
      text-shadow: 2px 2px 0 rgba(0, 0, 0, 0.8);
      margin: 0;
    }
  }
</style>

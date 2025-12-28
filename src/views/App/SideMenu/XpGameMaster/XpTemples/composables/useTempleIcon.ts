/**
 * useTempleIcon - Composable for getting temple icon consistently
 * 
 * Uses TEMPLE_METADATA as the single source of truth for temple icons.
 * Returns icon class without prefix (e.g., "fa-wind") for use with fad/fas class.
 */
import { computed, inject, ComputedRef } from 'vue';
import { TEMPLE_METADATA } from '@/lib/engine/temples/templeRegistry';
import { TempleDataInjectionKey } from './useTempleData';

export interface UseTempleIconReturn {
  /** Icon class without prefix (e.g., "fa-wind") */
  iconClass: ComputedRef<string>;
  /** Icon class with fad prefix (e.g., "fad fa-wind") */
  iconClassFull: ComputedRef<string>;
}

export function useTempleIcon(templeId: string): UseTempleIconReturn {
  // Try to inject shared temple data for potential custom icons in the future
  const templeData = inject(TempleDataInjectionKey, null);

  // Get icon from TEMPLE_METADATA - this is the source of truth
  const iconClass = computed(() => {
    // First check injected data for any custom icon
    if (templeData?.temple?.value?.customIcon) {
      const customIcon = templeData.temple.value.customIcon;
      // Strip prefix if present
      return customIcon.replace(/^(fad|fas|fal|far)\s+/, '');
    }
    
    // Use registry metadata
    const meta = TEMPLE_METADATA[templeId];
    if (meta?.icon) {
      return meta.icon; // Already in "fa-wind" format
    }
    
    // Fallback to generic dungeon icon
    return 'fa-dungeon';
  });

  const iconClassFull = computed(() => `fad ${iconClass.value}`);

  return {
    iconClass,
    iconClassFull
  };
}

/**
 * Helper function to get temple icon class synchronously
 * For use in computed properties where injection isn't available
 */
export function getTempleIconClass(templeId: string): string {
  const meta = TEMPLE_METADATA[templeId];
  if (meta?.icon) {
    return meta.icon; // Already in "fa-wind" format
  }
  return 'fa-dungeon';
}

/**
 * Helper function to get temple icon class with prefix
 */
export function getTempleIconClassFull(templeId: string): string {
  return `fad ${getTempleIconClass(templeId)}`;
}

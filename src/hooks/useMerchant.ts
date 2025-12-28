/**
 * useMerchant - Traveling Merchant Hook
 * 
 * Manages the traveling merchant that appears in different areas
 * based on the day of the week.
 */

import { computed } from 'vue';
import { useRouter } from 'vue-router';

// ============================================
// MERCHANT CONFIG
// ============================================

interface MerchantConfig {
  label: string;
  faIcon: string;
  travels: Record<string, string>;
}

const MERCHANT_CONFIG: MerchantConfig = {
  label: "Boobeedeedle",
  faIcon: "wagon-covered",
  travels: {
    sunday: 'world-plains',
    monday: 'world-islands',
    tuesday: 'world-forest',
    wednesday: 'world-swamps',
    thursday: 'world-mountains',
    friday: 'world-sands',
    saturday: 'world-ice',
  },
};

// ============================================
// COMPOSABLE
// ============================================

export function useMerchant() {
  const router = useRouter();
  
  // Current day of the week
  const dayOfTheWeek = computed(() => {
    const today = new Date();
    return today
      .toLocaleDateString('en-US', { weekday: 'long' })
      .toLowerCase();
  });
  
  // Where is the merchant today?
  const merchantLocation = computed(() => {
    return MERCHANT_CONFIG.travels[dayOfTheWeek.value];
  });
  
  // Check if merchant is in a specific area
  const isMerchantInArea = (area: string): boolean => {
    return merchantLocation.value === area;
  };
  
  // Navigate to merchant shop
  const visitMerchant = () => {
    router.push({
      name: "shop",
      params: { merchant: "traveling-merchant" }
    });
  };
  
  // Get merchant action for user actions menu
  const getMerchantAction = () => ({
    label: MERCHANT_CONFIG.label,
    faIcon: MERCHANT_CONFIG.faIcon,
    side: 'start',
    click: visitMerchant,
  });
  
  // Conditionally add merchant to actions if in area
  const maybeAddMerchantToActions = (actions: any[], area: string) => {
    if (isMerchantInArea(area)) {
      actions.push(getMerchantAction());
    }
    return actions;
  };
  
  return {
    // State
    merchantConfig: MERCHANT_CONFIG,
    dayOfTheWeek,
    merchantLocation,
    
    // Methods
    isMerchantInArea,
    visitMerchant,
    getMerchantAction,
    maybeAddMerchantToActions,
  };
}

export default useMerchant;

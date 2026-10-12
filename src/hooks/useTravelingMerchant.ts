import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { isMerchantIn, merchantWorldOn } from '@/lib/services/shops/travelingMerchant'

// Boobeedeedle turns up in a different world every day (src/lib/services/shops/travelingMerchant.ts);
// the world pages show the balloon itself (XpTravelingMerchant), this hook offers the shop as a page action.
export const useTravelingMerchant = () => {
  const router = useRouter()

  const merchant = {
    label: "Boobeedeedle",
    faIcon: "wagon-covered",
    side: "bottom",
  }

  // The page area the merchant is in today ("world-forest")
  const areaWhereMerchantIs = computed(() => `world-${merchantWorldOn()}`)

  const isMerchantInArea = (area: string) => isMerchantIn(area)

  const goToMerchantShop = () => {
    router.push({
      name: "shop",
      params: {
        merchant: "traveling-merchant"
      }
    })
  }

  const merchantAction = computed(() => ({
    ...merchant,
    click: goToMerchantShop
  }))

  function maybeAddMerchantToActionsIfInArea(payload: { actions: any[], area: string }) {
    if (isMerchantInArea(payload.area)) {
      payload.actions.push(merchantAction.value)
    }
  }

  return {
    merchant,
    areaWhereMerchantIs,
    isMerchantInArea,
    merchantAction,
    maybeAddMerchantToActionsIfInArea,
    goToMerchantShop
  }
}

import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

export const useTravelingMerchant = () => {
  const router = useRouter()

  const merchant = ref({
    label: "Boobeedeedle",
    faIcon: "wagon-covered",
    side: "bottom",
    travels: {
      sunday: 'world-plains',
      monday: 'world-islands',
      tuesday: 'world-forest',
      wednesday: 'world-swamps',
      thursday: 'world-mountains',
      friday: 'world-sands',
      saturday: 'world-ice',
    } as Record<string, string>,
  })

  const dayOfTheWeek = computed(() => {
    const today = new Date()
    return today
      .toLocaleDateString('en-US', { weekday: 'long' })
      .toLowerCase()
  })

  const areaWhereMerchantIs = computed(() => {
    return merchant.value.travels[dayOfTheWeek.value]
  })

  const isMerchantInArea = (area: string) => {
    return areaWhereMerchantIs.value === area
  }

  const goToMerchantShop = () => {
    router.push({
      name: "shop",
      params: {
        merchant: "traveling-merchant"
      }
    })
  }

  const merchantAction = computed(() => {
    const { label, faIcon, side } = merchant.value
    return {
      label,
      side,
      faIcon,
      click: goToMerchantShop
    }
  })

  function maybeAddMerchantToActionsIfInArea(payload: { actions: any[], area: string }) {
    if (isMerchantInArea(payload.area)) {
      payload.actions.push(merchantAction.value)
    }
  }

  return {
    merchant,
    dayOfTheWeek,
    areaWhereMerchantIs,
    isMerchantInArea,
    merchantAction,
    maybeAddMerchantToActionsIfInArea,
    goToMerchantShop
  }
}

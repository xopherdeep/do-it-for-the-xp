import { computed } from 'vue'
import { useGameStore } from "@/lib/store/stores/game"
import { useTravelingMerchant } from "@/hooks/useTravelingMerchant"

export const useUserActions = () => {
  const gameStore = useGameStore()
  const { maybeAddMerchantToActionsIfInArea } = useTravelingMerchant()

  const userActions = computed(() => gameStore.userActions)

  const setUserActions = (actions: any[]) => {
    gameStore.setUserActions(actions)
  }

  const setActions = (area: string, baseActions: any[] = []) => {
    // Create a copy to avoid mutating the original array
    const actions = [...baseActions]

    // Add merchant if applicable
    maybeAddMerchantToActionsIfInArea({ actions, area })

    // Commit to store
    setUserActions(actions)
  }

  return {
    userActions,
    setUserActions,
    setActions
  }
}

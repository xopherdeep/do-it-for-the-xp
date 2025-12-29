import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useGameStore } from "@/lib/store/stores/game"
import { useUserStore } from "@/lib/store/stores/user"
import { useTravelingMerchant } from "@/hooks/useTravelingMerchant"

export const useUserActions = () => {
  const route = useRoute()
  const gameStore = useGameStore()
  const userStore = useUserStore()
  const { maybeAddMerchantToActionsIfInArea } = useTravelingMerchant()

  const userId = computed(() => route.params.userId as string)
  const user = computed(() => userStore.getUserById(userId.value))
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
    userId,
    user,
    userActions,
    setUserActions,
    setActions
  }
}

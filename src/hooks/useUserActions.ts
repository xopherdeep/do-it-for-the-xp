import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useGameStore } from "@/lib/store/stores/game"
import { useUserStore } from "@/lib/store/stores/user"
import { useTravelingMerchant } from "@/hooks/useTravelingMerchant"
import { prefetchTemple } from "@/lib/services/temples/templeAssets"
import { TEMPLE_METADATA } from "@/lib/engine/temples/templeRegistry"

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

    // A temple's door on screen: fetch its painted floors now, so walking in shows every room ready
    actions
      .map((action) => action?.id)
      .filter((id): id is string => typeof id === "string" && id in TEMPLE_METADATA)
      .forEach((temple) => prefetchTemple(temple))
  }

  return {
    userId,
    user,
    userActions,
    setUserActions,
    setActions
  }
}

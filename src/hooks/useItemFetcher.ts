import { ref, reactive, computed } from 'vue'
import { useGameStore } from "@/lib/store/stores/game"

export const useItemFetcher = (initialType: string = "", initialParams: any = {}) => {
  const gameStore = useGameStore()
  const isLoading = ref(false)
  const activeModal = ref(0)

  // Default params match the mixin
  const request = reactive({
    type: initialType,
    params: {
      page: 1,
      search: "",
      per_page: 4,
      order: "asc",
      orderby: "slug",
      ...initialParams
    }
  })

  // Computed
  const items = computed(() => {
    return gameStore.getRequestedItems(request.type, request.params)
  })

  const nTotalPages = computed(() => {
    return parseInt(gameStore.getTotalPages(request.type, request.params) || '0')
  })

  const nTotalItems = computed(() => {
    return parseInt(gameStore.getTotalItems(request.type, request.params) || '0')
  })

  const hasNextPage = computed(() => {
    return request.params.page < nTotalPages.value
  })

  // Actions
  const fetchImages = async (page: number) => {
    // Get items for *this specific page request*
    const itemsForPage = gameStore.getRequestedItems(request.type, { ...request.params, page })
    if (!itemsForPage || itemsForPage.length === 0) return

    const mediaIds = itemsForPage
      .map((t: any) => t.featured_media)
      .filter((id: number) => id) // strict filter
      .join(",")

    if (mediaIds) {
      return gameStore.fetchWPItems("media", { include: mediaIds })
    }
  }

  const fetchItems = async (page = 1) => {
    // Update the page in params
    request.params.page = page

    return gameStore.fetchWPItems(request.type, { ...request.params, page })
      .then(() => fetchImages(page))
  }

  const getItems = async (page = 1) => {
    isLoading.value = true
    try {
      await fetchItems(page)
    } finally {
      isLoading.value = false
    }
  }

  const getImgObj = (id: string) => {
    const img = gameStore.getSingleById("media", id)
    if (img && img.source_url) {
      return {
        src: img.source_url,
        alt: img.alt_text || '',
        title: img.title?.rendered || '',
      }
    }
    return null
  }

  const isModalOpen = (id: number) => activeModal.value === id

  return {
    isLoading,
    activeModal,
    request,
    items,
    nTotalPages,
    nTotalItems,
    hasNextPage,
    getItems,
    fetchItems,
    getImgObj,
    isModalOpen
  }
}

import { ref, reactive, computed } from 'vue'
import { useGameStore } from "@/lib/store/stores/game"
import { useUserStore } from "@/lib/store/stores/user"

export const useItemFetcher = (initialType: string = "", initialParams: any = {}, userId?: string) => {
  const gameStore = useGameStore()
  const userStore = useUserStore()
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
  const user = computed(() => {
    return userId ? userStore.getUserById(userId) : null
  })

  const items = computed(() => {
    return gameStore.getRequestedItems(request.type, request.params)
  })

  const images = computed(() => {
    return items.value?.map((t: any) => t.featured_media) || []
  })

  const nTotalPages = computed(() => {
    const total = gameStore.getTotalPages(request.type, request.params)
    return total ? parseInt(total) : 0
  })

  const nTotalItems = computed(() => {
    const total = gameStore.getTotalItems(request.type, request.params)
    return total ? parseInt(total) : 0
  })

  const hasNextPage = computed(() => {
    return request.params.page < nTotalPages.value
  })

  const currentPage = computed(() => request.params.page)

  // Actions
  const getImages = (page: number) => {
    return gameStore.getRequestedItems(request.type, {
      ...request.params,
      page
    }).map((t: any) => t.featured_media)
  }

  const getSlideItems = (page: number) => {
    return gameStore.getRequestedItems(request.type, {
      ...request.params,
      page
    })
  }

  const fetchImages = async (page: number) => {
    const mediaIds = getImages(page).filter(id => id).join(",")
    if (mediaIds) {
      return gameStore.fetchWPItems("media", { include: mediaIds })
    }
  }

  const fetchItems = async (page = 1) => {
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

  const getSingleMediaById = (id: string) => {
    return gameStore.getSingleById("media", id)
  }

  const getImgObj = (id: string) => {
    const img = getSingleMediaById(id)
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
    user,
    items,
    images,
    nTotalPages,
    nTotalItems,
    hasNextPage,
    currentPage,
    getItems,
    fetchItems,
    fetchImages,
    getImages,
    getSlideItems,
    getSingleMediaById,
    getImgObj,
    isModalOpen
  }
}

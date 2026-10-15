import { defineComponent } from 'vue'
import { useRouter } from 'vue-router'
import Ionic from '@/lib/mixins/ionic'
import type { TownHallBoardSlug } from '@/lib/services/townhall/townHallSite'
import { openTownHallBoard } from '../townHallLinks'

export default defineComponent({
  name: 'feature-request',
  mixins: [Ionic],
  setup() {
    const router = useRouter()
    return {
      openBoard: (board: TownHallBoardSlug) => openTownHallBoard(router, board)
    }
  }
})

import { defineComponent } from 'vue'
import { useRouter } from 'vue-router'
import { toastController } from '@ionic/vue'
import Ionic from '@/lib/mixins/ionic'
import { rpgToastOptions } from '@/hooks/useToast'
import { copyTextToClipboard } from '@/lib/utils/clipboard'
import type { TownHallBoardSlug } from '@/lib/services/townhall/townHallSite'
import { openTownHallBoard } from '../townHallLinks'
// The deploy workflow stamps package.json's version (YY.M.D-MINS) into each master build.
import packageInfo from '@/../package.json'

export default defineComponent({
  name: 'contact-page',
  mixins: [Ionic],
  setup() {
    const router = useRouter()

    const copyVersion = async () => {
      const copied = await copyTextToClipboard(packageInfo.version)
      const message = copied ? `Version ${packageInfo.version} copied` : `Version ${packageInfo.version}`
      const toast = await toastController.create(rpgToastOptions(message))
      await toast.present()
    }

    return {
      version: packageInfo.version,
      copyVersion,
      openBoard: (board: TownHallBoardSlug) => openTownHallBoard(router, board)
    }
  }
})

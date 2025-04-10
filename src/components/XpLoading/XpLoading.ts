import { defineComponent } from "vue"

export default defineComponent({
  name: 'xp-loading',

  created() {
    // Cast this to any as a workaround for TS2339
    (this as any).$fx.ui[(this as any).$fx.theme.ui].loading.play()
  },
  unmounted() {
    // Cast this to any as a workaround for TS2339
    (this as any).$fx.ui[(this as any).$fx.theme.ui].loading.pause();
    (this as any).$fx.ui[(this as any).$fx.theme.ui].loading.currentTime = 0
  },
})

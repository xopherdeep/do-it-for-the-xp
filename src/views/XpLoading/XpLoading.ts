import { defineComponent } from "vue"


export default defineComponent({
  name: 'xp-loading',

  created() {
    this.$fx.ui[this.$fx.theme.ui].loading.play()
  },
  unmounted() {
    this.$fx.ui[this.$fx.theme.ui].loading.pause()
    this.$fx.ui[this.$fx.theme.ui].loading.currentTime = 0
  },
})
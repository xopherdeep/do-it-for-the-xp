import { defineComponent } from 'vue'
import { IonPage, IonRouterOutlet } from '@ionic/vue'

/** The Settings shell: every settings page renders in its outlet (see settings.routes.ts) */
export default defineComponent({
  name: 'xp-settings',
  components: {
    IonPage,
    IonRouterOutlet
  },
  mounted() {
    this.$fx.ui[this.$fx.theme.ui].options.play()
  },
})

import { computed, defineComponent } from "vue";
import { mapActions, mapGetters, useStore } from "vuex";
import { IonPage, onIonViewWillEnter, onIonViewDidEnter, onIonViewWillLeave, onIonViewDidLeave } from '@ionic/vue';
import { useRoute, useRouter } from "vue-router";

export default defineComponent({
  components: { IonPage },
  computed: {
    ...mapGetters(["userActions"]),
  },
  methods: {
    ...mapActions(["setUserActions"]),
    setActions(){
      this.setUserActions(this.userActions);
    }
  },
  setup(){
    const route      = useRoute();
    const router     = useRouter()
    const store      = useStore();
    const { userId } = route.params;
    const user       = computed(() => store.getters.getUserById(userId));
    return {
      route,
      router,
      store,
      userId,
      user
    }
  },
})
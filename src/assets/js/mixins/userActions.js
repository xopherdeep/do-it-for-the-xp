import { computed, defineComponent } from "vue";
import { mapActions, mapGetters, useStore } from "vuex";
import { IonPage } from '@ionic/vue';
import { useRoute, useRouter } from "vue-router";
import travelingMerchant from "@/assets/js/mixins/travelingMerchant"

export default defineComponent({
  components: { IonPage },
  mixins: [travelingMerchant],
  computed: {
    ...mapGetters(["userActions"]),
  },
  methods: {
    ...mapActions(["setUserActions"]),
    setActions(area){
      const { 
        userActions, 
        maybeAddMerchantToActionsIfInArea,
        setUserActions, 
      } = this
      const actions = [ ...userActions ]
      maybeAddMerchantToActionsIfInArea({ actions, area })
      setUserActions( actions );
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
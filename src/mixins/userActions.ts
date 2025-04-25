import { computed, defineComponent } from "vue";
import { mapActions, mapGetters, useStore } from "vuex";
import { IonPage } from '@ionic/vue';
import { useRoute, useRouter } from "vue-router";
import travelingMerchant from "./travelingMerchant"
import type { ComponentPublicInstance } from 'vue';

export interface UserActionsMixin {
  setUserActions(action: any): void;
  setActions(action: any): void;
  maybeAddMerchantToActionsIfInArea: { (area: any): void };
  userActions: any;
}

export type DefineUserActionComponent = ComponentPublicInstance & UserActionsMixin;

export default defineComponent<DefineUserActionComponent>({
  components: { IonPage },
  mixins: [travelingMerchant],
  computed: {
    ...mapGetters(["userActions"]),
  },
  methods: {
    ...mapActions(["setUserActions"]),
    setActions(area) {
      const {
        userActions,
        maybeAddMerchantToActionsIfInArea,
        setUserActions,
      } = this
      const actions = [...userActions]
      maybeAddMerchantToActionsIfInArea({ actions, area })
      setUserActions(actions);
    }
  },
  setup() {
    // let user = new User({})
    const route = useRoute();
    const router = useRouter()
    const store = useStore();
    const { userId } = route.params;
    const user = computed(() => store.getters.getUserById(userId));
    return {
      route,
      router,
      store,
      userId,
      user
    }
  },
})
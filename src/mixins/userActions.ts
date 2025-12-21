import { defineComponent } from "vue";
import { IonPage } from '@ionic/vue';
import travelingMerchant from "./travelingMerchant"
import type { ComponentPublicInstance } from 'vue';
import { useGameStore } from "@/lib/store/stores/game";
import { useUserStore } from "@/lib/store/stores/user";
import { mapStores } from "pinia";

export interface UserActionsMixin {
  setUserActions(action: any): void;
  setActions(action: any): void;
  maybeAddMerchantToActionsIfInArea: { (area: any): void };
  userActions: any;
}

export type DefineUserActionComponent = ComponentPublicInstance & UserActionsMixin;

export default defineComponent({
  components: { IonPage },
  mixins: [travelingMerchant],
  computed: {
    ...mapStores(useGameStore, useUserStore),
    userActions(): any {
      return (this as any).gameStore.userActions;
    },
    userId() {
      return (this as any).$route.params.userId;
    },
    user() {
      return (this as any).userStore.getUserById(this.userId as string);
    },
  },
  methods: {
    setUserActions(actions: any) {
      return (this as any).gameStore.setUserActions(actions);
    },
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
})
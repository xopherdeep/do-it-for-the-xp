import { defineComponent } from "vue";
import ionic from "@/mixins/ionic";
import { arrowBack } from "ionicons/icons";
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useStore } from "vuex";
import userActions from "@/mixins/userActions";
import type { DefineUserActionComponent } from "@/mixins/userActions";

export default defineComponent<DefineUserActionComponent>({
  name: "world-moon",
  mixins: [ionic, userActions],

  ionViewDidEnter() {
    this.setActions( this.$options.name )
  },
  setup() {
    const route = useRoute();
    const router = useRouter();
    const store = useStore();
    const { userId } = route.params;
    const user = computed(() => store.getters.getUserById(userId));

    const userActions = [
      {
        // label: "Theia Tower",
        label: "Theia City",
        // label: "Theia's Market",
        // label: "Theia Trinkets",
        // label: "Moon Light Markert",
        // label: "Moon Light Gateway",
        faIcon: "chess-rook",
        side: "top",
        click() {
          const merchant = "theia-city"
          router.push({ name: "shop", params: { merchant }})
        },
      },
      {
        label: "Moon Temple",
        id: "moon-temple",
        faIcon: "place-of-worship",
        side: "bottom",
        click() {
          const temple = 'moon-temple' 
          router.push({ 
            name: "temple", 
            params: { 
              userId, 
              temple
            } 
          });
        },
      },
      {
        label: "Travel World",
        faIcon: "pegasus",
        side: "start",
        click() {
          router.push({ name: "world-map", params: { userId } });
        },
      },
    ];
    return {
      userActions,
      user,
      userId,
      arrowBack,
    };
  },
});
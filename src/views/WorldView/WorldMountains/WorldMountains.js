import { defineComponent } from "vue";
import createGlobe from "cobe";
import ionic from "@/assets/js/mixins/ionic";
import { arrowBack } from "ionicons/icons";
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useStore } from "vuex";
import userActions from "@/assets/js/mixins/userActions";
import { onIonViewDidEnter } from "@ionic/vue";

export default defineComponent({
  name: "world-mountains",
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
        label: "Crystal Caverns",
        faIcon: "dungeon",
        click() {
          const merchant = "crystal-caverns"
          router.push({ name: "shop", params: { merchant }})
        },
      },
      {
        label: "Fire Fortress",
        id: "fire-temple",
        faIcon: "place-of-worship",
        click() {
          router.push({ name: "temple", params: { userId } });
        },
      },
      {
        label: "Travel World",
        faIcon: "pegasus",
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

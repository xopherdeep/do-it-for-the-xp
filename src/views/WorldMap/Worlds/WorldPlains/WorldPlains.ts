import { defineComponent } from "vue";
import createGlobe from "cobe";
import ionic from "@/mixins/ionic";
import { arrowBack } from "ionicons/icons";
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useStore } from "vuex";
import userActions from "@/mixins/userActions";
import { onIonViewDidEnter } from "@ionic/vue";

export default defineComponent<typeof userActions>({
  name: "world-plains",
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
        label: " Hometown",
        id: 'home-town',
        faIcon: "archway",
        side: "start",
        click($ev){
          router.push({ name:'home-town', params: {userId} })
          console.log($ev.preventDefault());
        }
      },
      {
        label: "Travel World",
        faIcon: "pegasus",
        side: "start",
        click() {
          router.push({ name: "world-map", params: { userId } });
        },
      },
      {
        label: "Pegasus Ranch",
        // label: "Zodiac Ranch",
        id: "pegasus-ranch",
        faIcon: "farm",
        side: "top",
        click() {
          const merchant = "pegasus-ranch"
          router.push({ name: "shop", params: { merchant }})
        },
      },
      {
        label: "Wind Temple",
        id: "wind-temple",
        faIcon: "place-of-worship",
        side: "bottom",
        click() {
          router.push({ name: "temple", params: { userId } });
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

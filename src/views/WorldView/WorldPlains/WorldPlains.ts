import { defineComponent } from "vue";
import createGlobe from "cobe";
import ionic from "@/assets/js/mixins/ionic";
import { arrowBack } from "ionicons/icons";
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useStore } from "vuex";
import userActions from "@/assets/js/mixins/userActions";
import { onIonViewDidEnter } from "@ionic/vue";

export default defineComponent<userActions>({
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
        id: 'the-city',
        faIcon: "archway",
        side: "top",
        click($ev){
          router.push({ name:'the-city', params: {userId} })
          console.log($ev.preventDefault());
        }
      },
      {
        label: "Pegasus Ranch",
        // label: "Zodiac Ranch",
        id: "pegasus-ranch",
        faIcon: "farm",
        side: "start",
        click() {
          const merchant = "pegasus-ranch"
          router.push({ name: "shop", params: { merchant }})
        },
      },
      {
        label: "Wind Temple",
        id: "wind-temple",
        faIcon: "place-of-worship",
        side: "end",
        click() {
          router.push({ name: "temple", params: { userId } });
        },
      },
      {
        label: "Travel World",
        faIcon: "pegasus",
        side: "top",
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

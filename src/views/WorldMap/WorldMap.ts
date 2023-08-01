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
  name: "my-home",
  mixins: [ionic, userActions],

  ionViewDidEnter(){
    this.setActions( this.$options.name )
  },
  setup() {
    const route      = useRoute();
    const router     = useRouter()
    const store      = useStore();
    const { userId } = route.params;
    const user       = computed(() => store.getters.getUserById(userId));

    const userActions = [
        {
          label: "Plains",
          faIcon: "tornado",
          side: "start",
          click(){
            router.push({ name:'world-plains', params: {userId} })
          }
        },
        {
          label: "Islands",
          faIcon: "island-tropical",
          side: "start",
          click(){
            router.push({ name:'world-islands', params: {userId} })
          }
        },
        {
          label: "Forest",
          faIcon: "trees",
          side: "start",
          click(){
            router.push({ name:'world-forest', params: {userId} })
          }
        },
        {
          label: "Swamps",
          faIcon: "skull-crossbones",
          side: "bottom",
          click(){
            router.push({ name:'world-swamps', params: {userId} })
          }
        },
        {
          label: "Mountains",
          faIcon: "mountains",
          side: "bottom",
          click(){
            router.push({ name:'world-mountains', params: {userId} })
          }
        },
        {
          label: "Sands",
          faIcon: "cactus",
          side: "bottom",
          click(){
            router.push({ name:'world-sands', params: {userId} })
          }
        },
        {
          label: "Tundras",
          faIcon: "igloo",
          side: "top",
          click(){
            router.push({ name:'world-ice', params: {userId} })
          }
        },
        {
          label: "To Moon",
          faIcon: "moon",
          side: "top",
          click(){
            router.push({ name:'the-moon', params: {userId} })
          }
        },
      ]
    return {
      userActions,
      user,
      userId,
      arrowBack,
    };
  },
});

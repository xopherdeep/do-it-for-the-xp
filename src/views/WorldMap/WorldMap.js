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
  name: "my-home",
  mixins: [ionic, userActions],

  ionViewDidEnter(){
    this.setUserActions(this.userActions)
  },
  setup() {
    const route      = useRoute();
    const router     = useRouter()
    const store      = useStore();
    const { userId } = route.params;
    const user       = computed(() => store.getters.getUserById(userId));

    const userActions = [
        {
          label: " Hometown",
          id: 'the-city',
          faIcon: "city",
          click($ev){
            router.push({ name:'the-city', params: {userId} })
            console.log($ev.preventDefault());
          }
        },
        {
          label: "Plains",
          faIcon: "tornado",
        },
        {
          label: "Mountains",
          faIcon: "mountains",
          click(){
            router.push({ name:'mountain', params: {userId} })
          }
        },
        {
          label: "Forest",
          faIcon: "trees",
        },
        {
          label: "Desert",
          faIcon: "cactus",
        },
        {
          label: "Islands",
          faIcon: "island-tropical",
        },
        {
          label: "Swamps",
          faIcon: "skull-crossbones",
        },
        {
          label: "Ice Fortress",
          faIcon: "igloo",
        },
        {
          label: "To Moon",
          faIcon: "rocket",
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

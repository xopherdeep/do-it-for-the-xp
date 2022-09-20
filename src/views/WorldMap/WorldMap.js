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
          click(){
            router.push({ name:'plains', params: {userId} })
          }
        },
        {
          label: "Islands",
          faIcon: "island-tropical",
          click(){
            router.push({ name:'islands', params: {userId} })
          }
        },
        {
          label: "Forest",
          faIcon: "trees",
          click(){
            router.push({ name:'forest', params: {userId} })
          }
        },
        {
          label: "Swamps",
          faIcon: "skull-crossbones",
          click(){
            router.push({ name:'swamps', params: {userId} })
          }
        },
        {
          label: "Mountains",
          faIcon: "mountains",
          click(){
            router.push({ name:'mountain', params: {userId} })
          }
        },
        {
          label: "Desert",
          faIcon: "cactus",
          click(){
            router.push({ name:'desert', params: {userId} })
          }
        },
        {
          label: "Tundras",
          faIcon: "igloo",
          click(){
            router.push({ name:'frozen-tundra', params: {userId} })
          }
        },
        {
          label: "To Moon",
          faIcon: "moon",
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

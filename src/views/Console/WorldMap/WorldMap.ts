import { defineComponent } from "vue";
import ionic from "@/mixins/ionic";
import { arrowBack } from "ionicons/icons";
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useUserStore } from "@/lib/store/stores/user";
import userActions from "@/mixins/userActions";


export default defineComponent({
  name: "my-home",
  mixins: [ionic, userActions],

  ionViewDidEnter(){
    this.setActions( this.$options.name )
  },
  setup() {
    const route      = useRoute();
    const router     = useRouter()
    const userStore  = useUserStore();
    const { userId } = route.params;
    const user       = computed(() => userStore.getUserById(userId as string));

    const userActions = [
        {
          label: "Plains",
          faIcon: "tornado",
          side: "bottom",
          click(){
            router.push({ name:'world-plains', params: {userId} })
          }
      },
      {
        label: "Forests",
        faIcon: "trees",
        side: "start",
        click() {
          router.push({ name: 'world-forest', params: { userId } })
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
          side: "top",
          click(){
            router.push({ name:'world-mountains', params: {userId} })
          }
        },
        {
          label: "Sands",
          faIcon: "cactus",
          side: "end",
          click(){
            router.push({ name:'world-sands', params: {userId} })
          }
        },
        {
          label: "Tundras",
          faIcon: "igloo",
          side: "end",
          click(){
            router.push({ name:'world-ice', params: {userId} })
          }
        },
        {
          label: "Clouds",
          faIcon: "bolt",
          side: "top",
          click(){
            router.push({ name:'world-clouds', params: {userId} })
          }
        },
        {
          label: "Stars",
          faIcon: "star",
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
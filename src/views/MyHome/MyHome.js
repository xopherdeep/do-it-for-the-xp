import { defineComponent, ref } from "vue";
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useStore } from "vuex";
import userActions from "@/assets/js/mixins/userActions";
import ionic from "@/assets/js/mixins/ionic";
import {modalController} from "@ionic/vue";

import { arrowBack } from "ionicons/icons";

export default defineComponent({
  name: "my-home",
  data() {
    return {
    };
  },
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
    const closeModal = () => modalController.dismiss()
    const clickSave  = () => router.push({name: 'switch-profile'}).then(closeModal)
    return {
      closeModal,
      clickSave,
      user,
      userId,
      arrowBack,
      userActions: [
        {
          label: "Open Storage",
          // id: 'storage',
          faIcon: "treasure-chest",
          side: "start",
          // link: 'storage',
          click($ev){
            router.push({ name:'storage', params: {userId} })
          }
        },
        {
          label: "Calendar",
          id: 'adventure-time',
          faIcon: "clock",
          side: "start",
        },
        // {
        //   id: 'rest',
        //   label: "Rest",
        //   faIcon: "bed",
        // },
        {
          label: "Craft Item",
          id: 'craft',
          faIcon: "tools",
          side: "end",
          click($ev){
            router.push({ name:'craft-item', params: {userId} })
          }
        },
        {
          label: "Cook Food",
          id: 'cook',
          faIcon: "hat-chef",
          side: "end",
          click($ev){
            router.push({ name:'cook-food', params: {userId} })
          }
        },
        {
          label: "Go Outside",
          id: 'the-city',
          faIcon: "door-open",
          side: "top",
          click($ev){
            router.push({ name:'the-city', params: {userId} })
            console.log($ev.preventDefault());
          }
        },
      ],
    };
  },
});

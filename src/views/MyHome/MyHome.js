import { defineComponent, ref } from "vue";
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useStore } from "vuex";
import userActions from "@/mixins/userActions";
import ionic from "@/mixins/ionic";
import {modalController} from "@ionic/vue";

import { arrowBack } from "ionicons/icons";

export default defineComponent({
  name: "my-home",
  data() {
    return {
        showSaveQuit: false,
    };
  },
  mixins: [ionic, userActions],

  ionViewDidEnter(){
    this.setUserActions(this.userActions)
  },
  // methods: {
  //     openModal() {
  //       this.showSaveQuit = true;
  //     },
  //     closeModal() {
  //       this.showSaveQuit = false;
  //     },

  // },
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
          label: "My Calendar",
          id: 'adventure-time',
          faIcon: "clock",
          side: "bottom",
        },
        {
          label: "My Storage",
          // id: 'storage',
          faIcon: "treasure-chest",
          side: "bottom",
          // link: 'storage',
          click($ev){
            router.push({ name:'storage', params: {userId} })
          }
        },
        // {
        //   id: 'rest',
        //   label: "Rest",
        //   faIcon: "bed",
        // },
        {
          label: "My Workbench",
          id: 'craft',
          faIcon: "tools",
          side: "top",
          click($ev){
            router.push({ name:'craft-item', params: {userId} })
          }
        },
        {
          label: "My Kitchen",
          id: 'cook',
          faIcon: "hat-chef",
          side: "top",
          click($ev){
            router.push({ name:'cook-food', params: {userId} })
          }
        },
        {
          label: "Go Outside",
          id: 'home-town',
          faIcon: "door-open",
          side: "start",
          click($ev){
            router.push({ name:'home-town', params: {userId} })
            console.log($ev.preventDefault());
          }
        },
      ],
    };
  },
});

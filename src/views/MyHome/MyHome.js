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
          label: "Save & Quit",
          id: 'save-quit',
          faIcon: "save",
        },
        {
          label: "Calendar",
          id: 'adventure-time',
          faIcon: "calendar",
        },
        {
          id: 'rest',
          label: "Rest",
          faIcon: "bed",
        },
        {
          label: "Storage",
          // id: 'storage',
          faIcon: "treasure-chest",
          // link: 'storage',
          click($ev){
            router.push({ name:'storage', params: {userId} })
            console.log($ev.preventDefault());
          }
        },
        {
          label: "Cook",
          id: 'cook',
          faIcon: "hat-chef",
        },
        {
          label: "Craft",
          id: 'craft',
          faIcon: "tools",
        },
        {
          label: "Go Outside",
          id: 'the-city',
          faIcon: "door-open",
          click($ev){
            router.push({ name:'the-city', params: {userId} })
            // console.log($ev.preventDefault());
          }
        },
      ],
    };
  },
});

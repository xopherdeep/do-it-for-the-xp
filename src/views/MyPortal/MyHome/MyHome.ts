import { defineComponent, ref } from "vue";
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { mapActions, useStore } from "vuex";
import userActions from "@/mixins/userActions";
import ionic from "@/mixins/ionic";
import {modalController, toastController} from "@ionic/vue";

import { arrowBack } from "ionicons/icons";

export default defineComponent({
  name: "my-home",
  data() {
    return {
      handlerMessage: '',
      roleMessage: '',
    };
  },
  mixins: [ionic, userActions],

  ionViewDidEnter(){
    this.setUserActions(this.userActions)
    // this.presentToast()
  },

  methods:{
    ...mapActions(["setUserActions"]),
    async presentToast() {
     const { router, user: {name: {first}, id: userId } } = this
     const toast = await toastController.create({
        message: `Welcome home ${first}!`,
        duration: 50000,
        position: 'middle',
        cssClass: 'rpg-toast',
        buttons: [
          // {
          //   text: 'About XP',
          //   role: 'info',
          //   handler: () => { 
          //     router.push({ name:'about-xp', params: {userId} })
          //   }
          // },
          {
            text: 'Dismiss',
            role: 'cancel',
            handler: () => { this.handlerMessage = 'Dismiss clicked'; }
          }
        ]
      });

      await toast.present();

      const { role } = await toast.onDidDismiss();
      this.roleMessage = `Dismissed with role: ${role}`;
    },
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
      router,

      userActions: [
        {
          label: "My Calendar",
          id: 'adventure-time',
          faIcon: "clock",
          side: "bottom",
          click($ev){
            router.push({ name:'calendar', params: {userId} })
          }
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

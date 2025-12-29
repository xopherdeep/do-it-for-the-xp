import { defineComponent } from "vue";
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useUserStore } from "@/lib/store/stores/user";
import { useUserActions } from "@/hooks/useUserActions";
import ionic from "@/mixins/ionic";
import { modalController, toastController } from "@ionic/vue";
import { arrowBack } from "ionicons/icons";
import SaveAndQuitModal from "@/components/molecules/Modals/SaveAndQuitModal.vue";

const requireAvatar = require.context("@/assets/images/avatars/");

export default defineComponent({
  name: "my-home",
  components: {
    SaveAndQuitModal,
  },
  mixins: [ionic],
  data() {
    return {
      handlerMessage: '',
      roleMessage: '',
    };
  },

  ionViewDidEnter() {
    (this as any).setUserActions((this as any).userActions)
  },

  methods: {
    async presentToast() {
      const {  user: { name: { first } } } = this
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
    const route = useRoute();
    const router = useRouter()
    const userStore = useUserStore();
    const { 
      setUserActions, 
      setActions,
      userActions: storeUserActions
    } = useUserActions();

    const { userId } = route.params;
    const user = computed(() => userStore.getUserById(userId as string));
    const showSaveQuitModal = ref(false);
    
    const closeModal = () => modalController.dismiss()
    const clickSave = () => router.push({ name: 'xp-profile' }).then(closeModal)
    
    const closeSaveQuitModal = () => {
      showSaveQuitModal.value = false;
    };
    
    const confirmSaveQuit = () => {
      router.push({ name: 'xp-profile' });
      closeSaveQuitModal();
    };
    
    const openSaveQuitModal = () => {
      showSaveQuitModal.value = true;
    };
    
    const userAvatar = computed(() => {
      return (user.value?.avatar) ? requireAvatar(`./${user.value.avatar}.svg`) : '';
    });
    
    return {
      userAvatar,
      closeModal,
      clickSave,
      user,
      userId,
      arrowBack,
      router,
      showSaveQuitModal,
      closeSaveQuitModal,
      confirmSaveQuit,
      openSaveQuitModal,
      setUserActions,
      setActions,
      storeUserActions,

      userActions: [

        {
          label: "My Storage",
          // id: 'storage',
          faIcon: "treasure-chest",
          side: "top",
          // link: 'storage',
          click() {
            router.push({ name: 'storage', params: { userId } })
          }
        },
        {
          label: "My Calendar",
          id: 'adventure-time',
          faIcon: "clock",
          side: "top",
          click() {
            router.push({ name: 'calendar', params: { userId } })
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
          side: "start",
          click() {
            router.push({ name: 'craft-item', params: { userId } })
          }
        },
        {
          label: "My Kitchen",
          id: 'cook',
          faIcon: "hat-chef",
          side: "end",
          click() {
            router.push({ name: 'cook-food', params: { userId } })
          }
        },
        {
          label: "Go Outside",
          id: 'home-town',
          faIcon: "door-open",
          side: "bottom",
          click() {
            router.push({ name: 'home-town', params: { userId } })
            // console.log($ev.preventDefault());
          }
        },
      ],
    };
  },
});

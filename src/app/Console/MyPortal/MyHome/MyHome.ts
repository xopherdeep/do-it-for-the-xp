import { defineComponent } from "vue";
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useUserStore } from "@/lib/store/stores/user";
import { heroAvatarSrc } from "@/lib/hero-look/look";
import { useUserActions } from "@/hooks/useUserActions";
import ionic from "@/lib/mixins/ionic";
import { alertController, modalController, toastController } from "@ionic/vue";
import { arrowBack } from "ionicons/icons";
import { readPool } from "@/lib/services/hometown/Lodging";
import SaveAndQuitModal from "@/components/molecules/Modals/SaveAndQuitModal.vue";

const requireAvatar = require.context("@/assets/images/avatars/", false, /\.svg$/);

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
      const { user: { name: { first } } } = this
      const toast = await toastController.create({
        message: `Welcome home ${first}!`,
        duration: 50000,
        position: 'top',
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

    const shouldNavigateToProfile = ref(false);

    const closeSaveQuitModal = () => {
      showSaveQuitModal.value = false;
      if (shouldNavigateToProfile.value) {
        shouldNavigateToProfile.value = false;
        router.replace({ name: 'xp-profile' });
      }
    };

    const confirmSaveQuit = () => {
      shouldNavigateToProfile.value = true;
      showSaveQuitModal.value = false;
    };

    const openSaveQuitModal = () => {
      showSaveQuitModal.value = true;
    };

    const userAvatar = computed(() => {
      return heroAvatarSrc(user.value, requireAvatar);
    });

    const restInBed = async () => {
      const stats = user.value?.stats;
      const hp = readPool(stats?.hp, stats?.maxHp);
      const mp = readPool(stats?.mp, stats?.maxMp);
      const hpGain = Math.max(0, hp.max - hp.now);
      const mpGain = Math.max(0, mp.max - mp.now);

      const isFullyRested = hpGain <= 0 && mpGain <= 0;
      if (isFullyRested) {
        const toast = await toastController.create({
          message: "You are already fully rested!",
          duration: 2500,
          position: "top",
          cssClass: "rpg-toast",
        });
        await toast.present();
        return;
      }

      const alert = await alertController.create({
        header: "Rest in Bed",
        message: "Sleep in your cozy bed to restore all HP and MP for free?",
        buttons: [
          {
            text: "Not now",
            role: "cancel",
            cssClass: "alert-cancel",
          },
          {
            text: "Rest",
            role: "confirm",
            cssClass: "alert-confirm",
            handler: async () => {
              if (hpGain > 0) {
                userStore.updateUserHP({ userId: userId as string, amount: hpGain });
              }
              if (mpGain > 0) {
                userStore.updateUserMP({ userId: userId as string, amount: mpGain });
              }
              if (typeof (window as any).play$fx === "function") {
                (window as any).play$fx("restoreAll");
              }
              const toast = await toastController.create({
                message: "You rested comfortably. Full HP & MP restored!",
                duration: 2500,
                position: "top",
                cssClass: "rpg-toast",
              });
              await toast.present();
            },
          },
        ],
      });
      await alert.present();
    };

    return {
      userAvatar,
      restInBed,
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
          label: "Rest in Bed",
          id: 'rest',
          faIcon: "bed",
          side: "bottom",
          click() {
            restInBed();
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

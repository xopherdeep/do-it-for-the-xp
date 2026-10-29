import { defineComponent } from "vue";
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useUserStore } from "@/lib/store/stores/user";
import { heroAvatarSrc } from "@/lib/hero-look/look";
import { useUserActions } from "@/hooks/useUserActions";
import { play$fx } from "@/assets/fx";
import ionic from "@/lib/mixins/ionic";
import { modalController, toastController } from "@ionic/vue";
import { arrowBack } from "ionicons/icons";
import { quoteBedRest } from "@/lib/services/hometown/Lodging";
import SaveAndQuitModal from "@/components/molecules/Modals/SaveAndQuitModal.vue";
import XpRevealPrompt from "@/components/organisms/RevealPrompt/XpRevealPrompt.vue";
import { useBedRest } from "./useBedRest";
import { useSaveAndQuit } from "@/hooks/useSaveAndQuit";

const requireAvatar = require.context("@/assets/images/avatars/", false, /\.svg$/);

export default defineComponent({
  name: "my-home",
  components: {
    SaveAndQuitModal,
    XpRevealPrompt,
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

    const userId = computed(() => String(route.params.userId));
    const user = computed(() => userStore.getUserById(userId.value));
    const {
      isOpen: showSaveQuitModal,
      open: openSaveQuitModal,
      cancel: closeSaveQuitModal,
      confirm: confirmSaveQuit,
    } = useSaveAndQuit();
    // The bed asks in the game's own dialog, in the hero's voice
    const { prompt, submitAnswer, confirmBedRest } = useBedRest();

    const closeModal = () => modalController.dismiss()
    const clickSave = () => router.push({ name: 'xp-profile' }).then(closeModal)


    const userAvatar = computed(() => {
      return heroAvatarSrc(user.value, requireAvatar);
    });

    const restInBed = async () => {
      // Once a real day: quoteBedRest() decides, the store remembers the stamp.
      const quote = quoteBedRest(user.value?.stats, user.value?.bedRestAt);
      if (!quote.canRest) {
        const toast = await toastController.create({
          message: quote.reason === "rested" ? "You're not sleepy yet. Come back tomorrow." : "You are already fully rested!",
          duration: 2500,
          position: "top",
          cssClass: "rpg-toast",
        });
        await toast.present();
        return;
      }

      const isRestChosen = await confirmBedRest();
      if (!isRestChosen) return;

      const hasHpGain = quote.hpGain > 0;
      if (hasHpGain) {
        userStore.updateUserHP({ userId: userId.value, amount: quote.hpGain });
      }
      const hasMpGain = quote.mpGain > 0;
      if (hasMpGain) {
        userStore.updateUserMP({ userId: userId.value, amount: quote.mpGain });
      }
      userStore.setBedRestAt(userId.value, new Date().toISOString());
      play$fx("restoreAll");
      const toast = await toastController.create({
        message: "You rested comfortably. Full HP & MP restored!",
        duration: 2500,
        position: "top",
        cssClass: "rpg-toast",
      });
      await toast.present();
    };

    return {
      userAvatar,
      restInBed,
      prompt,
      submitAnswer,
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
            router.push({ name: 'storage', params: { userId: userId.value } })
          }
        },
        {
          label: "My Calendar",
          id: 'adventure-time',
          faIcon: "clock",
          side: "top",
          click() {
            router.push({ name: 'calendar', params: { userId: userId.value } })
          }
        },
        {
          label: "My Workbench",
          id: 'craft',
          faIcon: "tools",
          side: "start",
          click() {
            router.push({ name: 'craft-item', params: { userId: userId.value } })
          }
        },
        {
          label: "My Kitchen",
          id: 'cook',
          faIcon: "hat-chef",
          side: "end",
          click() {
            router.push({ name: 'cook-food', params: { userId: userId.value } })
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
            router.push({ name: 'home-town', params: { userId: userId.value } })
            // console.log($ev.preventDefault());
          }
        },
      ],
    };
  },
});

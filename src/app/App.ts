import {
  computed,
  defineComponent,
} from "vue";
import {
  IonApp,
  IonButton,
  IonButtons,
  IonContent,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonMenu,
  IonMenuToggle,
  IonNote,
  IonRouterOutlet,
  IonSplitPane,
  IonToggle,
  alertController,
} from "@ionic/vue";

import {
  archiveOutline,
  archiveSharp,
  bookmarkOutline,
  bookmarkSharp,
  heartOutline,
  heartSharp,
  mailOutline,
  mailSharp,
  paperPlaneOutline,
  paperPlaneSharp,
  trashOutline,
  trashSharp,
  warningOutline,
  warningSharp,
} from "ionicons/icons";


import { useQueryProvider } from "vue-query";

import XpSideMenu from "@/app/SideMenu/SideMenu.vue";
import XpAudioPermissionModal from "@/components/molecules/Modals/XpAudioPermissionModal.vue";
import XpStudioSplash from "@/components/organisms/Splash/XpStudioSplash.vue";
import { claimStudioSplash } from "@/components/organisms/Splash/splash";
import XpSceneTransition from "@/components/organisms/SceneTransition/XpSceneTransition.vue";
import { isActive as sceneTransitionActive } from "@/components/organisms/SceneTransition/sceneTransitionController";
// import XpGlobalDialog from "../../components/molecules/Dialog/XpGlobalDialog.vue";
import XpGlobalDialog from "@/components/molecules/Dialog/XpGlobalDialog.vue";
import debug from "@/lib/utils/debug";
import { useHardwareBack } from "@/hooks/useBack";
import { useAudioStore } from "@/lib/store/stores/audio";
import { useUserStore } from "@/lib/store/stores/user";
import { useGameStore } from "@/lib/store/stores/game";
import { useBattleStore } from "@/lib/store/stores/battle";
import { useFamilyStore } from "@/lib/store/stores/family";
import { multiplayerEnabled } from "@/lib/services/multiplayer/multiplayerFlag";
import { changeBGM as changeBGMAdapter } from '@/lib/engine/audio/routeMusic';
import { play$fx } from "@/assets/fx";

const resolveNextTrackIndex = (requestedTrack: number, maxTrackIndex: number): number => {
  const isBelowMinimum = requestedTrack < 0;
  if (isBelowMinimum) {
    return maxTrackIndex;
  }
  const isAboveMaximum = requestedTrack > maxTrackIndex;
  if (isAboveMaximum) {
    return 0;
  }
  return requestedTrack;
};

export default defineComponent({
  name: "App",
  components: {
    IonToggle,
    IonButton,
    IonButtons,
    IonApp,
    IonContent,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonListHeader,
    IonMenu,
    IonMenuToggle,
    IonNote,
    IonRouterOutlet,
    IonSplitPane,
    XpSideMenu,
    XpAudioPermissionModal,
    XpStudioSplash,
    XpGlobalDialog,
    XpSceneTransition,
  },
  data() {
    return {
      // Studio splash: once per launch, skipped by ?nosplash or localStorage.xpSkipSplash = "1"
      studioSplash: claimStudioSplash(),
      isBMGOn: false,
      bgmBookmark: {
        track: null as number | null,
        currentTime: 0
      },
      currentTime: 0
    };
  },
  computed: {
    users() { return this.userStore.users },
    user() { return this.userStore.currentUser },
    theme() { return this.gameStore.theme },
    battleState() {
      return (key: string) => (this.battleStore as any)[key];
    },
    bgmTrack() {
      return this.bgm.track;
    },

    tracks() {
      return this.bgm.tracks
    },

    uiTheme() {
      return this.theme.ui;
    },
    rpgTheme() {
      return this.theme.rpg;
    },
  },
  mounted() {
    // Cast this to any as a workaround for TS2339
    const { audioStore, gameStore } = (this as any);
    const $fx = audioStore.bgm.$fx;
    const theme = gameStore.theme.rpg;
    
    // Use the new AudioEngine for the initial BGM
    changeBGMAdapter(audioStore, { 
      tracks: $fx.rpg[theme].BGM.startScreen,
      track: 0,
      saveBookmark: false
    }, true);
  },
  methods: {
    toggleBGM() { return this.audioStore.toggleBGM() },
    changeBGM(payload: any) { return this.audioStore.changeBGM(payload) },
    turnMusicOnOff() { return this.audioStore.turnMusicOnOff() },
    clickSound() {
      play$fx('select');
    },
    getAudioPlayer() {
      return this.bgm.audio;
    },
    getCurrentTheme() {
      // Cast this to any as a workaround for TS2339
      return (this as any).gameStore.theme.rpg;
    },
    async presentAlertConfirm() {
      const alert = await alertController.create({
        cssClass: "my-custom-class",
        header: "Confirm!",
        message: "Message <strong>text</strong>!!!",
        buttons: [
          {
            text: "Cancel",
            role: "cancel",
            cssClass: "secondary",
            id: "cancel-button",
            handler: (blah) => {
              debug.log("Confirm Cancel:", blah);
            },
          },
          {
            text: "Okay",
            id: "confirm-button",
            handler: () => {
              // console.log("Confirm Okay");
            },
          },
        ],
      });
      return alert.present();
    },
    toggleBGMOnOff($ev) {
      const is_on = $ev.detail.checked;
      const { changeBGM, turnMusicOnOff } = this;

      changeBGM({ is_on }).then(turnMusicOnOff);
    },

    loadBGM(track, currentTime) {
      const { changeBGM, bgmTrack, addEventNextSong, bgm, bgmBookmark } = this;

      // Are we using bookmarked audio?
      const isTimeToPlayBookmark = null != bgmBookmark.track && false == bgm.saveBookmark

      const time = isTimeToPlayBookmark ? bgmBookmark.currentTime : 0
      const playTrack = isTimeToPlayBookmark ? bgmBookmark.track : bgmTrack
      const audio = new Audio(bgm.tracks[playTrack as number] as any)
      audio.currentTime = time
      // Set time to bookmarked audio 

      // Here set bookmarks if need to be saved and current
      if (bgm.saveBookmark)
        this.bgmBookmark.currentTime = currentTime

      changeBGM({ audio }).then(addEventNextSong);
    },

    addEventNextSong() {
      const { bgm, clickBGMTrack } = this;
      bgm.audio.addEventListener(
        "ended",
        () => {
          clickBGMTrack(+1);
        },
        false
      );
    },

    clickBGMTrack(inc = 1) {
      // Cast this to any as a workaround for TS2339
      const {
        bgm,
        playAudio,
      } = (this as any);
      const maxTrackIndex = bgm.tracks.length - 1;
      const track = resolveNextTrackIndex(bgm.track + inc, maxTrackIndex);
      this.changeBGM({ track, is_on: true }).then(playAudio);
    },

    playAudio() {
      const { bgm: { track, is_on } } = this

      if (this.bgm.audio) {
        this.bgm.audio.pause();
        this.loadBGM(track, this.bgm.audio.currentTime);
        this.bgm.audio.load();
        if (is_on) {
          const playPromise = this.bgm.audio.play();
          if (playPromise && typeof playPromise.catch === "function") {
            playPromise.catch((err: unknown) => {
              debug.warn("BGM playback was prevented:", err);
            });
          }
        }
      }
    },
  },
  watch: {
    theme: {
      handler() {
        this.$forceUpdate();
      },
      deep: true,
    },
    tracks: {
      handler() {
        const self = this as any;
        const { is_on, startDelay, saveBookmark, track, audio, _usingNewAudioEngine } = self.bgm;

        // If we are using the new AudioEngine, we should NOT use the legacy audio element
        if (_usingNewAudioEngine) {
          if (audio) {
            audio.pause();
          }
          return;
        }

        if (audio) {
          audio.pause();
        }

        self.bgmBookmark.track = saveBookmark ? track : null;

        const startAudio = () => is_on ? setTimeout(self.playAudio, startDelay) : 0;
        self.changeBGM({ is_on }).then(startAudio);
      },
    },
  },

  setup() {

    const audioStore = useAudioStore();
    const userStore = useUserStore();
    const gameStore = useGameStore();
    const battleStore = useBattleStore();
    
    useQueryProvider();
    // Android's Back button goes up from a page with no history instead of quitting the app
    useHardwareBack();

    const labels = [
      "Family",
      "Friends",
      "Notes",
      "Work",
      "Travel",
      "Reminders",
    ];

    userStore.loadUsers();

    // Multiplayer ships hidden: with the flag off nothing here runs and no request is made
    if (multiplayerEnabled()) {
      useFamilyStore()
        .init()
        .catch((error) => debug.warn("The family could not start:", error));
    }

    const bgm = computed(() => audioStore.bgm);

    return {
      // Ionic's own page slide stays off while a scene transition plays over it
      sceneTransitionActive,
      audioStore,
      userStore,
      gameStore,
      battleStore,
      archiveOutline,
      archiveSharp,
      bgm,
      bookmarkOutline,
      bookmarkSharp,
      heartOutline,
      heartSharp,
      isLoggedIn: computed(() => userStore.currentUser.isAuthenticated),
      labels,
      mailOutline,
      mailSharp,
      paperPlaneOutline,
      paperPlaneSharp,
      trashOutline,
      trashSharp,
      warningOutline,
      warningSharp,
    };
  },
});

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
import { useStore } from "vuex";

import { useQueryProvider } from "vue-query";

import XpSideMenu from "@/views/App/SideMenu/SideMenu.vue";
import debug from "@/lib/utils/debug";
import { useAudioStore } from "@/lib/store/stores/audio";
import { useUserStore } from "@/lib/store/stores/user";
import { useGameStore } from "@/lib/store/stores/game";
import { useBattleStore } from "@/lib/store/stores/battle";

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
  },
  data() {
    return {
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
    const { audioStore, gameStore, loadBGM } = (this as any);
    const $fx = audioStore.bgm.$fx;
    const theme = gameStore.theme.rpg;
    this.audioStore.changeBGM({ tracks: $fx.rpg[theme].BGM.startScreen }).then(loadBGM as any)
  },
  methods: {
    toggleBGM() { return this.audioStore.toggleBGM() },
    changeBGM(payload: any) { return this.audioStore.changeBGM(payload) },
    turnMusicOnOff() { return this.audioStore.turnMusicOnOff() },
    clickSound() {
      // Cast this to any as a workaround for TS2339
      (this as any).audioStore.bgm.$fx.ui[(this as any).gameStore.theme.ui].select.play();
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
      const maxTrackIndex = -1 + bgm.tracks.length;
      let track = bgm.track + inc;
      const cantGoBack = track < 0;
      const hasNextTrack = track <= maxTrackIndex && !cantGoBack;
      track = cantGoBack ? maxTrackIndex : hasNextTrack ? track : 0;
      this.changeBGM({ track, is_on: true }).then(playAudio);
    },

    playAudio() {
      const { bgm: { track, is_on } } = this

      if (this.bgm.audio) {
        this.bgm.audio.pause();
        this.loadBGM(track, this.bgm.audio.currentTime);
        this.bgm.audio.load();
        if (is_on)
          this.bgm.audio.play();
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
        const { is_on, startDelay, saveBookmark, track, audio } = self.bgm;

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
    const store = useStore();
    const audioStore = useAudioStore();
    const userStore = useUserStore();
    const gameStore = useGameStore();
    const battleStore = useBattleStore();
    
    useQueryProvider();

    const labels = [
      "Family",
      "Friends",
      "Notes",
      "Work",
      "Travel",
      "Reminders",
    ];

    userStore.loadUsers();

    const bgm = computed(() => audioStore.bgm);

    return {
      store,
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

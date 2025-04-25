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
import { mapActions, mapGetters, mapState, useStore } from "vuex";

import { useQueryProvider } from "vue-query";

import XpSideMenu from "@/views/App/SideMenu/SideMenu.vue";
import debug from "@/utils/debug";

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
        track: null,
        currentTime: 0
      },
      currentTime: 0
    };
  },
  computed: {
    ...mapState(["users", "user", "theme", "bgm"]),
    ...mapGetters(["battleState"]),
    bgmTrack() {
      return this.bgm.track;
    },

    tracks() {
      return this.bgm.tracks
    },

    uiTheme() {
      const {
        theme: { ui },
      } = this;
      return ui;
    },
    rpgTheme() {
      const {
        theme: { rpg },
      } = this;
      return rpg;
    },
  },
  mounted() {
    // Cast this to any as a workaround for TS2339
    const { $fx, changeBGM, loadBGM } = (this as any);
    changeBGM({ tracks: $fx.rpg[$fx.theme.rpg].BGM.startScreen }).then(loadBGM as any)
  },
  methods: {
    ...mapActions(["toggleBGM", "changeBGM", "turnMusicOnOff"]),
    clickSound() {
      // Cast this to any as a workaround for TS2339
      (this as any).$fx.ui[(this as any).$fx.theme.ui].select.play();
    },
    getAudioPlayer() {
      return this.bgm.audio;
    },
    getCurrentTheme() {
      // Cast this to any as a workaround for TS2339
      return (this as any).$fx.theme.rpg;
    },
    ...mapActions(["loadUsers"]),
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
      const audio = new Audio(bgm.tracks[playTrack])
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
        const { changeBGM, playAudio, bgm: { audio, track, is_on, startDelay, saveBookmark } } = this
        if (audio)
          audio.pause()

        this.bgmBookmark.track = saveBookmark ? track : null

        const startAudio = () => is_on ? setTimeout(playAudio, startDelay) : 0
        changeBGM({ is_on }).then(startAudio)
      },
    },
  },

  setup() {
    const store = useStore();
    useQueryProvider();

    const labels = [
      "Family",
      "Friends",
      "Notes",
      "Work",
      "Travel",
      "Reminders",
    ];

    store.dispatch("loadUsers");

    const bgm = computed(() => store.state.bgm);

    return {
      store,
      archiveOutline,
      archiveSharp,
      bgm,
      bookmarkOutline,
      bookmarkSharp,
      heartOutline,
      heartSharp,
      isLoggedIn: computed(() => store.getters.isLoggedIn),
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

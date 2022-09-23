import {
  computed,
  defineComponent,
  getCurrentInstance,
  reactive,
  ref,
} from "vue";
import { useRoute } from "vue-router";
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

import appPages from "./App.Pages";
import appPagesAnon from "./App.Pages.Anon";
import { useQueryProvider } from "vue-query";

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

    tracks(){
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
    const { $fx:{rpg, theme}, changeBGM, loadBGM } = this; 
    changeBGM({ tracks: rpg[theme.rpg].BGM.startScreen }).then(loadBGM)
  },
  methods: {
    ...mapActions(["toggleBGM", "changeBGM", "turnMusicOnOff"]),
    clickSound() {
      this.$fx.ui[this.$fx.theme.ui].select.play();
    },
    getAudioPlayer() {
      return this.bgm.audio;
    },
    getCurrentTheme() {
      return this.$fx.theme.rpg;
    },
    ...mapActions(["loadUsers"]),
    getCurrentMenu() {
      return this.isLoggedIn ? appPages : appPagesAnon;
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
              console.log("Confirm Cancel:", blah);
            },
          },
          {
            text: "Okay",
            id: "confirm-button",
            handler: () => {
              console.log("Confirm Okay");
            },
          },
        ],
      });
      return alert.present();
    },
    changeToggle($ev) {
      const is_on = $ev.detail.checked;
      const { changeBGM, turnMusicOnOff } = this;
      changeBGM({ is_on }).then(turnMusicOnOff);
    },

    loadBGM(track, currentTime) {
      const { changeBGM,  bgmTrack, addEventNextSong, bgm, bgmBookmark } = this;

      // Are we using bookmarked audio?
      const isTimeToPlayBookmark = null != bgmBookmark.track && false == bgm.saveBookmark

      const time      = isTimeToPlayBookmark ? bgmBookmark.currentTime : 0
      const playTrack = isTimeToPlayBookmark ? bgmBookmark.track : bgmTrack
      const audio     = new Audio( bgm.tracks[playTrack] )
      audio.currentTime = time
      // Set time to bookmarked audio 

      // Here set bookmarks if need to be saved and current
      // this.bookmark = bgm.saveBookmark ? bgm.audio : false
      if(bgm.saveBookmark)
        this.bgmBookmark.currentTime = currentTime  

      console.log("BOOKMARK", this.bookmark);
      console.log("BOOKMARK AUDIO", audio);

      // const audio = this.bookmark ? this.bookmark : new Audio( bgm.tracks[bgmTrack] );
      // audio: new Audio($fx.rpg[$fx.theme.rpg].bgm[bgmTrack]),

      // changeBGM({ audio }).then(addEventNextSong);
      // changeBGM({
      //   audio: new Audio($fx.rpg[$fx.theme.rpg].bgm[bgmTrack]),
      // }).then(addEventNextSong)

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
      const {
        bgm,
        $fx: { rpg, theme },
        playAudio,
      } = this;
      const maxTrackIndex = -1 + bgm.tracks.length;
      let   track         = bgm.track + inc;
      const cantGoBack    = track < 0;
      const hasNextTrack  = track <= maxTrackIndex && !cantGoBack;
      track = cantGoBack ? maxTrackIndex : hasNextTrack ? track : 0;
      this.changeBGM({ track, is_on: true }).then(playAudio);
    },

    playAudio() {
      const { bgm: {audio, track, is_on, startDelay, saveBookmark} } = this

      if (this.bgm.audio) {
        this.bgm.audio.pause();
        this.loadBGM(track, this.bgm.audio.currentTime);
        this.bgm.audio.load();
        this.bgm.audio.play();
      }
    },
  },
  watch: {
    theme: {
      handler(theme) {
        this.$forceUpdate();
        console.log(theme);
      },
      deep: true,
    },
    tracks:{
      handler() {
        const { changeBGM, playAudio, bgm: {audio, track, is_on, startDelay, saveBookmark} } = this
        if(audio)
          audio.pause()

        this.bgmBookmark.track = saveBookmark ? track : null 

        const startAudio = () => is_on ? setTimeout(playAudio, startDelay) : 0
        changeBGM({ is_on }).then(startAudio)
      },
    },
  },
  setup() {
    const route = useRoute();
    const store = useStore();
    useQueryProvider();

    const selectedIndex = ref(0);
    const menus = {
      app: {},
      user: {},
      support: {},
    };
    const userMenu = [];
    const labels = [
      "Family",
      "Friends",
      "Notes",
      "Work",
      "Travel",
      "Reminders",
    ];

    const path = window.location.pathname.split("folder/")[1];
    if (path !== undefined) {
      selectedIndex.value = appPages.findIndex(
        (page) => page.title.toLowerCase() === path.toLowerCase()
      );
    }

    store.dispatch("loadUsers");

    const bgm = computed(() => store.state.bgm);
    // const isBMGOn = ref(0);
    //   isBMGOn,

    return {
      bgm,
      isLoggedIn: computed(() => store.getters.isLoggedIn),
      selectedIndex,
      appPages,
      appPagesAnon,
      labels,
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
      isSelected: (url) => (url === route.path ? "selected" : ""),
    };
  },
});

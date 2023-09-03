import { computed, defineComponent } from "vue";
const requireImg = require.context("@/assets/icons/");
import backgrounds from "@/assets/images/backgrounds/parallax/index.js";

import InputSettings from "../XpSettings/components/InputSettings.vue";
import SuccessfulLoginModal from "./SuccessfulLoginModal.vue";

import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonMenuButton,
  IonTitle,
  IonContent,
  IonModal,
  IonCard,
  IonButton,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonInput,
  IonList,
  IonLabel,
  IonGrid,
  IonCol,
  IonRow,
  IonCardContent,
  IonItem,
  IonToggle,
  modalController,
} from "@ionic/vue";

import { arrowBack, arrowForward } from "ionicons/icons";
import { mapActions, useStore } from "vuex";
import { useRouter, useRoute } from "vue-router";

// interface RootState {
//   bgm: unknown;
//   // Specify other state properties here
// }

// interface Oauth {
//   domain: string;
//   authorize: string;
//   token: string;
//   me: string;
//   client_id: string;
//   client_secret: string;
//   redirect_uri: string;
//   access: Record<string, unknown>;
// }

export default defineComponent({
  name: "log-in",
  components: {
    InputSettings,
    SuccessfulLoginModal,
    IonItem,
    IonCardContent,
    IonGrid,
    IonCol,
    IonRow,
    IonCard,
    IonList,
    IonLabel,
    IonToggle,
    IonInput,
    IonButtons,
    IonButton,
    IonCardHeader,
    IonCardSubtitle,
    IonCardTitle,
    IonPage,
    IonHeader,
    IonToolbar,
    IonMenuButton,
    IonTitle,
    IonContent,
    IonModal,
  },
  data() {
    return {
      username: null,
      password: null,
      error: false,
      toggleBGDirection: 0,
      currentBG: 0,
      interval: 0,
      authDomain: "doit.forthexp.com",
      oauth: {
        domain: "doit.forthexp.com",
        authorize: "/oauth/authorize",
        token: "/oauth/token",
        me: "/oauth/me",
        client_id: "ou5F5T2fsFimg6rEzZx76jEHXY7cJfdeb6cQroz9",
        client_secret: "NypjizBfVSyZTbjbgXUbyjR1FfmlrLtwsGeREfwk",
        redirect_uri: "http://localhost:8100/log-in",
        access: {},
      },
    };
  },
  mounted() {
    this.animateLogo();
    this.interval = setInterval(this.changeBG, 5777);
    // this.getAccessToken()
    // const { $fx:{rpg, theme}, changeBGM } = this;
    // changeBGM({ tracks: rpg[theme.rpg].BGM.startScreen })
  },

  deactivated() {
    clearInterval(this.interval);
  },

  methods: {
    ...mapActions(["loginUser", "changeBGM"]),
    closeSuccessModal() {
      this.showSuccessModal = false;
      this.router.push({ name: "switch-profile" });
    },
    setBGStyle(key, value) {
      const { page } = this.$refs;
      if (page) {
        page.$el.style[key] = value;
      }
    },
    changeBG() {
      // if (this.$fx.theme.rpg == "earthbound") {
      //   this.enterBattle();
      //   return false;
      // }
      const { setBGStyle } = this;
      const values = Object.values(backgrounds);
      let prop = false;
      while (prop == false) {
        prop = Math.floor(Math.random() * values.length);
        prop = prop == this.currentBG ? false : values[prop];
      }

      this.currentBG = prop;
      // setBGStyle("backdropFilter", "blur(10px)");
      setBGStyle(
        "background",
        ` 
        url("${prop[0]}"),
        url("${prop[1]}")
      `
      );
      setBGStyle("backgroundSize", `cover`);
      this.toggleBGDirection = !this.toggleBGDirection;

      if (this.toggleBGDirection)
        setBGStyle("backgroundPosition", `right center, left center`);
      else setBGStyle("backgroundPosition", `left center, right center`);

      // setTimeout(() => setBGStyle("backdropFilter", "blur(0px)"), 3000);
    },

    clickSignIn() {
      const { domain, authorize, redirect_uri, client_id } = this.oauth;
      const params = new URLSearchParams({
        response_type: "code",
        redirect_uri,
        client_id,
      }).toString();

      this.$router.push("/switch-profile")
      modalController.dismiss()

      // window.location.href = `https://${domain}${authorize}?${params}`;
    },

    closeModal() {
      modalController.dismiss();
      this.play$fx("closePage");
    },
    animateLogo() {
      //DRY code, shoutout to Venkat Subramaniam
      let start = document.querySelector("#brand");
      let ex = 10;
      function swing(element) {
        function update(time) {
          const x = Math.sin(time / 1231) * ex;
          const y = Math.sin(time / 1458) * ex;

          element.style.transform = [
            `rotateX(${x}deg)`,
            `rotateY(${y}deg)`,
          ].join(" ");

          requestAnimationFrame(update);
        }
        update(0); //love your nested functions
      }

      swing(start);

      let start_button = start.querySelector("ion-button");
      // console.log(start_button);
      let og_color = start_button.style.color;

      start_button.style.borderRadius = "10px";

      let inter = 0;

      // start.addEventListener("mouseover", (e) => {
      //   ex = 20;
      //   inter = setInterval(() => {
      //     start_button.style.backgroundColor =
      //       "#" + Math.floor(Math.random() * 16777215).toString(16);
      //   }, 1000); //too clever? might change it
      // });

      inter = setInterval(() => {
        start_button.style.backgroundColor =
          "#" + Math.floor(Math.random() * 16777215).toString(16);
      }, 1000); //too clever? might change it

      start.addEventListener("mouseout", (e) => {
        ex = 10;
        // clearInterval(inter);
        // start_button.style['--background'] = og_color;
      });
    },

    async getAccessToken() {
      const {
        oauth: { domain, token, client_id, client_secret, redirect_uri },
        code,
      } = this;
      const url = `https://${domain}${token}`;
      const response = await fetch(url, {
        method: "POST",
        mode: "cors", // no-cors, *cors, same-origin
        cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
        // credentials: 'same-origin', // include, *same-origin, omit
        headers: {
          // 'Content-Type': 'application/json'
          "Content-Type": "application/x-www-form-urlencoded",
        },
        // body: JSON.stringify({
        //   grant_type: 'authorization_code',
        //   code,
        //   client_id,
        //   client_secret,
        //   redirect_uri
        // })
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          client_id,
          client_secret,
          redirect_uri,
        }),
      }).catch((error) => (this.error = error));
      return response.json().then(this.setAuthAccess);
    },

    setAuthAccess(data) {
      // alert();
      // console.log(data);
      this.oauth.access = data;
      this.fetchUserData().then(this.setUserData);
    },

    async fetchUserData() {
      const {
        setUserData,
        oauth: {
          domain,
          me,
          access: { access_token },
        },
      } = this;
      const url = `https://${domain}${me}?access_token=${access_token}`;
      const response = await fetch(url);
      return response.json();
    },

    setUserData(data) {
      // console.log(data);
      // this.dispatch('')

      this.loginUser();
      this.showSuccessModal = true;
      this.error = false;
    },
  },
  setup() {
    const store = useStore();
    const bgm = computed(() => store.state.bgm);
    const router = useRouter();
    const route = useRoute();

    const { code } = route.query;

    // fake login
    // if(code){
    //   router.push('/switch-profile')

    // }

    return {
      code,
      router,
      bgm,
      requireImg,
    };
  },
});

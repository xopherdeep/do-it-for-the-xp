import { computed, defineComponent, ref, Ref } from "vue";
const requireImg = require.context("@/assets/icons/");
import backgrounds from "@/assets/images/backgrounds/parallax/index.js";

// Import package.json for version information
import packageInfo from '@/../package.json';

import InputSettings from "../XpSettings/components/InputSettings.vue";
import SuccessfulLoginModal from "./SuccessfulLoginModal.vue";

import { modalController } from "@ionic/vue";

import { mapActions, useStore } from "vuex";
import { useRouter, useRoute } from "vue-router";
import ionic from "@/mixins/ionic";
import { RootState } from "@/types/store";

interface BackgroundPair {
  [key: number]: string[];
}

interface Oauth {
  domain: string;
  authorize: string;
  token: string;
  me: string;
  client_id: string;
  client_secret: string;
  redirect_uri: string;
  access: Record<string, any>;
}

interface ComponentData {
  username: string | null;
  password: string | null;
  error: boolean | string;
  toggleBGDirection: boolean;
  currentBG: number | any;
  interval: ReturnType<typeof setInterval> | number;
  inactivityTimer: ReturnType<typeof setTimeout> | number;
  authDomain: string;
  oauth: Oauth;
  version: string;
}

export default defineComponent({
  name: "log-in",
  mixins: [ionic],
  components: {
    InputSettings,
    SuccessfulLoginModal,
  },
  data(): ComponentData {
    return {
      username: null,
      password: null,
      error: false,
      toggleBGDirection: false,
      currentBG: 0,
      interval: 0,
      inactivityTimer: 0,
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
      version: packageInfo.version,
    };
  },
  mounted(): void {
    this.animateLogo();
    
    // Set a simple timeout to redirect to the intro screen after 60 seconds
    // No route check needed - this component is only mounted on the login page
    this.inactivityTimer = setTimeout(() => {
      console.log('Login timeout - redirecting to intro screen');
      this.$router.push('/xp-demo');
    }, 18000);
  },

  // Clear timer when component is deactivated (for kept-alive components)
  deactivated(): void {
    if (this.interval) {
      clearInterval(this.interval as ReturnType<typeof setInterval>);
    }
    
    this.clearInactivityTimer();
  },
  
  // Clear timer when component is unmounted (destroyed)
  unmounted(): void {
    this.clearInactivityTimer();
  },
  
  // Also clear when user navigates away (route change)
  beforeRouteLeave() {
    this.clearInactivityTimer();
  },

  methods: {
    ...mapActions(["loginUser", "changeBGM"]),
    
    // Helper method to clear the inactivity timer
    clearInactivityTimer(): void {
      if (this.inactivityTimer) {
        console.log('Clearing inactivity timer');
        clearTimeout(this.inactivityTimer as ReturnType<typeof setTimeout>);
        this.inactivityTimer = 0;
      }
    },
    
    closeSuccessModal(): void {
      (this as any).showSuccessModal = false;
      this.router.push({ name: "xp-profile" });
    },

    pressStart(): void {
      this.router.push({ name: "xp-profile" });
    },
    setBGStyle(key: string, value: string): void {
      const page = (this.$refs as any).page;
      if (page) {
        page.$el.style[key] = value;
      }
    },
    // Keep changeBG method for reference, but it won't be called automatically now
    changeBG(): void | boolean {
      // if (this.$fx.theme.rpg == "earthbound") {
      //   this.enterBattle();
      //   return false;
      // }
      const { setBGStyle } = this;
      const values = Object.values(backgrounds as BackgroundPair);
      let prop: any = false;
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

    clickSignIn(): void {
      const { domain, authorize, redirect_uri, client_id } = this.oauth;
      const params = new URLSearchParams({
        response_type: "code",
        redirect_uri,
        client_id,
      }).toString();

      this.$router.push("/switch-profile");
      modalController.dismiss();

      // window.location.href = `https://${domain}${authorize}?${params}`;
    },

    closeModal(): void {
      modalController.dismiss();
      (this as any).play$fx("closePage");
    },
    
    animateLogo(): void {
      //DRY code, shoutout to Venkat Subramaniam
      const start = document.querySelector("#brand") as HTMLElement;
      const ex = 10;
      function swing(element: HTMLElement) {
        function update(time: number) {
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

      const start_button = start.querySelector("ion-button") as HTMLElement;
      // console.log(start_button);
      const og_color = start_button.style.color;

      start_button.style.borderRadius = "10px";

      // let inter: ReturnType<typeof setInterval> = 0 as unknown as ReturnType<typeof setInterval>;

      // start.addEventListener("mouseover", (e) => {
      //   ex = 20;
      //   inter = setInterval(() => {
      //     start_button.style.backgroundColor =
      //       "#" + Math.floor(Math.random() * 16777215).toString(16);
      //   }, 1000); //too clever? might change it
      // });

      // inter = setInterval(() => {
      //   start_button.style.backgroundColor =
      //     "#" + Math.floor(Math.random() * 16777215).toString(16);
      // }, 1000); //too clever? might change it

      // start.addEventListener("mouseout", (e) => {
      //   ex = 10;
      //   // clearInterval(inter);
      //   // start_button.style['--background'] = og_color;
      // });
    },

    async getAccessToken(): Promise<any> {
      const {
        oauth: { domain, token, client_id, client_secret, redirect_uri },
        code,
      } = this as any;
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

    setAuthAccess(data: any): void {
      // alert();
      // console.log(data);
      this.oauth.access = data;
      this.fetchUserData().then(this.setUserData);
    },

    async fetchUserData(): Promise<any> {
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

    setUserData(data: any): void {
      // console.log(data);
      // this.dispatch('')

      this.loginUser();
      (this as any).showSuccessModal = true;
      this.error = false;
    },
  },
  setup() {
    const store = useStore<RootState>();
    const bgm = computed(() => store.state.bgm);
    const router = useRouter();
    const route = useRoute();
    const showSuccessModal: Ref<boolean> = ref(false);

    const code = route.query.code as string | undefined;

    // fake login
    // if(code){
    //   router.push('/switch-profile')

    // }

    return {
      showSuccessModal,
      code,
      router,
      bgm,
      requireImg,
      route,
    };
  },
});

import { computed, defineComponent } from "vue";
const requireImg = require.context("@/assets/icons/", false, /\.svg$/);
import backgrounds from "@/assets/images/backgrounds/parallax/index.js";

// Import package.json for version information
import packageInfo from '@/../package.json';

import InputSettings from "@/app/SideMenu/XpSettings/components/InputSettings.vue";

import { modalController } from "@ionic/vue";

import { useRouter, useRoute } from "vue-router";
import { useUserStore } from "@/lib/store/stores/user";
import { useAudioStore } from "@/lib/store/stores/audio";
import ionic from "@/lib/mixins/ionic";
import debug from "@/lib/utils/debug";

interface BackgroundPair {
  [key: number]: string[];
}

interface ComponentData {
  toggleBGDirection: boolean;
  currentBG: number | any;
  interval: ReturnType<typeof setInterval> | number;
  inactivityTimer: ReturnType<typeof setTimeout> | number;
  version: string;
}

export default defineComponent({
  name: "log-in",
  mixins: [ionic],
  components: {
    InputSettings,
  },
  data(): ComponentData {
    return {
      toggleBGDirection: false,
      currentBG: 0,
      interval: 0,
      inactivityTimer: 0,
      version: packageInfo.version,
    };
  },
  mounted(): void {
    this.animateLogo();

    // Set a simple timeout to send an idle log-in screen to the world demo after 18 seconds
    // No route check needed - this component is only mounted on the login page
    this.inactivityTimer = setTimeout(() => {
      debug.log('Login timeout - redirecting to intro screen');
      this.$router.push('/xp-demo');
    }, 18000);
  },

  // Clear timer when component is deactivated (for kept-alive components)
  deactivated(): void {
    clearInterval(this.interval as ReturnType<typeof setInterval>);

    this.clearInactivityTimer();
  },

  // Clear timer when component is unmounted (destroyed)
  unmounted(): void {
    this.clearInactivityTimer();
    const canStopAnimation = Boolean((this as any).stopAnimation);
    if (canStopAnimation) {
      (this as any).stopAnimation();
    }
  },

  // Also clear when user navigates away (route change)
  beforeRouteLeave() {
    this.clearInactivityTimer();
  },

  methods: {
    changeBGM(payload: any) { return (this as any).audioStore.changeBGM(payload) },

    // Helper method to clear the inactivity timer
    clearInactivityTimer(): void {
      const hasInactivityTimer = Boolean(this.inactivityTimer);
      if (hasInactivityTimer) {
        debug.log('Clearing inactivity timer');
        clearTimeout(this.inactivityTimer as ReturnType<typeof setTimeout>);
        this.inactivityTimer = 0;
      }
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

      const isFlipped = this.toggleBGDirection;
      if (isFlipped)
        setBGStyle("backgroundPosition", `right center, left center`);
      else setBGStyle("backgroundPosition", `left center, right center`);

      // setTimeout(() => setBGStyle("backdropFilter", "blur(0px)"), 3000);
    },

    closeModal(): void {
      modalController.dismiss();
      (this as any).play$fx("closePage");
    },

    animateLogo(): void {
      //DRY code, shoutout to Venkat Subramaniam
      const start = document.querySelector("#brand") as HTMLElement;
      if (!start) return;

      const ex = 10;
      let animationFrameId: number;

      const swing = (element: HTMLElement) => {
        const update = (time: number) => {
          const x = Math.sin(time / 1231) * ex;
          const y = Math.sin(time / 1458) * ex;

          element.style.transform = [
            `rotateX(${x}deg)`,
            `rotateY(${y}deg)`,
          ].join(" ");

          animationFrameId = requestAnimationFrame(update);
        }
        update(0);
      }

      swing(start);

      const start_button = start.querySelector("ion-button") as HTMLElement;
      if (start_button) {
        start_button.style.borderRadius = "10px";
      }

      // Store the cleanup function
      (this as any).stopAnimation = () => {
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
        }
      };
    },
  },
  setup() {
    const userStore = useUserStore();
    const audioStore = useAudioStore();
    const bgm = computed(() => audioStore.bgm);
    const router = useRouter();
    const route = useRoute();

    return {
      router,
      bgm,
      requireImg,
      route,
      userStore,
      audioStore
    };
  },
});

<template>
  <ion-menu content-id="main-content" type="overlay" class="overflow-hidden">
    <ion-content class="overflow-hidden">
      <ion-list id="inbox-list" class="border-none ion-no-padding">
        <ion-list-header>Do it for the XP</ion-list-header>
        <ion-note class="mb-0"> Life's Level Up & Reward System </ion-note>
        <ion-note class="w-full flex flex-row">
          <ion-chip
            color="success"
            @click="navigateToXpPage"
            class="cursor-pointer"
          >
            <i class="fad fa-hand-holding-seedling mr-2"></i>
            XP
          </ion-chip>
          <ion-chip
            color="warning"
            @click="navigateToGpPage"
            class="cursor-pointer"
          >
            <i class="fad fa-hand-holding-usd mr-2"></i>
            GP
          </ion-chip>
          <ion-chip
            color="danger"
            @click="navigateToApPage"
            class="cursor-pointer"
          >
            <i class="fad fa-hand-holding-magic mr-2"></i>
            AP
          </ion-chip>
        </ion-note>
        <ion-menu-toggle
          auto-hide="false"
          v-for="(menuItem, i) in getCurrentMenu()"
          :key="i"
        >
          <ion-item
            v-if="menuItem.title"
            @click="
              setMenuItem(i);
              $fx.ui[$fx.theme.ui].select.play();
            "
            router-direction="root"
            :router-link="menuItem.url"
            :lines="menuItem.lines"
            detail="false"
            class="hydrated"
            :class="{ selected: activeMenuItem === i }"
            button
          >
            <ion-icon
              slot="start"
              :ios="menuItem.iosIcon"
              :md="menuItem.mdIcon"
            ></ion-icon>
            <ion-label>{{ menuItem.title }}</ion-label>
          </ion-item>
          <div v-else>
            <hr class="w-full h-4" />
          </div>
        </ion-menu-toggle>
        <!-- <ion-note> Background Music (BGM) </ion-note> -->
        <hr class="w-full h-4" />
      </ion-list>
    </ion-content>

    <ion-footer>
      <ion-menu-toggle auto-hide="false">
        <XpMusicPlayer
          @toggleMusic="bgmToggle"
          @changeBGM="handleChangeBGM"
          :showTrackInfo="true"
        />

        <ion-item
          v-if="canInstall"
          @click="installApp"
          lines="none"
          detail="false"
          button
        >
          <ion-icon
            slot="start"
            :ios="icons.downloadOutline"
            :md="icons.downloadSharp"
            class="ml-2"
          />
          <ion-label>Install App</ion-label>
        </ion-item>

        <ion-item
          @click="
            setMenuItem(-1);
            $fx.ui[$fx.theme.ui].select.play();
          "
          router-direction="root"
          router-link="/log-out"
          lines="none"
          detail="false"
          button
        >
          <ion-icon
            slot="start"
            :ios="icons.lockClosedOutline"
            :md="icons.lockClosedSharp"
            class="ml-2"
          />
          <ion-label>Log Out</ion-label>
        </ion-item>
      </ion-menu-toggle>
      <!-- copyright -->
    </ion-footer>
  </ion-menu>
</template>

<script lang="ts">
  import { computed, defineComponent } from "vue";
  import ionic from "@/lib/mixins/ionic";
  import { useUserStore } from "@/lib/store/stores/user";
  import { useAudioStore } from "@/lib/store/stores/audio";
  import { useGameStore } from "@/lib/store/stores/game";
  import { useRoute } from "vue-router";
  import { useProStore } from "@/lib/store/stores/pro";
  import { proMenuIcon } from "@/lib/services/pro/membershipStatus";
  import { GM_PATH, canAccessGameMaster } from "@/router/_Guards/gm.guard";
  import { alertController } from "@ionic/vue";
  import { installState, installSteps, promptInstall } from "@/lib/services/pwa/installApp";
  import {
    downloadOutline,
    downloadSharp,
    logInOutline,
    logInSharp,
    lockClosedOutline,
    lockClosedSharp,
    fitnessOutline,
    fitnessSharp,
    fingerPrintOutline,
    fingerPrintSharp,
    helpOutline,
    helpSharp,
    informationOutline,
    informationSharp,
    infiniteOutline,
    infiniteSharp,
    moonOutline,
    moonSharp,
    pizzaOutline,
    pizzaSharp,
    ribbonOutline,
    ribbonSharp,
    sunnyOutline,
    sunnySharp,
  } from "ionicons/icons";
  import XpMusicPlayer from "./XpMusicPlayer/XpMusicPlayer.vue";

  export default defineComponent({
    name: "side-menu",
    mixins: [ionic],
    components: {
      XpMusicPlayer,
    },

    data() {
      return {
        activeMenuItem: 0, // Changed back to number
        icons: {
          downloadOutline,
          downloadSharp,
          lockClosedOutline,
          lockClosedSharp,
        },
        appPagesAnon: [
          {
            title: "Log In",
            url: "/log-in",
            iosIcon: logInOutline,
            mdIcon: logInSharp,
            lines: "none",
          },
        ],
        appPages: [
          {
            title: "Select Profile",
            url: "/xp-profile/",

            iosIcon: fingerPrintOutline,
            mdIcon: fingerPrintSharp,
            lines: "none",
          },
          {
            title: "",
          },
          // {
          //   title: "About XP",
          //   url: "/about-xp",
          //   iosIcon: informationOutline,
          //   mdIcon: informationSharp,
          //   lines: "none",
          // },

          {
            title: "Compendium",
            url: "/game-master",
            iosIcon: fitnessOutline,
            mdIcon: fitnessSharp,
            lines: "none",
          },
          {
            title: "Settings",
            url: "/xp-settings/",
            iosIcon: pizzaOutline,
            mdIcon: pizzaSharp,
            lines: "none",
          },

          {
            title: "",
          },
          {
            title: "XP Pro",
            url: "/xp-membership",
            // the icon follows the real plan: see proMenuIcon
            iosIcon: ribbonOutline,
            mdIcon: ribbonSharp,
            proIcon: true,

            lines: "none",
          },

          {
            title: "Party Invites",
            url: "/tell-a-friend",
            iosIcon: infiniteOutline,
            mdIcon: infiniteSharp,
            lines: "none",
          },
          {
            title: "",
          },

          {
            title: "About XP",
            url: "/xp-intro",
            iosIcon: informationOutline,
            mdIcon: informationSharp,
            lines: "none",
          },
          {
            title: "Help Desk",
            url: "/xp-support",
            // iosIcon: helpBuoyOutline,
            // mdIcon: helpBuoySharp,
            iosIcon: helpOutline,
            mdIcon: helpSharp,
            lines: "none",
          },
        ],
      };
    },
    computed: {
      theme() {
        return (this as any).gameStore.theme;
      },
      bgm() {
        return (this as any).audioStore.bgm;
      },
      logoutMenuItem() {
        const { appPages } = this;
        return appPages.find((item) => item.title === "Log Out");
      },
    },
    methods: {
      setMenuItem(index) {
        this.activeMenuItem = index;
      },
      initialIndex(): number {
        const pathname = window.location.pathname;
        const menu = this.getCurrentMenu();

        // Find the menu item whose URL matches the current path
        const index = menu.findIndex(
          (page) => page.url && pathname.startsWith(page.url)
        );

        // Return the found index or 0 if no match
        return index >= 0 ? index : 0;
      },
      ...{
        changeBGM(payload: any) {
          return (this as any).audioStore.changeBGM(payload);
        },
        turnMusicOnOff(payload: any) {
          return (this as any).audioStore.turnMusicOnOff(payload);
        },
        changeSoundFX(payload: any) {
          return (this as any).gameStore.changeSoundFX(payload);
        },
      },
      getCurrentMenu() {
        const { appPagesAnon, isLoggedIn, canOpenGameMaster, proIcon } = this;
        if (!isLoggedIn) return appPagesAnon;
        // XP Pro shows the sun (yearly, lifetime), the moon (monthly) or a ribbon (free)
        const appPages = this.appPages.map((page: any) => (page.proIcon ? { ...page, ...proIcon } : page));
        // The Compendium (/game-master) is for Game Masters; everyone else never sees the entry.
        // The router guard enforces it, hiding it just keeps the door out of sight.
        return canOpenGameMaster
          ? appPages
          : appPages.filter((page) => page.url !== GM_PATH);
      },
      bgmToggle($event) {
        // Call the store action directly instead of just emitting
        this.turnMusicOnOff($event.detail.checked);
        // Still emit the event for any parent components that might be listening
        this.$emit("toggleBGM", $event);
      },

      bgmNext() {
        this.changeBGM(1);
        this.$emit("changeBGM", 1);
      },

      bgmPrev() {
        this.changeBGM(-1);
        this.$emit("changeBGM", -1);
      },

      handleChangeBGM(direction) {
        // Call the store action directly
        this.changeBGM(direction);
        // Still emit the event for any parent components
        this.$emit("changeBGM", direction);
      },
      // Chrome, Edge and Android show their own install dialog; Safari only installs from its menus, so show the steps
      async installApp() {
        this.$fx.ui[this.$fx.theme.ui].select.play();
        if (installState.route === "prompt") {
          await promptInstall();
          return;
        }
        const steps = installSteps(installState.route);
        if (!steps) return;
        const alert = await alertController.create({ ...steps, buttons: ["Got it"] });
        await alert.present();
      },
      navigateToGpPage() {
        this.$fx.ui[this.$fx.theme.ui].select.play();
        this.$router.push("/about-xp/gp");
      },
      navigateToXpPage() {
        this.$fx.ui[this.$fx.theme.ui].select.play();
        this.$router.push("/about-xp/xp");
      },
      navigateToApPage() {
        this.$fx.ui[this.$fx.theme.ui].select.play();
        this.$router.push("/about-xp/ap");
      },
    },
    setup() {
      const userStore = useUserStore();
      const audioStore = useAudioStore();
      const gameStore = useGameStore();
      const route = useRoute();

      const proStore = useProStore();
      const proIcon = computed(() => {
        const kind = proMenuIcon(proStore.isPro, proStore.plan);
        if (kind === "sun") return { iosIcon: sunnyOutline, mdIcon: sunnySharp };
        if (kind === "moon") return { iosIcon: moonOutline, mdIcon: moonSharp };
        return { iosIcon: ribbonOutline, mdIcon: ribbonSharp };
      });

      return {
        proIcon,
        // Shown until the game runs installed, and only where this browser can install it
        canInstall: computed(() => ["prompt", "ios", "mac-safari"].includes(installState.route)),
        isLoggedIn: computed(() => userStore.currentUser.isAuthenticated),
        // Same rule as the /game-master router guard, so the menu never offers a door that is locked
        canOpenGameMaster: computed(() => canAccessGameMaster(userStore)),
        route,
        userStore,
        audioStore,
        gameStore,
      };
    },
    mounted() {
      // Set the active menu item based on the current URL when component mounts
      this.activeMenuItem = this.initialIndex();
    },
    watch: {
      // Update active menu item when route changes
      $route() {
        this.activeMenuItem = this.initialIndex();
      },
      // Compendium appears or disappears (profiles finish loading, someone switches profile),
      // which shifts every index after it, so find the highlighted row again
      canOpenGameMaster() {
        this.activeMenuItem = this.initialIndex();
      },
    },
  });
</script>

<style lang="scss">
  .menu-spacer {
    flex: 1;
    min-height: 20px;
  }

  ion-content {
    display: flex;
    flex-direction: column;
    height: 100%;

    :deep(.inner-scroll) {
      display: flex;
      flex-direction: column;
    }
  }

  .logout-section {
    margin-top: auto;
    padding-bottom: 20px;
  }

  /* Music player specific styling */
  ion-footer {
    ion-menu-toggle {
      display: block;

      .xp-music-player {
        padding: 8px 12px;
        margin-bottom: 10px;
        border-top: 1px solid rgba(var(--ion-color-primary-rgb), 0.2);
        border-bottom: 1px solid rgba(var(--ion-color-primary-rgb), 0.2);
        background-color: rgba(var(--ion-color-primary-rgb), 0.05);
      }
    }
  }
</style>

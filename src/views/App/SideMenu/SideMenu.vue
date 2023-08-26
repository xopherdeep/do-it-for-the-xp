<template>
  <ion-menu
    content-id="main-content"
    type="overlay"
  >
    <ion-content>
      <ion-list id="inbox-list">
        <ion-list-header>XP</ion-list-header>
        <ion-note> Do it for the XP </ion-note>
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
          <hr v-else />
        </ion-menu-toggle>
      </ion-list>
      <ion-list>
        <ion-note> Background Music (BGM) </ion-note>
        <ion-item>
          <i class="fad fa-music"> </i>
          <ion-buttons>
            <ion-toggle
              @ionChange="bgmToggle"
              :checked="bgm.is_on"
            ></ion-toggle>
            <ion-button @click="bgmPrev">
              <i class="fad fa-step-backward"></i>
            </ion-button>
            <ion-button @click="bgmNext">
              <i class="fad fa-step-forward"></i>
            </ion-button>
          </ion-buttons>
        </ion-item>
      </ion-list>
    </ion-content>
  </ion-menu>
</template>

<script lang="ts">
  import { computed, defineComponent } from "vue";
  import { mapActions, mapState, useStore } from "vuex";
  import ionic from "@/mixins/ionic";
  import {
    megaphoneOutline,
    megaphoneSharp,
    settingsOutline,
    settingsSharp,
    helpBuoySharp,
    helpBuoyOutline,
    informationCircleOutline,
    informationCircleSharp,
    logOutOutline,
    logOutSharp,
    diamondOutline,
    diamondSharp,
    shareOutline,
    shareSharp,
    peopleCircleOutline,
    peopleCircleSharp,
    logInOutline,
    logInSharp,
    gameControllerOutline,
    gameControllerSharp,
    optionsOutline,
    optionsSharp,
    lockClosedOutline,
    lockClosedSharp,
  } from "ionicons/icons";

  export default defineComponent({
    name: "side-menu",
    mixins: [ionic],

    data() {
      return {
        activeMenuItem: 0,
        appPagesAnon: [
          {
            title: "Log In",
            url: "/log-in",
            iosIcon: logInOutline,
            mdIcon: logInSharp,
            lines: "none"
          },
        ],
        appPages: [
          // {
          //   title: "Home",
          //   url: "/home",
          //   iosIcon: peopleCircleOutline,
          //   mdIcon: peopleCircleSharp,
          // },
          {
            title: "Switch Profile",
            url: "/switch-profile",
            iosIcon: peopleCircleOutline,
            mdIcon: peopleCircleSharp,
            lines: "none"
          },
          {
            title: "Settings",
            url: "/xp-settings/",
            iosIcon: optionsOutline,
            mdIcon: optionsSharp,
            lines: "full"
          },
          {
            title: "",
          },
          {
            title: "Subscription",
            url: "/xp-membership",
            iosIcon: diamondOutline,
            mdIcon: diamondSharp,
            lines: "none"
          },
          {
            title: "FAQ & Support",
            url: "/xp-support",
            iosIcon: helpBuoyOutline,
            mdIcon: helpBuoySharp,
            lines: "none"
          },
          {
            title: "Tell a Friend",
            url: "/tell-a-friend",
            iosIcon: megaphoneOutline,
            mdIcon: megaphoneSharp,
            lines: "none"
          },
          {
            title: "About Us",
            url: "/about-xp",
            iosIcon: informationCircleOutline,
            mdIcon: informationCircleSharp,
            lines: "full"
          },
          {
            title: "",
          },
          // {
          //   title: "Delete Profile",
          //   url: "/log-out",
          //   iosIcon: logOutOutline,
          //   mdIcon: logOutSharp,
          // },
          {
            title: "",
          },
          {
            title: "Game Master",
            url: "/game-master",
            iosIcon: gameControllerOutline,
            mdIcon: gameControllerSharp,

            lines: "none"
          },
          {
            title: "Log Out",
            url: "/log-out",
            iosIcon: lockClosedOutline,
            mdIcon: lockClosedSharp,
            lines: "none"
          },
        ],
      };
    },
    computed: {
      ...mapState(["theme", "bgm"]),
    },
    methods: {
      setMenuItem(index) {
        this.activeMenuItem = index;
      },
      initialIndex(): number {
        const { pathname } = window.location;
        const [, name] = pathname.split("/");

        if (name !== undefined && this.appPages) {
          return this.appPages.findIndex(
            (page) => page.title.toLowerCase() === name.toLowerCase()
          );
        }
        return 1;
      },
      ...mapActions(["changeBGM", "turnMusicOnOff", "changeSoundFX"]),
      getCurrentMenu() {
        const { appPages, appPagesAnon, isLoggedIn } = this;
        return isLoggedIn ? appPages : appPagesAnon;
      },
      bgmToggle($event) {
        this.$emit("toggleBGM", $event);
      },

      bgmNext() {
        this.$emit("changeBGM", 1);
      },

      bgmPrev() {
        this.$emit("changeBGM", -1);
      },
    },
    setup() {
      const store = useStore();

      return {
        isLoggedIn: computed(() => store.getters.isLoggedIn),
      };
    },
  });
</script>

<style lang="scss"></style>

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
          <!-- Use ion-item-divider for a themed divider when title is empty -->
          <!-- <ion-list-divider v-else /> -->
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
import { useRoute } from "vue-router";
import {
  megaphoneOutline,
  megaphoneSharp,
  helpBuoySharp,
  helpBuoyOutline,
  informationCircleOutline,
  informationCircleSharp,
  diamondOutline,
  diamondSharp,
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
  heartHalfOutline,
  heartHalfSharp,
  homeOutline,
  homeSharp,
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
          lines: "none",
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
          title: "XP Family",
          url: "/game-master",
          iosIcon:  homeOutline,
          mdIcon: homeSharp,

          lines: "none",
        },
        {
          title: "Switch XP Profile",
          url: "/xp-profile/",

          iosIcon: heartHalfOutline,
          mdIcon: heartHalfSharp,
          lines: "none",
        },
        {
          title: "",
        },
        {
          title: "Subscription",
          url: "/xp-membership",
          iosIcon: diamondOutline,
          mdIcon: diamondSharp,
          lines: "none",
        },
        {
          title: "Tell a Friend",
          url: "/tell-a-friend",
          iosIcon: megaphoneOutline,
          mdIcon: megaphoneSharp,
          lines: "none",
        },
        {
          title: "FAQ & Support",
          url: "/xp-support",
          iosIcon: helpBuoyOutline,
          mdIcon: helpBuoySharp,
          lines: "none",
        },
        {
          title: "About Us",
          url: "/about-xp",
          iosIcon: informationCircleOutline,
          mdIcon: informationCircleSharp,
          lines: "full",
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
          title: "Settings",
          url: "/xp-settings/",
          iosIcon: optionsOutline,
          mdIcon: optionsSharp,
          lines: "full",
        },
        {
          title: "Log Out",
          url: "/log-out",
          iosIcon: lockClosedOutline,
          mdIcon: lockClosedSharp,
          lines: "none",
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
      const pathname = window.location.pathname;
      const menu = this.getCurrentMenu();

      // Find the menu item whose URL matches the current path
      const index = menu.findIndex(
        (page) => page.url && pathname.startsWith(page.url)
      );

      // Return the found index or 0 if no match
      return index >= 0 ? index : 0;
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
    const route = useRoute();

    return {
      isLoggedIn: computed(() => store.getters.isLoggedIn),
      route,
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
  },
});
</script>

<style lang="scss"></style>

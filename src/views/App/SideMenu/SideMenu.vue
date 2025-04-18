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
          <div v-else>
            <hr class="w-full bg-medium-contrast" />
          </div>
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

    <ion-footer>
      <ion-menu-toggle auto-hide="false">
        <ion-item
          @click="
              setMenuItem(-1);
            $fx.ui[$fx.theme.ui].select.play();
            "
          router-direction="root"
          router-link="/log-out"
          lines="none"
          detail="false"
          class="hydrated"
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
      <ion-item
        lines="none"
        class="logout-section"
      >
        <ion-label class="ion-text-center">
          <p>© 2025 XP</p>
          <small>All rights reserved.</small>
        </ion-label>
      </ion-item>
    </ion-footer>
  </ion-menu>
</template>

<script lang="ts">
import { computed, defineComponent } from "vue";
import { mapActions, mapState, useStore } from "vuex";
import ionic from "@/mixins/ionic";
import { useRoute } from "vue-router";
import {
  informationCircleOutline,
  informationCircleSharp,
  diamondOutline,
  diamondSharp,
  logInOutline,
  logInSharp,
  optionsOutline,
  optionsSharp,
  lockClosedOutline,
  lockClosedSharp,
  heartOutline,
  heartSharp,
  fingerPrintOutline,
  fingerPrintSharp,
  shareSocialOutline,
  shareSocialSharp,
  helpCircleOutline,
  helpCircleSharp,
  batteryChargingOutline,
  batteryChargingSharp,
  fitnessOutline,
  fitnessSharp,
  flowerOutline,
  flowerSharp,
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
} from "ionicons/icons";

export default defineComponent({
  name: "side-menu",
  mixins: [ionic],

  data() {
    return {
      activeMenuItem: 0,  // Changed back to number
      icons: {
        lockClosedOutline,
        lockClosedSharp
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
        // {
        //   title: "Home",
        //   url: "/home",
        //   iosIcon: peopleCircleOutline,
        //   mdIcon: peopleCircleSharp,
        // },
        {
          title: "Switch Profile",
          url: "/xp-profile/",

          iosIcon: fingerPrintOutline,
          mdIcon: fingerPrintSharp,
          lines: "none",
        },
        {
          title: "Family",
          url: "/game-master",
          iosIcon: heartOutline,
          mdIcon: heartSharp,

          lines: "none",
        },

        {
          title: "Settings",
          url: "/xp-settings/",
          iosIcon: pizzaOutline,
          mdIcon: pizzaSharp,
          lines: "full",
        },
        {
          title: "",
        },
        {
          title: "Subscription",
          url: "/xp-membership",
          // iosIcon: fitnessOutline,
          // mdIcon: fitnessSharp,
          iosIcon: moonOutline,
          mdIcon: moonSharp,
          lines: "none",
        },
        {
          title: "Tell a Friend",
          url: "/tell-a-friend",
          iosIcon: infiniteOutline,
          mdIcon: infiniteSharp,
          lines: "none",
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
          title: "About XP",
          url: "/about-xp",
          iosIcon: informationOutline,
          mdIcon: informationSharp,
          lines: "full",
        },
        {
          title: "FAQ & Support",
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
    ...mapState(["theme", "bgm"]),
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

<style lang="scss">
.menu-spacer {
  flex: 1;
  min-height: 20px;
}

ion-content {
  display: flex;
  flex-direction: column;
  height: 100%;

  ::v-deep(.inner-scroll) {
    display: flex;
    flex-direction: column;
  }
}

.logout-section {
  margin-top: auto;
  padding-bottom: 20px;
}
</style>

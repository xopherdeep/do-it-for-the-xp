<template>
  <ion-menu content-id="main-content" type="overlay">
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
              selectedIndex = i;
              $fx.ui[$fx.theme.ui].select.play();
            "
            router-direction="root"
            :router-link="menuItem.url"
            lines="none"
            detail="false"
            class="hydrated"
            :class="{ selected: selectedIndex === i }"
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
            <ion-toggle @ionChange="bgmToggle" :checked="bgm.is_on"></ion-toggle>
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
  import { computed, defineComponent, ref } from 'vue'
  import { mapActions, mapState, useStore } from 'vuex';
  import ionic from "@/mixins/ionic";
  import {
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
    logInSharp
  } from "ionicons/icons";

  export default defineComponent({
    name: 'side-menu',
    mixins: [ionic],
    data(){
      return {
        appPagesAnon: [
          {
            title: "Log In",
            url: "/log-in",
            iosIcon: logInOutline,
            mdIcon: logInSharp,
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
            },
            {
              title: "Settings",
              url: "/xp-settings/",
              iosIcon: settingsOutline,
              mdIcon: settingsSharp,
            },
            {
              title: ''
            },
            {
              title: "Membership",
              url: "/xp-membership",
              iosIcon: diamondOutline,
              mdIcon: diamondSharp,
            },
            {
              title: "FAQ & Support",
              url: "/xp-support",
              iosIcon: helpBuoyOutline,
              mdIcon: helpBuoySharp,
            },
            {
              title: "Tell a Friend",
              url: "/tell-a-friend",
              iosIcon: shareOutline,
              mdIcon: shareSharp,
            },
            {
              title: "About XP",
              url: "/about-xp",
              iosIcon: informationCircleOutline,
              mdIcon: informationCircleSharp,
            },
            {
              title: ''
            },
            // {
            //   title: "Delete Profile",
            //   url: "/log-out",
            //   iosIcon: logOutOutline,
            //   mdIcon: logOutSharp,
            // },
            {
              title: ''
            },
            {
              title: "Log Out",
              url: "/log-out",
              iosIcon: logOutOutline,
              mdIcon: logOutSharp,
            }
        ]

      }
    },
    computed: {
    ...mapState(["theme", "bgm"]),
      selectedIndex(): number {
        const path = window.location.pathname.split("folder/")[1];

        if (path !== undefined && this.appPages) {
          return this.appPages.findIndex(
            (page) => page.title.toLowerCase() === path.toLowerCase()
          );
        }

        return 0 
      },

    },
    methods:{
      ...mapActions(["changeBGM", "turnMusicOnOff", "changeSoundFX"]),
      getCurrentMenu() {
        const { appPages, appPagesAnon, isLoggedIn} = this
        return isLoggedIn 
          ? appPages 
          : appPagesAnon;
      },
      bgmToggle($event){
        this.$emit('toggleBGM', $event)
      },

      bgmNext(){
        this.$emit('changeBGM', 1)
      },

      bgmPrev(){
        this.$emit('changeBGM', -1)
      },
    },
    setup(){


      const store = useStore()

      return {
        isLoggedIn: computed(() => store.getters.isLoggedIn),
      }
    },


  })
</script>

<style lang="scss">

</style>
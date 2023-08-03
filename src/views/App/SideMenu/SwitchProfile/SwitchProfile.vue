<template>
  <ion-page :class="$options.name">
    <ion-header :translucent="true">
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <ion-menu-button
            color="primary"
            @click="$fx.ui[$fx.theme.ui].select.play()"
          ></ion-menu-button>
          <ion-button>
            <i class="fad fa-save fa-2x"></i>
          </ion-button>
        </ion-buttons>
        <ion-title>
          Choose Save Profile
        </ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <ion-header collapse="condense">
        <ion-toolbar>
          <ion-title size="large">{{ $route.params.id }}</ion-title>
        </ion-toolbar>
      </ion-header>

      <div id="container">
        <ion-grid>
          <ion-row>
            <ion-col
              v-for="(user, key) in profiles"
              :key="key"
              size="6"
              size-sm="4"
              size-md="3"
              size-xl="2"
            >
              <ion-card class="ion-no-margin" button @click="clickUser(user)">
                <ion-card-title>
                  {{ user.name.first }}
                </ion-card-title>
                <ion-card-header>
                  <ion-avatar>
                    <img :src="getUserAvatar(user)" />
                  </ion-avatar>
                </ion-card-header>
                <ion-card-content>
                  {{ user.name.nick }}
                </ion-card-content>
              </ion-card>
            </ion-col>
          </ion-row>
        </ion-grid>
      </div>
    </ion-content>
    <add-profile @addProfile="refreshProfiles" />
  </ion-page>
</template>

<script lang="ts">
  import ionic from "@/mixins/ionic";
  import users from "@/api/users.api";
  
  const requireAvatar = require.context("@/assets/images/avatars/");

  import { add } from "ionicons/icons";

  import {
    useIonRouter,
  } from "@ionic/vue";
  import { mapActions, useStore } from 'vuex';
  import { computed, defineComponent, ref } from '@vue/runtime-core';
  import AddProfile from './AddProfile/AddProfile.vue';

  export default defineComponent({
    name: "switch-profile",
    mixins: [ ionic ],
    components: {
      AddProfile
    },
    data() {
      return {
        users,
      };
    },

    methods: {
      ...mapActions(["loginUser"]),
      clickAddProfile(){
        this.ionRouter.navigate(`/new-profile`, "forward");
      },
      getUserAvatar(user) {
        const { avatar } = user
        if(avatar) {
          return requireAvatar(`./${user.avatar}.svg`);
        }
      },
      refreshProfiles() {
        this.refresh = !this.refresh
      },
      clickUser(user) {
        this.loginUser(user)
        this.ionRouter.navigate(`/my-portal/${user.id}`, "forward");
      },
    },
    setup() {
      const refresh = ref(false)
      const store = useStore() 
      const bgm = computed(() => store.state.bgm);
      const ionRouter = useIonRouter();
      const profiles = computed(() => {
        refresh.value
        return JSON.parse(localStorage.getItem('profiles') || '')
      });
      return {
        bgm,
        add,
        ionRouter,
        profiles,
        refresh
      };
    },
  });
</script>

<style scoped lang="scss">
  ion-content {
    --background: transparent;

    #container {
      height: 100vh;
      background-color: #68a8d8;
      background-image: linear-gradient(
          45deg,
          #80d890 25%,
          transparent 25%,
          transparent 75%,
          #80d890 75%
        ),
        linear-gradient(
          45deg,
          #80d890 25%,
          transparent 25%,
          transparent 75%,
          #80d890 75%
        );
      background-size: 60px 60px;
      background-position: 0 0, 30px 30px;
      animation: slide 4s infinite linear;
    }
  }
  .switch-profile {
    ion-card {
      text-align: center;
      width: calc(100% - 35px);
      // min-width: calc(15vw)
    }

    ion-avatar {
      margin: auto;
    }
    /* #container {
    text-align: center;
    position: absolute;
    left: 0;
    right: 0;
    top: 50%;
    transform: translateY(-50%);
  } */

    #container strong {
      font-size: 20px;
      line-height: 26px;
    }

    #container p {
      font-size: 16px;
      line-height: 22px;
      color: #8c8c8c;
      margin: 0;
    }

    #container a {
      text-decoration: none;
    }
  }

  @keyframes slide {
    from {
      background-position: 0 0, 30px 30px;
    }

    to {
      background-position: 0 0, -30px -30px;
    }
  }
</style>
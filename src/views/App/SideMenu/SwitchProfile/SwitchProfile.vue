<template>
  <ion-page :class="$options.name">
    <ion-header :translucent="true">
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <ion-menu-button
            color="primary"
            @click="$fx.ui[$fx.theme.ui].select.play()"
          ></ion-menu-button>
          <ion-button class="m-8">
            <ion-icon :ios="peopleCircleOutline" :md="peopleCircleSharp" />
          </ion-button>
        </ion-buttons>
        <ion-title> Choose Profile Save </ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content :fullscreen="true" id="container" class="ion-padding">
      <ion-card>
        <ion-card-content>
          <ion-list>
            <ion-item
              v-for="(profile, key) in profiles"
              :key="key"
              button
              detail="true"
              @click="clickProfile(profile)"
            >
              <ion-label>
                <h2>{{ profile.name.full }}</h2>
                <p>{{ profile.name.nick }}</p>
              </ion-label>
              <ion-avatar slot="end">
                <img :src="getUserAvatar(profile)" />
              </ion-avatar>
              <ion-label slot="end">
                <h2>Level: {{ profile.stats.level }}</h2>
                <p><b>XP:</b> {{ profile.stats.xp.now }}</p>
              </ion-label>
            </ion-item>
          </ion-list>
          <ion-buttons>
            <ion-button @click="openModal"> Start New Profile</ion-button>
          </ion-buttons>
        </ion-card-content>
      </ion-card>
    </ion-content>
    <ion-fab
      :class="$options.name"
      vertical="bottom"
      horizontal="center"
      slot="fixed"
    >
      <ion-fab-button @click="openModal">
        <ion-icon :icon="add"></ion-icon>
      </ion-fab-button>
    </ion-fab>
  </ion-page>
</template>

<script lang="ts">
  import { useIonRouter } from "@ionic/vue";
  import { mapActions, useStore } from "vuex";
  import { computed, defineComponent, ref } from "@vue/runtime-core";
  import ionic from "@/mixins/ionic";
  import { add, peopleCircleSharp, peopleCircleOutline } from "ionicons/icons";
  import User from "@/utils/User";
  import { Drivers, Storage } from "@ionic/storage";

  import { modalController } from "@ionic/vue";
  import { ProfileDb } from "@/databases";

  import AddProfile from "./AddProfile/AddProfile.vue";

  const requireAvatar = require.context("@/assets/images/avatars/");

  export const profileStorage = new Storage({
    name: "__profiles",
    driverOrder: [Drivers.IndexedDB, Drivers.LocalStorage],
  });

  export default defineComponent({
    name: "switch-profile",
    mixins: [ionic],
    methods: {
      ...mapActions(["loginUser"]),

      clickAddProfile() {
        this.ionRouter.navigate(`/new-profile`, "forward");
      },

      getUserAvatar(user) {
        const { avatar } = user;
        if (avatar) {
          return requireAvatar(`./${user.avatar}.svg`);
        }
      },

      clickProfile(profile) {
        this.loginUser(profile);
        this.ionRouter.navigate(`/my-portal/${profile.id}`, "forward");
      },

      setProfiles(profiles: User[]) {
        this.profiles = profiles;
      },

      async loadProflies() {
        return await this.storage.getAll().then(this.setProfiles);
      },

      async openModal() {
        const modal = await modalController.create({
          component: AddProfile,
        });
        modal.onDidDismiss().then(this.loadProflies);
        modal.present();
      },
    },
    mounted() {
      this.loadProflies();
    },
    setup() {
      const refresh = ref(false);
      const store = useStore();
      const bgm = computed(() => store.state.bgm);
      const ionRouter = useIonRouter();

      const storage = new ProfileDb(profileStorage);
      const profiles = ref([] as User[]);

      return {
        storage,
        bgm,
        add,
        peopleCircleSharp,
        peopleCircleOutline,
        ionRouter,
        profiles,
        refresh,
      };
    },
  });
</script>
<style scoped lang="scss">
  ion-content {
    --background: transparent;

    &#container {
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

  ion-modal {
    .img-avatar {
      width: 100px;
      height: 100px;
      border-radius: 50%;
      flex-grow: 1;
      margin: 1em;
    }
    ion-input {
      text-align: right;
    }
  }
  ion-modal.auto-height {
    --height: auto;
  }
  ion-modal.auto-height .ion-page {
    position: relative;
    display: block;
    contain: content;
  }
  ion-modal.auto-height .ion-page .inner-content {
    max-height: 80vh;
    overflow: auto;
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
@/databases/profile @/databases/profile.db

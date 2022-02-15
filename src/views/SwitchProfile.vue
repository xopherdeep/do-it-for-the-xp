<template>
  <ion-page :class="$options.name">
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-menu-button color="primary" @click="$fx.ui[$fx.theme.ui].select.play()"></ion-menu-button>
        </ion-buttons>
        <ion-title>Choose Your Profile</ion-title>
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
              v-for="(user, key) in users"
              :key="key"
              size="6"
              size-md="6"
            >
              <ion-card class="ion-no-margin" button @click="clickUser(user)">
                <ion-card-header>
                  <ion-avatar>
                    <img :src="getUserAvatar(user)" />
                  </ion-avatar>
                  <ion-card-title> {{ user.name.first }} </ion-card-title>
                  <ion-card-subtitle> {{ user.name.nick }} </ion-card-subtitle>
                </ion-card-header>
                <ion-card-content> </ion-card-content>
              </ion-card>
            </ion-col>
          </ion-row>
        </ion-grid>
      </div>
    </ion-content>
<!-- fab placed to the (vertical) center and end -->
    <ion-fab vertical="bottom" horizontal="end" slot="fixed">
      <ion-fab-button>
        <ion-icon :icon="add"></ion-icon>
      </ion-fab-button>
    </ion-fab>
  </ion-page>
</template>

<script>
  import users from "@/assets/js/users.js";
  const requireAvatar = require.context("@/assets/images/avatars/");

  import { add } from "ionicons/icons"

  import {
    IonButtons,
    IonContent,
    IonHeader,
    IonMenuButton,
    IonPage,
    IonTitle,
    IonToolbar,
    useIonRouter,
  } from "@ionic/vue";

  export default {
    name: "switch-profile",
    components: {
      IonButtons,
      IonContent,
      IonHeader,
      IonMenuButton,
      IonPage,
      IonTitle,
      IonToolbar,
    },
    data() {
      return {
        users,
      };
    },
    methods: {
      getUserAvatar(user) {
        const avatar = `./${user.avatar}.svg`;
        return requireAvatar(avatar);
      },
      clickUser(user) {
        this.ionRouter.navigate(`/my-portal/${user.id}`, "forward");
      },
    },
    setup() {
      const ionRouter = useIonRouter();
      return {
        add,
        ionRouter,
      };
    },
  };
</script>

<style scoped lang="scss">
  .switch-profile {
    ion-card{
      text-align: center;
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
</style>

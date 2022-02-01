<template>
  <ion-page v-cloak>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-menu-button color="primary"></ion-menu-button>
        </ion-buttons>
        <ion-title>My Party</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <ion-header collapse="condense">
        <ion-toolbar>
          <ion-title size="large">{{ $route.params.id }}</ion-title>
        </ion-toolbar>
      </ion-header>
      <ion-grid>
        <ion-row>
          <ion-col v-for="(user, key) in users" :key="key" size="12" size-md="6" >
            <card-user-stats :id="user.id"/>
          </ion-col>
        </ion-row>
      </ion-grid>

      <div id="container"></div>
    </ion-content>
  </ion-page>
</template>

<script>
  import users from "@/assets/js/users.js";
  const requireAvatar = require.context("@/assets/images/avatars/");
  import CardUserStats from "./CardUserStats/CardUserStats.vue";

  import {
    IonButtons,
    IonContent,
    IonHeader,
    IonMenuButton,
    IonPage,
    IonTitle,
    IonToolbar,
    IonGrid,
    IonRow,
    IonCol,
  } from "@ionic/vue";
  export default {
    components: {
      IonGrid,
      IonRow,
      IonCol,
      CardUserStats,
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
    },
  };
</script>

<style scoped>
  #container {
    text-align: center;
    position: absolute;
    left: 0;
    right: 0;
    top: 50%;
    transform: translateY(-50%);
  }

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
</style>

<template>
  <ion-page v-cloak>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button :router-link="`/my-portal/${userId}`">
            <ion-icon :icon="arrowBack" slot="icon-only" />
          </ion-button>
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
          <ion-col
            v-for="(user, key) in users"
            :key="key"
            size="12"
            size-md="6"
          >
            <card-user-stats :id="user.id" :hide-menu="true" />
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

  import { arrowBack } from "ionicons/icons";

  import {
    IonButtons,
    IonButton,
    IonContent,
    IonHeader,
    // IonMenuButton,
    IonPage,
    IonTitle,
    IonToolbar,
    IonGrid,
    IonRow,
    IonCol,
  } from "@ionic/vue";
  import { computed } from "vue";
  export default {
    components: {
      IonGrid,
      IonRow,
      IonCol,
      CardUserStats,
      IonButtons,
      IonContent,
      IonHeader,
      // IonMenuButton,

      IonButton,
      IonPage,
      IonTitle,
      IonToolbar,
    },
    data() {
      return {
        users,
        arrowBack,
      };
    },
  mounted() {
    // this.$fx.ui[this.$fx.theme.ui].user.play()
  },
    methods: {
      getUserAvatar(user) {
        const avatar = `./${user.avatar}.svg`;
        return requireAvatar(avatar);
      },
    },
  };
</script>

<style scoped lang="scss">

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

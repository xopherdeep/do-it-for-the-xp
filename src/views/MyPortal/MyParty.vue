<template>
  <ion-page v-cloak>
    <ion-header :translucent="true">
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <ion-back-button :default-href="`/switch-profile`"></ion-back-button>
        </ion-buttons>
        <ion-title>
          <i class="fab fa-fort-awesome fa-lg" />
          My Party
        </ion-title>
      </ion-toolbar>
      <ion-toolbar>
        <ion-segment
          @ionChange="segmentChanged($event)"
          color="danger"
          scrollable
          value="all"
        >
          <ion-segment-button value="all">
            <ion-icon
              :icon="bagOutline"
              color="primary"
            ></ion-icon>
            My Family
          </ion-segment-button>
          <ion-segment-button value="hp">
            <ion-icon
              :icon="fitnessOutline"
              color="danger"
            ></ion-icon>
            My Guilds
          </ion-segment-button>
          <ion-segment-button value="mp">
            <ion-icon
              :icon="colorWandOutline"
              color="tertiary"
            ></ion-icon>
            MP
          </ion-segment-button>
          <ion-segment-button value="misc">
            <ion-icon
              :icon="sparklesOutline"
              color="success"
            ></ion-icon>
            Misc
          </ion-segment-button>
          <ion-segment-button value="key">
            <ion-icon
              :icon="keyOutline"
              color="gold"
            ></ion-icon>
            Key
          </ion-segment-button>
        </ion-segment>
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
            <card-user-stats
              :id="user?.id"
              :hide-menu="true"
            />
          </ion-col>
        </ion-row>
      </ion-grid>



      <div id="container"></div>
    </ion-content>
  </ion-page>
</template>

<script>
  import { mapGetters } from "vuex";
  import CardUserStats from "@/components/CardUserStats/CardUserStats.vue";

  import {
    arrowBack,
    bagOutline,
    fitnessOutline,
    colorWandOutline,
    sparklesOutline,
    keyOutline
  } from "ionicons/icons";
  import userActions from "@/mixins/userActions";

  import ionic from "@/mixins/ionic";
  export default {
    mixins: [userActions, ionic],
    ionViewDidEnter() {
      this.setUserActions(this.userActions)
    },
    components: {
      CardUserStats,
      // IonButtons,
      // IonMenuButton,

      // IonButton,
    },
    computed: {
      ...mapGetters(["usersAz"]),
      users() { return this.usersAz },
    },
    mounted() {
      // this.$fx.ui[this.$fx.theme.ui].user.play()
    },
    methods: {
      getUserAvatar(user) {
        const avatar = `./${user.avatar}.svg`;
        return this.$requireAvatar(avatar);
      },
      segmentChanged($event) {
        $event.preventDefault()

      }
    },
    setup() {
      return {
        keyOutline,
        arrowBack,
        bagOutline,
        fitnessOutline,
        colorWandOutline,
        sparklesOutline,

        userActions: [
          {
            label: "My Guilds",
            id: "users",
            faIcon: "users",
          },
          {
            label: "Create Guild",
            id: "create-team",
            faIcon: "users-crown",
          },
          {
            label: "Join Guild",
            id: "join-team",
            faIcon: "user-plus",
          },
          {
            label: "Guild Chat",
            id: "talk-to",
            faIcon: "comments",
          },
        ]
      }
    }
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
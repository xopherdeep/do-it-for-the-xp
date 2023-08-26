<template>
  <ion-header>
    <ion-toolbar
      v-if="user"
      class="rpg-box"
    >
      <ion-buttons slot="start">
        <ion-menu-button color="primary"></ion-menu-button>
        <ion-avatar v-if="user.avatar">
          <ion-img
            class="ion-no-padding"
            :src="getUserAvatar(user)"
          ></ion-img>
        </ion-avatar>
      </ion-buttons>
      <ion-title v-if="user.name">{{ user.name.nick }}</ion-title>
      <ion-buttons slot="end">
        <ion-button id="toolbox">
          <i class="fad fa-compass fa-2x"></i>
        </ion-button>
        <ion-button expand="block">
          <i class="fad fa-map fa-2x"></i>
        </ion-button>
        <ion-button
          size="large"
          id="user-profile"
        >
          <i class="fad fa-user-circle fa-2x"></i>
        </ion-button>
        <ion-button size="large">
          <i class="fad fa-book-spells fa-2x"></i>
        </ion-button>
      </ion-buttons>
    </ion-toolbar>
  </ion-header>
</template>

<script lang="ts">
  import User from '@/utils/User/user';
  import { defineComponent } from 'vue'

  export default defineComponent({
    props: {
      user: {
        type: User,
        required: true
      }
    },
    computed: {
      userAvatar() {
        const avatar = `./${this.user.avatar}.svg`;
        return this.$requireAvatar(avatar);
      },
    },

    setup() {
      const requireAvatar = require.context("@/assets/images/avatars/");
      const getUserAvatar = (user) => {
        const { avatar } = user;
        if (avatar) {
          return requireAvatar(`./${user.avatar}.svg`);
        }
      }

      return {
        getUserAvatar
      }
    },
  })
</script>

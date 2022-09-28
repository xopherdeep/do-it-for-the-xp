<template>
  <ion-header>
    <ion-toolbar v-if="user" class="rpg-box">
      <ion-buttons slot="start">
        <ion-menu-button color="primary"></ion-menu-button>
        <ion-avatar v-if="user.avatar">
          <ion-img class="ion-no-padding" :src="getUserAvatar(user)"></ion-img>
        </ion-avatar>
      </ion-buttons>
      <ion-icon :icon="accessibilityOutline" slot="icon-only" />
      <ion-title v-if="user.name">{{ user.name.nick }}</ion-title>
      <ion-buttons slot="end">
        <ion-button id="toolbox">
          <i class="fad fa-compass fa-2x"></i>
        </ion-button>
        <ion-button expand="block">
          <i class="fad fa-map fa-2x"></i>
        </ion-button>
        <ion-button size="large" id="user-profile">
          <i class="fad fa-user-circle fa-2x"></i>
        </ion-button>
        <ion-button size="large">
          <i class="fad fa-book-spells fa-2x"></i>
        </ion-button>
      </ion-buttons>
    </ion-toolbar>
  </ion-header>
</template>

<script lang="js">
  import { defineComponent } from 'vue'

  export default defineComponent({
    props: {
      user: {
        default(){
          return {
            name: null,
          }
        }
      }
    },
    computed: {
      userAvatar() {
        const avatar = `./${this.user.avatar}.svg`;
        return this.$requireAvatar(avatar);
      },
    },

    setup() {
      //
    },
  })
</script>

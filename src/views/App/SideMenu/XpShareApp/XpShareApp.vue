<template>
  <ion-page>
    <ion-header>
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <ion-menu-button :default-href="`/xp-settings/`"></ion-menu-button>
        </ion-buttons>
        <ion-title> Tell a Friend </ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      Tell a Friend, get cool loot!


    </ion-content>
    <ion-footer>
      <ion-button @click="shareApp">
        Share App
      </ion-button>
    </ion-footer>
  </ion-page>
</template>

<script lang="ts">
  import { defineComponent } from "vue";
  import { Share } from '@capacitor/share';

  import ionic from "@/mixins/ionic";

  export default defineComponent({
    name: 'xp-share-app',
    mixins: [ionic],
    methods: {
      async shareApp() {
        await Share.share({
          title: 'Do-it-for-the-XP',
          text: 'I wanted to share this app with you.',
          url: 'http://doit.forthexp.com/',
          dialogTitle: 'Tell a Friend',
        }).then(() => {

          alert("Thank you for sharing")
        }).catch(() => {
          alert("maybe next time")

        });
      }
    }
  });

                                                          // Share text only
                                                          // await Share.share({
                                                          //   text: 'Really awesome thing you need to see right meow',
                                                          // });

                                                          // // Share url only
                                                          // await Share.share({
                                                          //   url: 'http://ionicframework.com/',
                                                          // });

                                                          // // Share local file using url parameter
                                                          // const photo = await Camera.getPhoto(options);
                                                          // await Share.share({
                                                          //   url: photo.path,
                                                          // });

                                                          // // Share multiple files using files parameter
                                                          // const { photos } = await Camera.pickImages(options);
                                                          // await Share.share({
                                                          //   files: photos.map(photo => photo.path!),
                                                          // });
</script>
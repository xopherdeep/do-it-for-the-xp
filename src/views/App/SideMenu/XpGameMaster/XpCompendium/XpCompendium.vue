<template>
  <ion-page :class="$options.name">
    <ion-content>
      <ion-tabs class="icon-colors">
        <ion-router-outlet ref="outlet"></ion-router-outlet>
        <ion-tab-bar slot="bottom">
          <ion-tab-button
            tab="achievements"
            href="/game-master/compendium/achievements"
            :selected="$route.path === '/game-master/achievements'"
          >
            <i class="fad fa-medal fa-2x" />
            Achievements
          </ion-tab-button>
          <ion-tab-button
            tab="abilities"
            href="/game-master/compendium/abilities"
            :selected="$route.path === '/game-master/abilities'"
          >
            <i class="fad fa-book-spells fa-2x" />
            Abilities
          </ion-tab-button>
          <ion-tab-button
            tab="accessories"
            href="/game-master/compendium/accessories"
            :selected="$route.path === '/game-master/accessories'"
          >
            <i class="fad fa-backpack fa-2x" />
            Accessories
          </ion-tab-button>
          <ion-tab-button
            tab="bestiary"
            href="/game-master/compendium/bestiary"
            :selected="$route.path === '/game-master/bestiary'"
          >
            <i class="fad fa-paw-claws fa-2x" />
            Bestiary
          </ion-tab-button>
        </ion-tab-bar>
      </ion-tabs>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
  import { defineComponent } from "vue";
  import ionic from "@/mixins/ionic";

  export default defineComponent({
    name: "xp-compendium",
    mixins: [ionic],
  });
</script>

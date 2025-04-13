<template>
  <ion-page :class="$options.name">
    <ion-content>
      <ion-tabs class="icon-colors">
        <ion-router-outlet ref="outlet"></ion-router-outlet>
        <ion-tab-bar slot="bottom">
          <ion-tab-button
            tab="bestiary"
            href="/game-master/compendium/bestiary"
            :selected="$route.path.includes('/game-master/compendium/bestiary')"
          >
            <i class="fad fa-hand-holding-heart fa-2x" />
            Smart Lists
          </ion-tab-button>
          <ion-tab-button
            tab="achievements"
            href="/game-master/compendium/achievements"
            :selected="$route.path.includes('/game-master/compendium/achievements')"
          >
            <i class="fad fa-hand-holding-seedling quest fa-2x" />
            Quests (XP)
          </ion-tab-button>
          <ion-tab-button
            tab="abilities"
            href="/game-master/compendium/abilities"
            :selected="$route.path.includes('/game-master/compendium/abilities')"
          >
            <i class="fad fa-hand-holding-magic fa-2x" />
            Abilities (AP)
          </ion-tab-button>
          <ion-tab-button
            tab="accessories"
            href="/game-master/compendium/accessories"
            :selected="$route.path.includes('/game-master/compendium/accessories')"
          >
            <i class="fad fa-hand-holding-usd fa-2x" />
            Shops (GP)
          </ion-tab-button>
          <ion-tab-button
            tab="temples"
            href="/game-master/compendium/temples"
            :selected="$route.path.includes('/game-master/compendium/temples')"
          >
            <i class="fad fa-hand-holding-water fa-2x" />
            Temples
          </ion-tab-button>
        </ion-tab-bar>
      </ion-tabs>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
  import { defineComponent } from "vue";
  import ionic from "@/mixins/ionic";
  import { useRoute, useRouter } from "vue-router";

  export default defineComponent({
    name: "xp-compendium",
    mixins: [ionic],
    mounted() {
      // If we're at the exact compendium route without a sub-route,
      // redirect to the splash page
      if (this.$route.path === '/game-master/compendium') {
        this.$router.replace('/game-master/compendium/splash');
      }
    }
  });
</script>

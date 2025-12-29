<template>
  <ion-page :class="$options.name" class="icon-colors bg-slide bg-slide-dark">
    <ion-tabs class="icon-colors">
      <ion-router-outlet
        :key="route.path.split('/')[4] || 'splash'"
        ref="outlet"
      ></ion-router-outlet>
      <ion-tab-bar slot="bottom">
        <ion-tab-button
          tab="bestiary"
          href="/game-master/compendium/setup/bestiary"
          :selected="
            route.path.includes('/game-master/compendium/setup/bestiary')
          "
        >
          <i class="fad fa-hand-holding-heart fa-2x" />
          Bestiary
        </ion-tab-button>
        <ion-tab-button
          tab="abilities"
          href="/game-master/compendium/setup/abilities"
          :selected="
            route.path.includes('/game-master/compendium/setup/abilities')
          "
        >
          <i class="fad fa-hand-holding-magic fa-2x" />
          Powers
        </ion-tab-button>
        <ion-tab-button
          tab="temples"
          href="/game-master/compendium/setup/temples"
          :selected="
            route.path.includes('/game-master/compendium/setup/temples')
          "
        >
          <i class="fad fa-hand-holding-water fa-2x" />
          Temples
        </ion-tab-button>
        <ion-tab-button
          tab="economy"
          href="/game-master/compendium/setup/economy"
          :selected="
            route.path.includes('/game-master/compendium/setup/economy')
          "
        >
          <i class="fad fa-hand-holding-box fa-2x" />
          Economy
        </ion-tab-button>
        <ion-tab-button
          tab="achievements"
          href="/game-master/compendium/setup/achievements"
          :selected="
            route.path.includes('/game-master/compendium/setup/achievements')
          "
        >
          <i class="fad fa-hand-holding-seedling quest fa-2x" />
          Quests
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  </ion-page>
</template>

<script lang="ts">
  import { defineComponent } from "vue";
  import ionic from "@/lib/mixins/ionic";
  import { useRoute, useRouter } from "vue-router";

  export default defineComponent({
    name: "xp-compendium",
    mixins: [ionic],
    setup() {
      const route = useRoute();
      const router = useRouter();
      return { route, router };
    },
    mounted() {
      if (this.route.path === "/game-master/compendium") {
        this.router.replace({ name: "xp-compendium-setup" });
      }
    },
  });
</script>

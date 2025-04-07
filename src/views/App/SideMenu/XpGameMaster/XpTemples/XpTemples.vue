<style lang="scss" scoped>
  .xp-temples {
    ion-item {
      --background: transparent !important;
      // background-size: contain !important;
      // background-position: center !important;
    }
  }
</style>

<template>
  <ion-page :class="$options.name">
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/game-master" />
        </ion-buttons>
        <ion-title>
          <i class="fad fa-place-of-worship fa-lg" />
          Temples
        </ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-item
        v-for="temple in temples"
        :key="temple.id"
        :style="{
          background: `linear-gradient(to top, rgba(0, 0, 0, .7), transparent),${getBgUrl(
            temple.world
          )}`,
          // backgroundSize: 'center',
          // backgroundPosition: 'center',
        }"
        lines="none"
        class="mb-5 bg-cover bg-contain"
        @click="clickTemple(temple.id)"
        button
        detail
      >
        <ion-label>
          <ion-badge color="none">
            {{ temple.id }}
          </ion-badge>
        </ion-label>
        <ion-badge color="danger" class="ion-float-right"> 20 </ion-badge>
      </ion-item>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
  import requireImg from "@/utils/requireImg";
  import { defineComponent, ref } from "vue";
  import ionic from "@/mixins/ionic";
  import { useRouter } from "vue-router";
  export default defineComponent({
    name: "xp-temples",
    mixins: [ionic],
    setup() {
      const $router = useRouter();
      const getBgUrl = (world: string) => {
        const img = requireImg(`./backgrounds/world-${world}.jpg`);
        return `url(${img}) !important`;
      };

      const clickTemple = (templeId: string) => {
        $router.push({
          name: "xp-temple-settings",
          params: {
            templeId,
          },
        });
      };

      return {
        getBgUrl,
        clickTemple,
        temples: ref([
          {
            id: "wind-temple",
            world: "plains",
          },
          {
            id: "earth-temple",
            world: "forest",
          },
          {
            id: "water-temple",
            world: "islands",
          },
          {
            id: "fire-fortress",
            world: "mountains",
          },
          {
            id: "frozen-fortress",
            world: "ice",
          },
          {
            id: "sun-temple",
            world: "desert",
          },
          {
            id: "moon-temple",
            world: "moon",
          },
        ]),
      };
    },
  });
</script>

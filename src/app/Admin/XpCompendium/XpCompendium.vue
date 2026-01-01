<template>
  <xp-page :hide-header="true" bg-class="bg-slide bg-slide-dark">
    <ion-tabs class="icon-colors">
      <ion-router-outlet :key="outletKey" ref="outlet"></ion-router-outlet>
      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="bestiary" href="/game-master/compendium/bestiary"
          @click="handleTabClick('bestiary', $event)"
          :selected="route.path.includes('/game-master/compendium/bestiary')">
          <i class="fad fa-hand-holding-heart fa-2x" />
          Bestiary
        </ion-tab-button>
        <ion-tab-button tab="abilities" href="/game-master/compendium/abilities"
          @click="handleTabClick('abilities', $event)"
          :selected="route.path.includes('/game-master/compendium/abilities')">
          <i class="fad fa-hand-holding-magic fa-2x" />
          Powers
        </ion-tab-button>
        <ion-tab-button tab="temples" href="/game-master/compendium/temples" @click="handleTabClick('temples', $event)"
          :selected="route.path.includes('/game-master/compendium/temples')">
          <i class="fad fa-hand-holding-water fa-2x" />
          Temples
        </ion-tab-button>
        <ion-tab-button tab="economy" href="/game-master/compendium/economy" @click="handleTabClick('economy', $event)"
          :selected="route.path.includes('/game-master/compendium/economy')">
          <i class="fad fa-hand-holding-box fa-2x" />
          Economy
        </ion-tab-button>
        <ion-tab-button tab="achievements" href="/game-master/compendium/achievements"
          @click="handleTabClick('achievements', $event)"
          :selected="route.path.includes('/game-master/compendium/achievements')">
          <i class="fad fa-hand-holding-seedling quest fa-2x" />
          Quests
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  </xp-page>
</template>

<script lang="ts">
import { defineComponent, computed } from "vue";
import ionic from "@/lib/mixins/ionic";
import { useRoute, useRouter } from "vue-router";
import XpPage from "@/components/templates/pages/XpPage.vue";

export default defineComponent({
  name: "xp-compendium",
  mixins: [ionic],
  components: { XpPage },
  setup() {
    const route = useRoute();
    const router = useRouter();

    const outletKey = computed(() => {
      const parts = route.path.split("/");
      // Path: /game-master/compendium/[tab]/config/[id]
      const tab = parts[3] || "dashboard";
      const isConfig = parts[4] === "config";
      const id = isConfig ? parts[5] : "";

      // If we are in config, include the ID in the key so switching between 
      // different quests or moving from list to quest forces a re-mount.
      // But stay stable when switching sub-tabs within the same quest.
      return isConfig ? `${tab}-config-${id}` : tab;
    });

    return { route, router, outletKey };
  },
  methods: {
    handleTabClick(tab: string, event: Event) {
      const targetPath = `/game-master/compendium/${tab}`;

      if (this.route.path.includes(targetPath)) {
        if (this.route.path !== targetPath) {
          // Already in this tab but deep relative to root (e.g. editing)
          // Navigate back to the index
          event.preventDefault();
          this.router.replace(targetPath);
        } else {
          // Already at the root path of this tab
          // Prevent default to avoid any potential full page reload 
          // caused by ion-tab-button's href when already active.
          event.preventDefault();
        }
      }
    },
  },
});
</script>

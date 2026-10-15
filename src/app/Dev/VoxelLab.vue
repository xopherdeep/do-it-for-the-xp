<template>
  <ion-page>
    <ion-content class="voxel-lab">
      <h2>Heroes</h2>
      <div class="voxel-lab__heroes">
        <div v-for="(look, i) in looks" :key="i" class="voxel-lab__hero">
          <xp-hero-model :look="look" animation="idle" :interactive="false" />
        </div>
      </div>
      <h2>Furniture</h2>
      <div class="voxel-lab__props">
        <xp-building-model v-for="id in furniture" :key="id" :building-id="id" :size="150" />
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonContent, IonPage } from "@ionic/vue";
import XpHeroModel from "@/components/organisms/HeroModel/XpHeroModel.vue";
import XpBuildingModel from "@/components/organisms/BuildingModel/XpBuildingModel.vue";
import { DEFAULT_LOOK } from "@/lib/hero-look/types";
import type { HeroLook } from "@/lib/hero-look/types";

/**
 * A fixed line-up of voxel heroes and furniture, the same on every load: the bench for judging changes to the voxel
 * renderer (voxelMaterial.ts, the lights in heroCamera.ts) side by side with a screenshot from before.
 */
const looks: HeroLook[] = [
  DEFAULT_LOOK,
  { ...DEFAULT_LOOK, skin: "brown", hair: "spiky", hairColor: "#e8c040", outfit: "armor", outfitColor: "#8a96a8", hat: "none", rightHand: "fa-sword", leftHand: "fa-shield" },
  { ...DEFAULT_LOOK, skin: "pale", hair: "long", hairColor: "#2a2030", outfit: "robe", outfitColor: "#4a3a8a", hat: "wizard", hatColor: "#3050a0", rightHand: "fa-wand-magic" },
  { ...DEFAULT_LOOK, skin: "tan", hair: "curly", hairColor: "#c05a28", outfit: "hoodie", outfitColor: "#2a8a8a", hat: "cap", hatColor: "#c03030" },
];

const furniture = ["home-bed", "home-storage", "home-workbench", "home-kitchen", "home-calendar", "home-door"];
</script>

<style scoped lang="scss">
.voxel-lab {
  --background: #2a1630;
  color: #f5e9c8;

  h2 {
    margin: 12px 16px 4px;
    font-size: 16px;
  }
}

.voxel-lab__heroes {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  padding: 0 8px;
}

.voxel-lab__hero {
  height: 240px;
  background: #3a2440;
}

.voxel-lab__props {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  justify-items: center;
  padding: 0 8px;
  background: #6a3a22;
}
</style>

<template>
  <ion-page>
    <ion-content class="voxel-lab" v-if="showGear">
      <h2>Equipment in hand</h2>
      <div class="voxel-lab__heroes">
        <div v-for="hero in gearBench" :key="hero.label" class="voxel-lab__hero">
          <xp-hero-model :look="hero.look" animation="idle" :interactive="false" />
          <div class="voxel-lab__caption">
            <span class="voxel-lab__label">{{ hero.label }}</span>
            <span class="voxel-lab__cost">{{ hero.cost }}</span>
          </div>
        </div>
      </div>
    </ion-content>
    <ion-content class="voxel-lab" v-else>
      <h2>Heroes</h2>
      <div class="voxel-lab__heroes">
        <div v-for="(hero, i) in heroBench" :key="i" class="voxel-lab__hero">
          <xp-hero-model :look="hero.look" animation="idle" :interactive="false" />
          <div class="voxel-lab__caption">
            <span class="voxel-lab__cost">{{ hero.cost }}</span>
          </div>
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
import { computed } from "vue";
import { useRoute } from "vue-router";
import { IonContent, IonPage } from "@ionic/vue";
import XpHeroModel from "@/components/organisms/HeroModel/XpHeroModel.vue";
import XpBuildingModel from "@/components/organisms/BuildingModel/XpBuildingModel.vue";
import { DEFAULT_LOOK } from "@/lib/hero-look/types";
import { GEAR_BY_ICON } from "@/components/organisms/HeroModel/voxel/held";
import { BENCH_LOOKS } from "@/components/organisms/HeroModel/voxel/benchLooks";
import { formatMeasure, measureHero } from "@/components/organisms/HeroModel/voxel/measure";
import type { HeroLook } from "@/lib/hero-look/types";

/** One hero on a bench: its look, its label (empty on the hero bench) and the line under it: boxes, quads and build time */
interface BenchHero {
  look: HeroLook;
  label: string;
  cost: string;
}

/**
 * A fixed line-up of voxel heroes and furniture, the same on every load: the bench for judging changes to the voxel
 * renderer (voxelMaterial.ts, the lights in heroCamera.ts) side by side with a screenshot from before. The heroes are
 * BENCH_LOOKS (voxel/benchLooks.ts), the same looks the perf spec measures.
 * `?set=gear` swaps in the equipment line-up instead: every Equipment screen item in a hand, two per hero
 * (a browser holds only so many WebGL canvases, so the two benches are never on one page).
 * The line under each hero is its boxes, quads and build time (measure.ts), taken once when the page loads.
 */
const route = useRoute();
const showGear = computed(() => route.query.set === "gear");
const gearIcons = Object.keys(GEAR_BY_ICON);
const gearPairs = Array.from({ length: Math.ceil(gearIcons.length / 2) }, (_, i) => [gearIcons[i * 2], gearIcons[i * 2 + 1] ?? gearIcons[0]]);

const heroBench: BenchHero[] = BENCH_LOOKS.map((look) => ({ look, label: "", cost: formatMeasure(measureHero(look)) }));
const gearBench: BenchHero[] = gearPairs.map((pair) => {
  const look: HeroLook = { ...DEFAULT_LOOK, leftHand: pair[0], rightHand: pair[1] };
  return { look, label: `${pair[1]} | ${pair[0]}`, cost: formatMeasure(measureHero(look)) };
});

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

.voxel-lab__hero {
  position: relative;
}

.voxel-lab__caption {
  position: absolute;
  left: 4px;
  bottom: 2px;
  display: flex;
  flex-direction: column;
}

.voxel-lab__label,
.voxel-lab__cost {
  font-size: 11px;
}

.voxel-lab__props {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  justify-items: center;
  padding: 0 8px;
  background: #6a3a22;
}
</style>

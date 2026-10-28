<template>
  <div ref="root" class="video-tier" data-cy="video-tier-content">
    <!-- On a card like the other settings: loose on the page, this text sat on the busy checkerboard and could not be read -->
    <ion-card class="settings-card max-w-2xl">
      <ion-card-content>
        <!-- Mounted only once the page has painted twice, so a slow first hero cannot freeze the page it is meant to fix -->
        <div class="video-tier__preview" data-cy="tier-preview">
          <xp-hero-model v-if="isPreviewReady" :key="voxelTier" :look="previewLook" />
        </div>

        <p :id="blurbId" class="video-tier__blurb" data-cy="tier-blurb">{{ TIER_BLURBS[voxelTier] }}</p>

        <details class="video-tier__details" data-cy="tier-details">
          <summary>Details</summary>
          <ul>
            <li v-for="fact in facts" :key="fact.label">
              <span class="video-tier__fact-label">{{ fact.label }}</span> {{ fact.value }}
            </li>
          </ul>
        </details>

        <p class="video-tier__note" data-cy="tier-note">
          This changes only this device. The preview switches right away. Other heroes switch the next time their screen
          opens.
        </p>

        <!-- The live region is always in the page, so screen readers announce the note when it appears inside it -->
        <div aria-live="polite">
          <p v-if="needsRestart" class="video-tier__restart" data-cy="tier-restart">
            Towns and maps finish switching after you close the game completely (swipe it away) and open it again.
          </p>
        </div>
      </ion-card-content>
    </ion-card>
  </div>

  <!-- The segment lives in the page footer, within thumb reach; it is teleported there once the footer exists -->
  <Teleport v-if="slot" :to="slot">
    <ion-segment
      class="video-tier__segment"
      :value="voxelTier"
      :aria-describedby="blurbId"
      aria-label="Video quality"
      data-cy="video-tier"
    >
      <ion-segment-button v-for="tier in VOXEL_TIERS" :key="tier" :value="tier" @click="choose(tier)">
        <ion-label>{{ TIER_NAMES[tier] }}</ion-label>
      </ion-segment-button>
    </ion-segment>
  </Teleport>
</template>

<script setup lang="ts">
  import { computed, onBeforeUnmount, onMounted, ref } from "vue";
  import { IonCard, IonCardContent, IonLabel, IonSegment, IonSegmentButton } from "@ionic/vue";
  import XpHeroModel from "@/components/organisms/HeroModel/XpHeroModel.vue";
  import { BENCH_LOOKS } from "@/components/organisms/HeroModel/voxel/benchLooks";
  import {
    landmarkContextAntialias,
    landmarkRendererOptions,
  } from "@/components/organisms/BuildingModel/voxel/landmarkQuality";
  import { DEFAULT_LOOK } from "@/lib/hero-look/types";
  import { currentKnobs, setVoxelTier, voxelTier } from "@/lib/services/graphics/deviceQuality";
  import { KNOBS, TIER_BLURBS, TIER_NAMES, VOXEL_TIERS, type VoxelTier } from "@/lib/services/graphics/voxelQuality";
  import { play$fx } from "@/assets/fx";

  const props = withDefaults(defineProps<{ footerTarget?: string }>(), { footerTarget: "[data-cy='video-tier-slot']" });

  const blurbId = "video-tier-blurb";
  const previewLook = BENCH_LOOKS[4] ?? DEFAULT_LOOK;
  const SHADING = { full: "Full", simple: "Simple", flat: "Flat" } as const;

  const root = ref<HTMLElement | null>(null);
  const slot = ref<Element | null>(null);
  const isPreviewReady = ref(false);
  let frameHandle = 0;

  onMounted(() => {
    // The footer is a sibling rendered after this component, so the slot exists only from here on. Look inside this
    // page first: Ionic keeps earlier pages in the document, and each has its own footer.
    const scope = root.value?.closest("ion-page") ?? (root.value?.getRootNode() as ParentNode | undefined);
    slot.value = scope?.querySelector(props.footerTarget) ?? null;
    frameHandle = requestAnimationFrame(() => {
      frameHandle = requestAnimationFrame(() => {
        isPreviewReady.value = true;
      });
    });
  });

  onBeforeUnmount(() => cancelAnimationFrame(frameHandle));

  const choose = (tier: VoxelTier) => {
    const isChange = tier !== voxelTier.value;
    if (!isChange) return;
    setVoxelTier(tier);
    play$fx("cursor");
  };

  const facts = computed(() => {
    const knobs = KNOBS[voxelTier.value];
    return [
      { label: "Shading", value: SHADING[knobs.material] },
      { label: "Screen scale", value: `Up to ${knobs.dprCap}x` },
      { label: "Frame rate", value: knobs.heroFps === 0 ? "Every screen frame" : `${knobs.heroFps} per second` },
      { label: "Picture size", value: knobs.thumbMaxPx === 0 ? "Full size" : `Up to ${knobs.thumbMaxPx} px` },
    ];
  });

  // An Android resume is not a launch: MSAA is fixed when the shared town context was made, so say when it is stale
  const needsRestart = computed(() => {
    const live = landmarkContextAntialias();
    const hasContext = live !== null;
    const wanted = landmarkRendererOptions(currentKnobs(), window.devicePixelRatio).antialias;
    return hasContext && live !== wanted;
  });
</script>

<style scoped>
  .video-tier {
    max-width: 42rem;
    margin: 0 auto;
    padding: 0 0 16px;
    color: var(--gs-text);
  }

  .video-tier__preview {
    width: 180px;
    height: 180px;
    margin: 0 auto;
  }

  .video-tier__blurb {
    margin: 8px 0;
    text-align: center;
  }

  .video-tier__details {
    margin: 8px 0;
    color: var(--gs-text-dim);
  }

  .video-tier__details summary {
    min-height: 44px;
    display: flex;
    align-items: center;
    cursor: pointer;
  }

  .video-tier__details ul {
    margin: 0;
    padding-left: 20px;
  }

  .video-tier__fact-label {
    color: var(--gs-text);
  }

  .video-tier__note {
    margin: 8px 0;
    color: var(--gs-text-dim);
  }

  .video-tier__restart {
    margin: 8px 0;
    padding: 8px 12px;
    border: 1px solid var(--gs-accent);
    color: var(--gs-accent);
  }

  .video-tier__segment {
    margin: 0 0 8px;
  }

  /* The pixel font is wide: with the default padding "Classic" was cut to "CLAS…" on a 390px phone */
  .video-tier__segment ion-segment-button {
    min-height: 44px;
    --padding-start: 6px;
    --padding-end: 6px;
  }

  .video-tier__segment ion-label {
    font-size: 1rem;
    letter-spacing: 0;
  }
</style>

<template>
  <ion-page :class="$options.name">
    <ion-content :fullscreen="true">
      <WeatherFX type="tropical" :intensity="7" :sound-enabled="false" />
      <div class="world-scene-frame">
        <div class="world-scene">
          <!-- Ship run aground on the big west sandbar, the temple on the palm isle, Pegasus on the south islet -->
          <xp-building-model class="world-spot" style="--x: 34%; --y: 47%; --z: 47" building-id="wrecked-ship" :size="100" />
          <xp-temple-model class="world-spot" style="--x: 66%; --y: 63%; --z: 63" temple-id="water-temple" :size="100" />
          <xp-building-model class="world-spot" style="--x: 50%; --y: 83%; --z: 83" building-id="pegasus" world="islands" :size="105" />
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script lang="ts" src="./WorldIslands.ts" ></script>
<style lang="scss" src="./_WorldIslands.scss"/>
<style lang="scss">
  #water-temple{
    .fa-place-of-worship {
      --fa-primary-color: var(--xp-color-blue);
      --fa-secondary-color: var(--xp-color-blue);
      // --fa-secondary-opacity: 1
    }
  }
</style>

<template>
  <ion-page :class="$options.name">
    <ion-content :fullscreen="true">
      <WeatherFX type="tropical" :intensity="7" :sound-enabled="false" />
      <div class="world-landmarks-layer">
        <xp-building-model building-id="wrecked-ship" :size="105" />
        <xp-building-model building-id="pegasus" label="Travel World" sublabel="Fly to World Map" :size="105" />
        <xp-temple-model temple-id="water-temple" :size="105" />
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

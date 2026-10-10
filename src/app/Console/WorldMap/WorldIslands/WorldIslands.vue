<template>
  <ion-page :class="$options.name">
    <ion-content :fullscreen="true">
      <WeatherFX type="tropical" :intensity="7" :sound-enabled="false" />
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

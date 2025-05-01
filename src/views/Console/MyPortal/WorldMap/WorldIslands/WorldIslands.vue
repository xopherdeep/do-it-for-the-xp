<template>
  <ion-page :class="$options.name">
    <ion-content :fullscreen="true">
      <WeatherFX effect="tropical" :intensity="7" />
    </ion-content>
  </ion-page>
</template>

<script src="./WorldIslands.ts" ></script>
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

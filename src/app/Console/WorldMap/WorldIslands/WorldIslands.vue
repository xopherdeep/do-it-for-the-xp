<template>
  <ion-page :class="$options.name">
    <ion-content :fullscreen="true">
      <WeatherFX type="tropical" :intensity="7" :sound-enabled="false" />
      <div class="world-scene-frame">
        <div class="world-scene">
          <xp-draggable-spot screen="world-islands" spot-id="wrecked-ship" :default-x="30" :default-y="47">
            <xp-building-model building-id="wrecked-ship" :size="100" />
          </xp-draggable-spot>
          <xp-draggable-spot screen="world-islands" spot-id="water-temple" :default-x="60" :default-y="62">
            <xp-temple-model temple-id="water-temple" :size="100" />
          </xp-draggable-spot>
          <xp-draggable-spot screen="world-islands" spot-id="pegasus" :default-x="43" :default-y="84">
            <xp-building-model building-id="pegasus" world="islands" :size="105" />
          </xp-draggable-spot>
          <xp-draggable-spot screen="world-islands" spot-id="merchant" :default-x="24" :default-y="71">
            <xp-traveling-merchant world="islands" :size="100" />
          </xp-draggable-spot>
          <xp-draggable-spot screen="world-islands" spot-id="hotel" :default-x="68" :default-y="38">
            <xp-building-model building-id="hotel" world="islands" :size="105" />
          </xp-draggable-spot>
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

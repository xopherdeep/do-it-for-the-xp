<template>
  <ion-page :class="$options.name">
    <ion-content :fullscreen="true" class="bg-slide ion-padding">
      <div class="return-box rpg-box" data-cy="pro-return">
        <template v-if="timedOut">
          <p class="return-text" data-cy="pro-return-late">Payment received. Your unlock is on its way and will switch on by itself; you can leave this page.</p>
          <ion-button @click="retry" data-cy="pro-return-retry">Retry</ion-button>
        </template>
        <template v-else>
          <p class="return-text" data-cy="pro-return-wait">The shopkeeper is counting your gold…</p>
          <ion-spinner name="dots" />
        </template>
      </div>
    </ion-content>
  </ion-page>
</template>

<script lang="ts" src="./XpProReturn.ts" />
<style lang="scss" src="./_XpProReturn.scss" scoped />

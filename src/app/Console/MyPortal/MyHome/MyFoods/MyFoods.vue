<template>
  <ion-page :class="rootClass" :style="rootStyle">
    <ion-header>
      <ion-toolbar>
        <xp-app-header title="Kitchen" icon="utensils-alt">
          <template #start>
            <xp-back-button />
          </template>
        </xp-app-header>
      </ion-toolbar>
    </ion-header>

    <ion-content class="my-foods">
      <!-- Nothing to cook from yet: the game's Coming soon card says so in the kitchen's words -->
      <xp-coming-soon-card title="On the menu" :items="comingSoonItems" />

      <!-- FAB button (the same one the town's buildings use) to open the kitchen actions -->
      <ion-fab vertical="bottom" horizontal="center" slot="fixed">
        <ion-fab-button color="warning" aria-label="Kitchen actions" @click="presentActionSheet">
          <i class="fad fa-hat-chef fa-2x"></i>
        </ion-fab-button>
      </ion-fab>
    </ion-content>

    <ion-footer class="foods-footer">
      <xp-app-bottom-nav
        :tabs="foodTabs"
        v-model="selectedCategory"
        aria-label="Kitchen Navigation"
      />
    </ion-footer>
  </ion-page>
</template>

<script lang="ts" src="./MyFoods.ts" />
<style lang="scss" src="./_MyFoods.scss" scoped />

<template>
  <ion-page>
    <ion-tabs @ionTabsWillChange="beforeTabChange" @ionTabsDidChange="afterTabChange">
      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="my-home" :href="`/my-portal/${user_id}`">
          <ion-icon :icon="fitnessOutline" color="primary"></ion-icon>
          <ion-label>Stats</ion-label>
          <ion-badge></ion-badge>
        </ion-tab-button>
  
        <ion-tab-button tab="speakers" :href="`/my-portal/${user_id}/abilities`">
          <ion-icon :icon="accessibilityOutline" color="secondary"></ion-icon>
          <ion-label>Abilities</ion-label>
        </ion-tab-button>

        <ion-tab-button color="success" tab="speakers" :href="`/my-portal/${user_id}/deeds`">
          <ion-icon :icon="medalOutline" color="success"></ion-icon>
          <ion-label>Advents</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="my-party" :href="`/my-portal/${user_id}/inventory`">
          <ion-icon :icon="medkitOutline" color="ternary"></ion-icon>
          <ion-label>Items</ion-label>
          <!-- <ion-badge>6</ion-badge> -->
        </ion-tab-button>

        <ion-tab-button tab="my-party" :href="`/my-portal/${user_id}/my-party`">
          <ion-icon :icon="peopleCircle" color="ternary"></ion-icon>
          <ion-label>Party</ion-label>
          <!-- <ion-badge>6</ion-badge> -->
        </ion-tab-button>

        <ion-tab-button tab="my-chatbox" :href="`/my-portal/${user_id}/shop`">
          <ion-icon :icon="storefrontOutline"></ion-icon>
          <ion-label>Shop</ion-label>
        </ion-tab-button>

      </ion-tab-bar>
      <ion-router-outlet></ion-router-outlet>
    </ion-tabs>
  </ion-page>
</template>

<script src="./MyPortal.js" />
<style lang="scss" src="./_MyPortal.scss" scoped/>
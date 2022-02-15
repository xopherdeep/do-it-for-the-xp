<template>
  <ion-page v-cloak>
    <ion-tabs @ionTabsWillChange="beforeTabChange" @ionTabsDidChange="afterTabChange" v-if="user.stats">
      <ion-router-outlet></ion-router-outlet>
                            <!-- <ion-progress-bar
                              color="danger"
                              :value="user.stats.hp.now / user.stats.hp.max"
                            ></ion-progress-bar> -->
      <ion-tab-bar slot="bottom" v-if="user.stats">
        <ion-tab-button tab="my-chatbox" :href="`/my-portal/${user.id}/shop`">
          <ion-icon :icon="storefrontOutline" color="secondary"></ion-icon>
          <ion-label>Shop</ion-label>
          <ion-badge color="warning">¤{{user.stats.gp.wallet}} GP</ion-badge>
        </ion-tab-button>

        <ion-tab-button color="danger" tab="my-home" :href="`/my-portal/${user.id}`">
          <ion-icon :icon="accessibilityOutline" color="danger"></ion-icon>
          <ion-label>Me</ion-label>
          <ion-badge color="danger">{{user.stats.hp.now}} HP</ion-badge>
        </ion-tab-button>
  

        <ion-tab-button tab="my-party" :href="`/my-portal/${user.id}/my-party`">
          <ion-icon :icon="peopleCircle" color="ternary"></ion-icon>
          <ion-label>Party</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  </ion-page>
</template>

<script src="./MyPortal.js" />
<style lang="scss" src="./_MyPortal.scss" scoped/>
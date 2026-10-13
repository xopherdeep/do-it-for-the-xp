<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="danger">
        <ion-buttons slot="start">
          <xp-back-button />
          <xp-icon icon="backpack" size="lg" class="ml-2" />
        </ion-buttons>
        <ion-title>My Goods</ion-title>
      </ion-toolbar>
    </ion-header>

    <xp-inventory-sheet :user-id="userId" mode="view" />
  </ion-page>
</template>

<script lang="ts" src="./MyInventory.ts" />
<style lang="scss" src="./_MyInventory.scss" scoped />

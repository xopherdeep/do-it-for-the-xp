<template>
  <ion-page :class="rootClass" :style="rootStyle">
    <ion-header>
      <ion-toolbar>
        <xp-app-header
          class="goods-header"
          :class="{ 'is-full': isBagFull }"
          title="My Goods"
          icon="backpack"
          :meta="meta"
        >
          <template #start>
            <xp-back-button />
          </template>
        </xp-app-header>
      </ion-toolbar>
    </ion-header>

    <xp-inventory-sheet :user-id="userId" mode="view" />
  </ion-page>
</template>

<script lang="ts" src="./MyInventory.ts" />
<style lang="scss" src="./_MyInventory.scss" scoped />

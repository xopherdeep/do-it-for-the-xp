<template>
  <ion-page :class="$options.name">
    <ion-header :translucent="true">
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <ion-menu-button />
        </ion-buttons>
        <ion-title>XP Pro</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="bg-slide ion-padding">
      <div class="shop-counter">
        <h1 class="shop-title"><i class="fad fa-crown"></i> The XP Pro Counter</h1>
        <p class="shop-tagline">Power tools for the Game Master. Heroes, custom quests and custom beasts stay free forever.</p>

        <ion-card v-if="pro.isPro" class="owned" data-cy="pro-owned">
          <ion-card-content>
            You already have XP Pro. <router-link to="/xp-settings/pro">See your key</router-link>
          </ion-card-content>
        </ion-card>

        <ul class="perks">
          <li v-for="(name, gate) in gateNames" :key="gate">{{ name }}</li>
        </ul>

        <p v-if="native" class="native-note" data-cy="native-coming-soon">
          Purchases on this device are coming soon. Already bought XP Pro? Restore with your key in Settings &gt; XP Pro.
        </p>

        <div v-else class="shelf">
          <div v-for="item in items" :key="item.id" class="shop-item" :data-cy="`plan-${item.id}`">
            <div class="item-name">{{ item.title }}</div>
            <div class="item-price" data-cy="plan-price">{{ item.priceLabel }}</div>
            <div v-if="item.trial" class="item-trial">7 days free</div>
            <ion-button class="buy-button" :disabled="pro.loading" @click="buy(item.id)">
              {{ item.trial ? "Start free trial" : "Buy" }}
            </ion-button>
          </div>
        </div>

        <router-link class="restore-link" to="/xp-settings/pro" data-cy="restore-link">Restore</router-link>
      </div>
    </ion-content>
  </ion-page>
</template>

<script lang="ts" src="./XpGoPro.ts" />
<style lang="scss" src="./_XpGoPro.scss" scoped />

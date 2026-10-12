<template>
  <ion-page :class="$options.name">
    <ion-header :translucent="true">
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <ion-button router-link="/xp-settings/">
            <ion-icon :icon="arrowBack" slot="icon-only" />
          </ion-button>
        </ion-buttons>
        <ion-title>XP Pro</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="bg-slide rpg-box ion-padding">
      <ion-card>
        <ion-card-header>
          <ion-card-title data-cy="pro-status">{{ pro.isPro ? "XP Pro is on" : "XP Pro is off" }}</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <p v-if="pro.isPro && pro.plan">Plan: {{ pro.plan }}</p>
          <p v-if="pro.isPro && pro.plan !== 'lifetime' && pro.expiresAt">
            {{ pro.plan ? "Renews or ends" : "" }}: {{ dateLabel }}
          </p>
          <p v-if="pro.licenseKey" data-cy="pro-masked-key">
            Key: {{ maskedKey }}
            <ion-button size="small" fill="clear" @click="copyKey">Copy</ion-button>
          </p>
          <ion-button v-if="!pro.isPro" router-link="/pro">See XP Pro</ion-button>
          <ion-button v-if="pro.licenseKey" fill="outline" @click="pro.manage()">Manage subscription</ion-button>
        </ion-card-content>
      </ion-card>

      <ion-card>
        <ion-card-header><ion-card-title>Restore with key</ion-card-title></ion-card-header>
        <ion-card-content>
          <ion-input
            v-model="keyInput"
            placeholder="XP-PRO-XXXX-XXXX-XXXX"
            data-cy="restore-key-input"
            class="key-input"
          />
          <ion-button :disabled="!keyInput.trim() || pro.loading" @click="restore" data-cy="restore-key-button">
            Restore with key
          </ion-button>
        </ion-card-content>
      </ion-card>

      <ion-card>
        <ion-card-header><ion-card-title>Email me my key</ion-card-title></ion-card-header>
        <ion-card-content>
          <ion-input v-model="emailInput" type="email" placeholder="parent email" class="key-input" />
          <ion-button :disabled="!emailInput.trim()" @click="pro.recover(emailInput)">Email me my key</ion-button>
        </ion-card-content>
      </ion-card>
    </ion-content>
  </ion-page>
</template>

<script lang="ts" src="./ProSettings.ts" />
<style lang="scss" src="./_ProSettings.scss" scoped />

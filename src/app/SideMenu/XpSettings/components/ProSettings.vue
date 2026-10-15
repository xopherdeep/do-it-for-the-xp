<template>
  <ion-page :class="[$options.name, 'xp-settings-page']">
    <ion-header :translucent="true">
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <xp-back-button></xp-back-button>
        </ion-buttons>
        <ion-title>XP Pro</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="bg-slide rpg-box ion-padding">
      <ion-card class="max-w-2xl">
        <ion-card-header>
          <ion-card-title data-cy="pro-status">{{ pro.isPro ? "XP Pro is on" : "XP Pro is off" }}</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <xp-license-card
            v-if="pro.isPro && pro.licenseKey"
            :plan="pro.plan"
            :plan-label="planLabel"
            :masked-key="maskedKey"
            :member-since="sinceLabel"
            :valid-thru="dateLabel"
            @copy="copyKey"
          />
          <template v-else>
            <p v-if="!pro.isPro">Pro adds the Temple Creator, advanced schedules, AI helpers and six more game styles.</p>
            <p v-if="pro.licenseKey" data-cy="pro-masked-key">
              Key: {{ maskedKey }}
              <ion-button size="small" fill="clear" @click="copyKey">Copy</ion-button>
            </p>
          </template>
          <div class="pro-actions">
            <ion-button v-if="!pro.isPro" router-link="/pro" class="pro-button">See XP Pro</ion-button>
            <ion-button v-if="pro.licenseKey" fill="outline" class="pro-button-outline" @click="pro.manage()">
              <i class="fad fa-cog mr-2" aria-hidden="true"></i>Manage subscription
            </ion-button>
          </div>
        </ion-card-content>
      </ion-card>

      <ion-card class="max-w-2xl">
        <ion-card-header>
          <ion-card-title><i class="fad fa-key mr-2" aria-hidden="true"></i>Restore with key</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <p>Bought Pro on another device? Enter the key from your receipt email.</p>
          <ion-input
            v-model="keyInput"
            placeholder="XP-PRO-XXXX-XXXX-XXXX"
            aria-label="XP Pro key"
            data-cy="restore-key-input"
            class="key-input"
          />
          <ion-button class="pro-button" :disabled="!keyInput.trim() || pro.loading" @click="restore" data-cy="restore-key-button">
            Restore with key
          </ion-button>
        </ion-card-content>
      </ion-card>

      <ion-card class="max-w-2xl">
        <ion-card-header>
          <ion-card-title><i class="fad fa-envelope-open-text mr-2" aria-hidden="true"></i>Lost your key?</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <p>We'll send it to the email you bought Pro with.</p>
          <ion-input v-model="emailInput" type="email" placeholder="Parent email" aria-label="Parent email" class="key-input" />
          <ion-button class="pro-button" :disabled="!emailInput.trim()" @click="pro.recover(emailInput)">Email me my key</ion-button>
        </ion-card-content>
      </ion-card>
    </ion-content>
  </ion-page>
</template>

<script lang="ts" src="./ProSettings.ts" />
<style lang="scss" src="./_ProSettings.scss" scoped />

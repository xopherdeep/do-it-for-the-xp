<template>
  <ion-page class="link-phone-page">
    <ion-header :translucent="true">
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <ion-back-button default-href="/xp-profile" />
        </ion-buttons>
        <ion-title>Link A Hero Phone</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="ion-padding link-phone-content">
      <ion-grid class="link-phone-grid">
        <ion-row class="ion-justify-content-center">
          <ion-col size="12" size-md="8" size-lg="6">
            <!-- Clerk Banner / Error Message -->
            <ion-card v-if="bannerText" class="lp-banner" data-cy="family-banner">
              <ion-item lines="none">
                <ion-label class="ion-text-wrap">{{ bannerText }}</ion-label>
              </ion-item>
            </ion-card>

            <!-- Main Link Card -->
            <ion-card class="link-card rpg-box">
              <ion-card-header>
                <ion-card-title>
                  Family Link Code
                </ion-card-title>
              </ion-card-header>

              <ion-card-content>
                <ion-text class="link-desc">
                  Ask your Game Master for a link code or QR code from the family device.
                </ion-text>

                <!-- Code Input -->
                <ion-item class="code-item">
                  <ion-label position="stacked">8-Character Code</ion-label>
                  <ion-input
                    v-model="typedCode"
                    placeholder="ABCD-EFGH"
                    data-cy="link-code-input"
                    :disabled="isClaiming"
                    @keydown="handleKeydown"
                  />
                </ion-item>

                <!-- Action Buttons -->
                <ion-row class="link-actions ion-no-padding">
                  <ion-col size="12">
                    <ion-button
                      expand="block"
                      data-cy="link-button"
                      :disabled="isClaiming || !hasCode"
                      @click="handleLink"
                    >
                      <ion-spinner v-if="isClaiming" slot="start" name="crescent" />
                      <ion-text v-else>Link</ion-text>
                    </ion-button>
                  </ion-col>

                  <ion-col v-if="isNative" size="12">
                    <ion-button
                      expand="block"
                      fill="outline"
                      class="scan-button"
                      data-cy="scan-button"
                      :disabled="isClaiming"
                      @click="handleScan"
                    >
                      <ion-text>Scan QR Code</ion-text>
                    </ion-button>
                  </ion-col>
                </ion-row>
              </ion-card-content>
            </ion-card>
          </ion-col>
        </ion-row>
      </ion-grid>
    </ion-content>
  </ion-page>
</template>

<script lang="ts" src="./LinkPhone.ts"></script>
<style scoped lang="scss" src="./_LinkPhone.scss"></style>

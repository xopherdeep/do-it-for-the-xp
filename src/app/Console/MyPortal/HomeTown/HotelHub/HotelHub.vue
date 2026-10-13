<template>
  <ion-page :class="$options.name">
    <ion-header>
      <ion-toolbar color="danger">
        <ion-buttons slot="start">
          <xp-back-button />
          <i class="fad fa-2x fa-hotel"
          />
        </ion-buttons>
        <ion-title>
          {{ hotelTitle }}
        </ion-title>
        <ion-buttons slot="end">
          <ion-button @click="openATM" color="rpg">
            <i class="fad fa-hand-holding-usd fa-2x"></i>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <xp-loading v-if="isLoading" />
      
      <!-- fab button to trigger dialog -->
      <ion-fab
        v-show="!isTalking"
        vertical="bottom"
        horizontal="center"
        slot="fixed"
      >
        <ion-fab-button color="danger" @click="showHotelDialog">
          <i class="fad fa-concierge-bell fa-2x"></i>
        </ion-fab-button>
      </ion-fab>
    </ion-content>

    <!-- The concierge's dialog, offers and receipts: the game's own prompt, not native alerts -->
    <xp-reveal-prompt :prompt="prompt" @respond="reveal.respond" />

    <!-- ATM Modal Component -->
    <ATMModal
      v-model:isOpen="showAtm"
      :user="user"
      @withdraw="clickWithdraw"
      @deposit="clickDeposit"
      @payDebt="clickPayDebt"
    />
  </ion-page>
</template>

<script lang="ts" src="./HotelHub.ts" />
<style lang="scss" src="./_HotelHub.scss" />
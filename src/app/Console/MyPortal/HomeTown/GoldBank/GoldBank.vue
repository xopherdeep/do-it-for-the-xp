<template>
  <ion-page :class="$options.name">
    <ion-header>
      <ion-toolbar color="warning">
        <ion-buttons slot="start">
          <xp-back-button></xp-back-button>
          <i class="fa fa-piggy-bank fa-2x"></i>
        </ion-buttons>
        <ion-title>
          Gold Bank
        </ion-title>
        <ion-buttons slot="end">
          <ion-button @click="openATM" color="rpg">
            <i class="fad fa-hand-holding-usd fa-2x"></i>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="gold-bank" v-if="user">
      <xp-loading v-if="isLoading" />
      
      <!-- FAB button to trigger banker dialog -->
      <ion-fab
        v-show="!isTalking"
        vertical="bottom"
        horizontal="center"
        slot="fixed"
      >
        <ion-fab-button color="warning" @click="showBankerDialog">
          <i class="fad fa-user-tie fa-2x"></i>
        </ion-fab-button>
      </ion-fab>
    </ion-content>
    
    <!-- The banker's dialog, offers and receipts: the game's own prompt, not native alerts -->
    <xp-reveal-prompt :prompt="prompt" @respond="reveal.submitAnswer" />

    <!-- ATM Modal Component -->
    <ATMModal
      v-model:isOpen="showAtm"
      :user="user"
      @withdraw="withdrawSavings"
      @deposit="depositGp"
      @payDebt="payDebt"
    />
  </ion-page>
</template>

<script lang="ts" src="./GoldBank.ts" />
<style lang="scss" src="./_GoldBank.scss" scoped />

<template>
  <ion-page :class="$options.name">
    <ion-header>
      <ion-toolbar color="warning">
        <ion-buttons slot="start">
          <ion-back-button :default-href="`/my-portal/${userId}/home-town`"></ion-back-button>
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
        vertical="bottom"
        horizontal="center"
        slot="fixed"
      >
        <ion-fab-button color="warning" @click="showBankerDialog">
          <i class="fad fa-user-tie fa-2x"></i>
        </ion-fab-button>
      </ion-fab>
    </ion-content>
    
    <xp-npc-dialog
      v-model:open="isTalking"
      speaker="Bank Manager"
      :lines="dialogBlocks"
      icon="fad fa-user-tie"
      @done="presentActionSheet"
    />
    
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

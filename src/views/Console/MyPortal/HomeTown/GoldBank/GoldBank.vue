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
    
    <!-- Custom Banker Dialog (RPG style) -->
    <div class="banker-dialog-overlay" v-if="isDialogVisible" @click="advanceDialog">
      <ion-card class="banker-dialog-box">
        <ion-card-title class="dialog-header">
          <i class="fad fa-user-tie fa-lg mr-2"></i>
          <span>Bank Manager</span>
        </ion-card-title>
        <div class="dialog-content">
          <xp-typing-text
            ref="bankerDialogText"
            :text="currentDialogText"
            :speed="30"
            :auto-start="true"
            :sound-theme="$fx.theme.rpg"
            sound-type="text"
            @typing-complete="onTypingComplete"
            class="banker-text"
            :has-more-text="hasMoreDialog"
          />
        </div>
        <div v-if="hasMoreDialog" class="dialog-indicator">
          <i class="fad fa-chevron-down blink"></i>
        </div>
      </ion-card>
    </div>
    
    <!-- Hidden trigger buttons for alerts -->
    <ion-button id="deposit-trigger" class="hidden-trigger"></ion-button>
    <ion-button id="withdraw-trigger" class="hidden-trigger"></ion-button>
    <ion-button id="pay-debt-trigger" class="hidden-trigger"></ion-button>
    
    <!-- Declarative Alerts -->
    <ion-alert
      trigger="deposit-trigger"
      :header="`Deposit to Savings: (₲${user?.stats.gp.savings}.00)`"
      :buttons="[
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Deposit',
          handler: handleDeposit
        }
      ]"
      :inputs="[
        {
          type: 'number',
          placeholder: 'Enter GP amount',
          min: 1,
          max: user?.stats.gp.wallet
        }
      ]"
    ></ion-alert>
    
    <ion-alert
      trigger="withdraw-trigger"
      :header="`Withdraw from Savings: (₲${user?.stats.gp.savings}.00)`"
      :buttons="[
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Withdraw',
          handler: handleWithdraw
        }
      ]"
      :inputs="[
        {
          type: 'number',
          placeholder: 'Enter GP amount',
          min: 1,
          max: user?.stats.gp.limit && user?.stats.gp.wallet && user?.stats.gp.savings 
            ? Math.min(user.stats.gp.savings, user.stats.gp.limit - user.stats.gp.wallet) 
            : 0
        }
      ]"
    ></ion-alert>
    
    <ion-alert
      trigger="pay-debt-trigger"
      :header="`Pay Down Debt (₲${user?.stats.gp.debt}.00)`"
      :buttons="[
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Pay',
          handler: handlePayDebt
        }
      ]"
      :inputs="[
        {
          type: 'number',
          placeholder: 'Enter GP amount',
          min: 1,
          max: user?.stats.gp.wallet && user?.stats.gp.debt 
            ? Math.min(user.stats.gp.wallet, user.stats.gp.debt)
            : 0
        }
      ]"
    ></ion-alert>
    
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

<script src="./GoldBank.ts" />
<style lang="scss" src="./_GoldBank.scss" scoped />

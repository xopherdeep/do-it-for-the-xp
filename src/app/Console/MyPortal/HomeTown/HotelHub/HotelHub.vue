<template>
  <ion-page :class="$options.name">
    <ion-header>
      <ion-toolbar color="danger">
        <ion-buttons slot="start">
          <ion-back-button
           :default-href="`/my-portal/${userId}/my-home`"
           />
          <i class="fad fa-2x fa-hotel"
          />
        </ion-buttons>
        <ion-title>
          Hotel
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
      <ion-grid v-else>
        <ion-row>
          <ion-col
            size="6"
            v-for="item in items"
            :key="item.id"
            class="ion-no-padding"
          >
            <ion-card class="item ion-no-padding">
              <ion-card-header>
                <ion-card-subtitle
                  v-if="item.title"
                  v-html="sanitizeHtml(item.title.rendered)"
                />
              </ion-card-header>
              <ion-img v-bind="getImgObj(item.featured_media)"></ion-img>

              <ion-card-content class="ion-no-margin ion-no-padding">
              </ion-card-content>
            </ion-card>
          </ion-col>
        </ion-row>
      </ion-grid>
      
      <!-- fab button to trigger dialog -->
      <ion-fab
        vertical="bottom"
        horizontal="center"
        slot="fixed"
      >
        <ion-fab-button color="danger" @click="showHotelDialog">
          <i class="fad fa-concierge-bell fa-2x"></i>
        </ion-fab-button>
      </ion-fab>
    </ion-content>

    <xp-npc-dialog
      v-model:open="isTalking"
      speaker="Hotel Concierge"
      :lines="dialogBlocks"
      icon="fad fa-concierge-bell"
      @done="presentActionSheet"
    />

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
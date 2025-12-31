<template>
  <ion-page :class="$options.name">
    <ion-header>
      <ion-toolbar class="rpg-box luxe-toolbar">
        <i class="fad fa-users fa-lg" slot="start"></i>
        <ion-title>Family Chat</ion-title>
        <ion-buttons slot="end">
          <ion-button fill="clear">
          </ion-button>
          <xp-close-button @click="handleClose" color="light" size="sm" />
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content scroll-y="false" class="bg-slide bg-slide-dark">
      <div class="chat-container">
        <xp-chat-list :messages="messages" :can-load-more="canLoadMore" :is-loading="isLoading"
          @load-more="onLoadMore" />
        <xp-chat-input @send="onSendMessage" :disabled="isLoading" />
      </div>
    </ion-content>
  </ion-page>
</template>

<script src="./XpChat" />
<style lang="scss" src="./_XpChat.scss" scoped />
<template>
  <ion-page :class="$options.name">
    <ion-header>
      <ion-toolbar class="rpg-box">
        <ion-title>Family Chat</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="clickSettings">
            <i class="fad fa-bell fa-2x" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div class="message-container">
        <!-- Messages will be displayed here -->
        <div
          v-for="(message, index) in messages"
          :key="index"
          :class="['message-bubble', message.isOwnMessage ? 'own-message' : 'other-message']"
        >
          <div class="message-avatar">
            <ion-avatar>
              <img :src="message.avatar || 'https://ionicframework.com/docs/img/demos/avatar.svg'" />
            </ion-avatar>
          </div>
          <div class="message-content">
            <div class="message-header">
              <strong>{{ message.sender }}</strong>
              <small>{{ formatTime(message.timestamp) }}</small>
            </div>
            <div class="message-text">{{ message.text }}</div>
          </div>
        </div>
      </div>
    </ion-content>
    <ion-footer>
      <ion-toolbar>
        <ion-item>
          <ion-input
            v-model="newMessage"
            placeholder="Type a message..."
            @keyup.enter="sendMessage"
          ></ion-input>
          <ion-button
            slot="end"
            @click="sendMessage"
            :disabled="!newMessage.trim()"
          >
            <i class="fad fa-paper-plane" />
          </ion-button>
        </ion-item>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<script src="./XpChat" />
<style lang="scss" src="./_XpChat.scss" scoped />
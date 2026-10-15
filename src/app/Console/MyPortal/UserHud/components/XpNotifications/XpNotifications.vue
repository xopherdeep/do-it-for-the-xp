<template>
  <ion-page :class="$options.name">
    <ion-header>
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <i class="fad fa-bell fa-2x ml-2" />
        </ion-buttons>
        <ion-title>Notifications</ion-title>
        <ion-buttons slot="end">
          <ion-button router-link="/xp-settings/notifications" @click="handleClose">
            <i class="fad fa-cog fa-2x" />
          </ion-button>
          <xp-close-button @click="handleClose" color="light" size="sm" />
        </ion-buttons>
      </ion-toolbar>
      <ion-toolbar>
        <ion-segment :value="currentFilter" @ionChange="filterNotifications">
          <ion-segment-button value="all">
            <ion-label>All</ion-label>
          </ion-segment-button>
          <ion-segment-button value="unread">
            <ion-label>Unread<span v-if="unreadCount" class="unread-count">{{ unreadCount }}</span></ion-label>
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div class="notification-container">
        <ion-list>
          <ion-item-sliding v-for="notification in filteredNotifications" :key="notification.id">
            <ion-item
              button
              :detail="Boolean(notification.link)"
              :class="['kind-' + notification.kind, { unread: isUnread(notification) }]"
              @click="openNotification(notification)"
            >
              <div class="kind-icon" slot="start">
                <i class="fad" :class="iconOfKind(notification.kind)"></i>
              </div>
              <ion-label class="ion-text-wrap">
                <h2>
                  <span v-if="isUnread(notification)" class="unread-dot" aria-label="unread"></span>
                  {{ notification.title }}
                </h2>
                <p>{{ notification.body }}</p>
                <p class="notification-time">{{ whenCopy(notification.createdAt) }}</p>
              </ion-label>
            </ion-item>
            <ion-item-options side="end">
              <ion-item-option v-if="isUnread(notification)" color="primary" @click="markAsRead(notification)">
                <i class="fad fa-check fa-lg"></i>
                Read
              </ion-item-option>
              <ion-item-option color="danger" @click="deleteNotification(notification)">
                <i class="fad fa-trash fa-lg"></i>
                Delete
              </ion-item-option>
            </ion-item-options>
          </ion-item-sliding>

          <ion-item v-if="filteredNotifications.length === 0" class="empty-state" lines="none">
            <ion-label class="ion-text-center">
              <i class="fad fa-bell-slash fa-3x text-muted"></i>
              <p>{{ currentFilter === "unread" ? "Nothing unread" : "No notifications yet" }}</p>
            </ion-label>
          </ion-item>
        </ion-list>
      </div>
    </ion-content>
    <ion-footer v-if="notifications.length > 0">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button @click="markAllAsRead" fill="clear" size="small" :disabled="unreadCount === 0">
            <i class="fad fa-check-double fa-lg mr-1"></i>
            Mark all read
          </ion-button>
        </ion-buttons>
        <ion-buttons slot="end">
          <ion-button @click="deleteAllNotifications" fill="clear" color="danger" size="small">
            <i class="fad fa-trash fa-lg mr-1"></i>
            Clear
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<script lang="ts" src="./XpNotifications.ts" />
<style lang="scss" src="./_XpNotifications.scss" scoped />

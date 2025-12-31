<template>
  <ion-page :class="$options.name">
    <ion-header>
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">

          <i class="fad fa-bell fa-2x ml-2" />
        </ion-buttons>
        <ion-title>Notifications</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="toggleSettings">
            <i class="fad fa-filter fa-2x" />
          </ion-button>
          <ion-button router-link="/side-menu/settings/notifications">
            <i class="fad fa-cog fa-2x" />
          </ion-button>
          <xp-close-button @click="handleClose" color="light" size="sm" />
        </ion-buttons>
      </ion-toolbar>
      <ion-toolbar v-if="showFilters">
        <ion-segment v-model="currentFilter" @ionChange="filterNotifications">
          <ion-segment-button value="all">
            <ion-label>All</ion-label>
          </ion-segment-button>
          <ion-segment-button value="unread">
            <ion-label>Unread</ion-label>
          </ion-segment-button>
          <ion-segment-button value="xp" color="success">
            <ion-label>
              <i class="fad fa-hand-holding-seedling"></i> XP
            </ion-label>
          </ion-segment-button>
          <ion-segment-button value="ap" color="danger">
            <ion-label>
              <i class="fad fa-hand-holding-magic"></i> AP
            </ion-label>
          </ion-segment-button>
          <ion-segment-button value="gp" color="warning">
            <ion-label>
              <i class="fad fa-hand-holding-usd"></i> GP
            </ion-label>
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div class="notification-container">
        <ion-list>
          <ion-item-sliding v-for="(notification, index) in filteredNotifications" :key="index">
            <ion-item :class="{ 'unread': !notification.read }">
              <ion-avatar slot="start" v-if="!['xp', 'ap', 'gp'].includes(notification.type)">
                <img :src="getAvatarSrc(notification.avatar)" />
              </ion-avatar>
              <div class="point-icon-container" slot="start" v-else>
                <div class="point-icon-circle" :class="{
                  'success-bg': notification.type === 'xp',
                  'danger-bg': notification.type === 'ap',
                  'warning-bg': notification.type === 'gp'
                }">
                  <i class="fad" :class="{
                    'fa-hand-holding-seedling': notification.type === 'xp',
                    'fa-hand-holding-magic': notification.type === 'ap',
                    'fa-hand-holding-usd': notification.type === 'gp'
                  }"></i>
                </div>
              </div>
              <ion-label>
                <h2>{{ notification.title }}</h2>
                <p>{{ notification.message }}</p>
                <p class="notification-time">{{ formatTime(notification.timestamp) }}</p>
              </ion-label>
              <ion-badge v-if="!notification.read" color="danger" slot="end"></ion-badge>
              <ion-badge v-if="notification.type === 'xp'" color="success" slot="end" class="point-badge">
                <i class="fad fa-hand-holding-seedling mr-1"></i>
                +{{ notification.pointAmount }} XP
              </ion-badge>
              <ion-badge v-if="notification.type === 'ap'" color="danger" slot="end" class="point-badge">
                <i class="fad fa-hand-holding-magic mr-1"></i>
                +{{ notification.pointAmount }} AP
              </ion-badge>
              <ion-badge v-if="notification.type === 'gp'" color="warning" slot="end" class="point-badge">
                <i class="fad fa-hand-holding-usd mr-1"></i>
                +{{ notification.pointAmount }} GP
              </ion-badge>
            </ion-item>
            <ion-item-options side="end">
              <ion-item-option color="primary" @click="markAsRead(index)">
                <i class="fad fa-check fa-lg"></i>
                Mark as Read
              </ion-item-option>
              <ion-item-option color="danger" @click="deleteNotification(index)">
                <i class="fad fa-trash fa-lg"></i>
                Delete
              </ion-item-option>
            </ion-item-options>
          </ion-item-sliding>

          <ion-item v-if="filteredNotifications.length === 0" class="empty-state">
            <ion-label class="ion-text-center">
              <i class="fad fa-bell-slash fa-3x text-muted"></i>
              <p>No notifications</p>
            </ion-label>
          </ion-item>
        </ion-list>
      </div>
    </ion-content>
    <ion-footer v-if="filteredNotifications.length > 0">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button @click="markAllAsRead" fill="clear" size="small">
            <i class="fad fa-check-double fa-lg mr-1"></i>
            Mark All as Read
          </ion-button>
        </ion-buttons>
        <ion-buttons slot="end">
          <ion-button @click="deleteAllNotifications" fill="clear" color="danger" size="small">
            <i class="fad fa-trash fa-lg mr-1"></i>
            Clear All
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<script src="./XpNotifications" />
<style lang="scss" src="./_XpNotifications.scss" scoped />
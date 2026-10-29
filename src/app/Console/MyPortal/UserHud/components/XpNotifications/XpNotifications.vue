<template>
  <ion-page class="xp-notifications" :class="rootClass" :style="rootStyle">
    <ion-header>
      <ion-toolbar>
        <xp-app-header title="Notifications" icon="bell" :meta="unreadMeta">
          <template #start>
            <xp-close-button @click="handleClose" />
          </template>
          <template #end>
            <ion-buttons>
              <ion-button router-link="/xp-settings/notifications" @click="handleClose" aria-label="Notification Settings">
                <i class="fad fa-cog fa-lg" aria-hidden="true" />
              </ion-button>
            </ion-buttons>
          </template>
        </xp-app-header>
      </ion-toolbar>
    </ion-header>

    <ion-content class="notifications-content">
      <xp-app-empty
        v-if="filteredNotifications.length === 0"
        class="notifications-empty"
        icon="bell-slash"
        :text="currentFilter === 'unread' ? 'Nothing unread' : 'No notifications yet'"
      />
      <div v-else class="notifications-feed">
        <xp-app-section v-for="section in sections" :key="section.key" :label="section.label">
          <xp-app-row
            v-for="notification in section.items"
            :key="notification.id"
            class="notification-row"
            :class="['kind-' + notification.kind, { 'is-unread': isUnread(notification) }]"
            :title="notification.title"
            :subtitle="notification.body"
            :icon="iconOfKind(notification.kind)"
            :chevron="Boolean(notification.link)"
            :active="isUnread(notification)"
            @click="openNotification(notification)"
          >
            <template #chips>
              <span v-if="isUnread(notification)" class="unread-dot" aria-label="Unread" />
              <xp-app-chip kind="tag" :value="kindLabel(notification.kind)" />
              <xp-app-chip kind="tag" :value="whenCopy(notification.createdAt)" />
            </template>
            <template #trailing>
              <div class="row-actions" @click.stop>
                <button
                  v-if="isUnread(notification)"
                  type="button"
                  class="row-action-btn read-btn"
                  title="Mark read"
                  aria-label="Mark read"
                  @click.stop="markAsRead(notification)"
                >
                  <i class="fad fa-check" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  class="row-action-btn delete-btn"
                  title="Delete"
                  aria-label="Delete notification"
                  @click.stop="deleteNotification(notification)"
                >
                  <i class="fad fa-trash" aria-hidden="true" />
                </button>
              </div>
            </template>
          </xp-app-row>
        </xp-app-section>
      </div>
    </ion-content>

    <ion-footer class="notifications-footer">
      <div class="xp-app-bar">
        <div class="filter-pills" role="tablist">
          <button
            type="button"
            class="filter-pill"
            :class="{ 'is-active': currentFilter === 'all' }"
            @click="setFilter('all')"
          >
            All ({{ notifications.length }})
          </button>
          <button
            type="button"
            class="filter-pill"
            :class="{ 'is-active': currentFilter === 'unread' }"
            @click="setFilter('unread')"
          >
            Unread
            <span v-if="unreadCount > 0" class="pill-badge">{{ unreadCount }}</span>
          </button>
        </div>
        <div class="footer-actions">
          <button
            type="button"
            class="xp-app-btn mark-all-btn"
            :disabled="unreadCount === 0"
            @click="markAllAsRead"
          >
            <i class="fad fa-check-double mr-1" aria-hidden="true" /> Mark Read
          </button>
          <button
            type="button"
            class="xp-app-btn clear-btn"
            :disabled="notifications.length === 0"
            @click="deleteAllNotifications"
          >
            <i class="fad fa-trash mr-1" aria-hidden="true" /> Clear
          </button>
        </div>
      </div>
    </ion-footer>
  </ion-page>
</template>

<script lang="ts" src="./XpNotifications.ts" />
<style lang="scss" src="./_XpNotifications.scss" scoped />

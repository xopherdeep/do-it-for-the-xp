<template>
  <ion-page>
    <ion-header>
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <ion-back-button 
            :default-href="`/my-portal/${userId}/my-home`"
          ></ion-back-button>
          <ion-icon :icon="calendarOutline" slot="icon-only" />
          <!-- <i class="fad fa-calendar" /> -->
        </ion-buttons>
        <ion-title>
          {{ calendarTitle }} <!-- Dynamic Title -->
        </ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="my-calendar" :fullscreen="true">
      <xp-loading v-if="isLoading" />
      <!-- v-calendar Integration -->
      <Calendar
        is-expanded
        title-position="left"
        :attributes="attributes"
        :from-page="calendarPage"
        @update:from-page="handleUpdatePage"
        @dayclick="handleDayClick"
        class="ion-padding"
      />
      <!-- Removed the old ion-item select and ion-grid -->
      <!-- fab placed to the bottom and start and on the bottom edge of the content overlapping footer with a list to the right -->
      <ion-fab
        vertical="bottom"
        horizontal="center"
        slot="fixed"
        @click.stop="presentActionSheet"
      >
        <ion-fab-button >
          <ion-icon :icon="calendarOutline"></ion-icon>
        </ion-fab-button>
      </ion-fab>
    </ion-content>
    <ion-footer>
      <ion-toolbar color="secondary">
        <ion-grid>
          <ion-row>
            <ion-col class="ion-no-padding">
              <!-- Updated search bar model and event -->
              <ion-searchbar
                color="light"
                :debounce="500"
                @ionChange="searchEvents"
                v-model="searchQuery"
                placeholder="Search Quests..."
              ></ion-searchbar>
            </ion-col>
          </ion-row>
          <ion-row>
            <ion-col>
              <!-- Previous Month Button -->
              <ion-button
                @click="prevMonth"
                color="light"
                expand="block"
              >
                <ion-icon :icon="chevronBack" slot="icon-only" />
              </ion-button>
            </ion-col>
            <ion-col>
              <!-- Next Month Button -->
              <ion-button
                @click="nextMonth"
                color="light"
                expand="block"
              >
                <ion-icon :icon="chevronForward" slot="icon-only" />
              </ion-button>
            </ion-col>
          </ion-row>
        </ion-grid>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<script src="./MyCalendar" />
<style lang="scss" src="./_MyCalendar.scss" scoped />

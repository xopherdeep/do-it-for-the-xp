<template>
  <ion-page class="town-hall">
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <xp-back-button></xp-back-button>
          <ion-icon :icon="businessOutline" slot="icon-only" />
        </ion-buttons>
        <ion-title> Town Hall </ion-title>
        <ion-buttons slot="end">
          <ion-button data-cy="th-family-chat" aria-label="Family Chat" @click="openFamilyChat">
            <ion-icon :icon="chatbubblesOutline" slot="icon-only" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <!-- Each tab loads the first time it is opened, then stays (and keeps its place) while another is shown -->
      <div class="th-body">
        <town-hall-news v-if="isOpened('news')" v-show="selectedTab === 'news'" ref="newsTab" @trouble="onTrouble('news')" />
        <town-hall-board
          v-if="isOpened('board')"
          v-show="selectedTab === 'board'"
          ref="boardTab"
          :board-slug="boardSlug"
          @boards="onBoards"
          @trouble="onTrouble('board')"
        />
        <town-hall-events v-if="isOpened('events')" v-show="selectedTab === 'events'" ref="eventsTab" :groups="groupedEvents" />
        <town-hall-updates
          v-if="isOpened('updates')"
          v-show="selectedTab === 'updates'"
          ref="updatesTab"
          :stats="stats"
          @trouble="onTrouble('updates')"
        />
      </div>

      <!-- The clerk takes errands: the button sits just above the tabs -->
      <ion-fab vertical="bottom" horizontal="center" slot="fixed">
        <ion-fab-button color="primary" data-cy="th-clerk" aria-label="Talk to the clerk" @click="talkToClerk">
          <ion-icon :icon="addOutline"></ion-icon>
        </ion-fab-button>
      </ion-fab>
    </ion-content>

    <!-- The tabs, and above them the board picker while the Board is open: controls stay at the bottom -->
    <ion-footer class="th-footer">
      <ion-toolbar v-if="selectedTab === 'board' && boards.length" color="primary" class="th-boards" data-cy="th-boards">
        <div class="th-boards__chips">
          <ion-chip
            v-for="board in boards"
            :key="board.slug"
            :data-cy="`th-board-${board.slug}`"
            :outline="board.slug !== boardSlug"
            :aria-pressed="board.slug === boardSlug"
            @click="boardSlug = board.slug"
          >
            <ion-label v-html="sanitizeHtml(board.name)"></ion-label>
          </ion-chip>
        </div>
      </ion-toolbar>
      <ion-toolbar color="primary" class="th-tabs">
        <ion-segment v-model="selectedTab">
          <ion-segment-button v-for="tab in tabs" :key="tab.id" :value="tab.id" :data-cy="`th-tab-${tab.id}`">
            <ion-label>{{ tab.label }}</ion-label>
            <ion-icon :icon="tab.icon"></ion-icon>
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-footer>

    <!-- The clerk's dialog: the game's own prompt, not a native sheet or toast -->
    <xp-reveal-prompt :prompt="prompt" @respond="respond" />
  </ion-page>
</template>

<script lang="ts" src="./TownHall.ts" />
<style lang="scss" src="./_TownHall.scss" />

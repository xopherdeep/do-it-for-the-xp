<template>
  <ion-page class="my-quests" :class="rootClass" :style="rootStyle">
    <ion-header>
      <ion-toolbar>
        <xp-app-header title="Beast Log" icon="scroll" :meta="headerMeta">
          <template #start>
            <ion-buttons>
              <xp-back-button :icon="arrowBack"></xp-back-button>
            </ion-buttons>
          </template>
        </xp-app-header>
      </ion-toolbar>
    </ion-header>

    <ion-content class="my-tasks" :class="`view-${view}`">
      <!-- A Game Master with chores waiting on their word sees the village's prompt (hidden for a hero) -->
      <XpVillageAwaits />
      <XpLoading v-if="isLoading" />

      <!--
        One row per quest. The Board groups them by when they are due (Overdue, Today, This week, Later, Done) and a
        tap opens the quest; the List keeps them flat, overdue first, with a Done button on every open one.
      -->
      <!-- Tamed: the hero's collection, three beasts to a row, each as big as the art allows -->
      <template v-else-if="view === 'tamed'">
        <ul v-if="tamedTiles.length" class="tamed-grid" aria-label="Tamed beasts">
          <li v-for="beast in tamedTiles" :key="beast.id" class="tamed-beast" :title="beast.name">
            <span class="tamed-beast__art">
              <img v-if="beast.image" :src="beast.image" alt="" loading="lazy" draggable="false" />
              <i v-else class="fad fa-scroll" aria-hidden="true"></i>
              <span v-if="beast.count > 1" class="tamed-beast__count" :aria-label="`tamed ${beast.count} times`">x{{ beast.count }}</span>
            </span>
            <span class="tamed-beast__name">{{ beast.name }}</span>
          </li>
        </ul>
        <xp-app-empty v-else icon="dragon" :text="emptyLine" class="quest-empty" />
      </template>
      <div v-else-if="sections.length" class="quest-sections">
        <xp-app-section v-for="section in sections" :key="section.key" :label="section.label"
          :class="`quest-section quest-section--${section.key}`">
          <xp-app-row v-for="row in section.rows" :key="row.id" :id="row.id" class="quest-log-row"
            :class="{ 'is-overdue': row.status === 'overdue', 'is-tamed': row.status === 'done', 'is-pending': row.status === 'pending', 'is-later': row.status === 'later', 'is-celebrating': celebrating?.id === row.id, 'is-celebrating--pending': celebrating?.id === row.id && celebrating.pending, 'is-landed': landed === row.id }"
            :data-status="row.status" :title="row.title" :subtitle="row.subtitle" :image="row.image" :icon="row.icon"
            :chevron="!(view === 'list' && row.canFinish)" :disabled="finishing === row.id" @click="openRow(row)">
            <template v-if="row.hasChips" #chips>
              <xp-app-chips :chips="row.chips" />
            </template>
            <template v-if="(view === 'list' && row.canFinish) || row.stateLabel" #trailing>
              <XpQuestRowTrailing :row="row" :stamp="celebrating?.id === row.id ? celebrating : null"
                :show-done="view === 'list' && row.canFinish" :finishing="finishing === row.id"
                @done="confirmDone(row.source)" />
            </template>
          </xp-app-row>
        </xp-app-section>
      </div>
      <xp-app-empty v-else icon="scroll" :text="emptyLine" class="quest-empty" />

      <!-- FAB (the same one the town's buildings and the Calendar use) to open the log's actions -->
      <ion-fab slot="fixed" vertical="bottom" horizontal="center">
        <ion-fab-button color="warning" aria-label="Quest actions" data-test="quests-fab" @click="presentActionSheet">
          <i class="fad fa-dragon fa-2x"></i>
        </ion-fab-button>
      </ion-fab>
      <XpQuickTaskModal v-if="addOpen" :userId="String(userId)" :users="userStore.users"
        @saved="onTaskSaved" @didDismiss="addOpen = false" />

      <!-- The Quest Wizard: any player adds a quest, a picture and a few taps at a time -->
      <XpQuestWizardModal :open="wizardOpen" :prefill="wizardPrefill" @close="wizardOpen = false"
        @saved="onQuestSaved" />

      <!-- The Beast Maker: a maker draws a beast and sends it to the Game Master; "Make a quest with it" opens the wizard on it -->
      <XpBeastMakerModal :open="makerOpen" :heroId="String(userId)" @close="makerOpen = false" @saved="loadBoard"
        @quest="openWizardWith" />

      <!-- A tap on a quest opens its bestiary entry: the beast, its checklist, and Hunt / Claim -->
      <XpBeastCardModal v-if="activeRow" @didDismiss="onTaskDismissed" :quest="activeRow.quest"
        :status="activeRow.status" :due="activeRow.due" :dueLabel="activeRow.dueLabel" :userId="userId"
        :lockedNotice="activeRow.lockedNotice" :sentBack="activeRow.sentBack" />
    </ion-content>

    <ion-footer class="quests-footer">
      <div class="xp-app-bar">
        <label class="xp-app-search">
          <i class="fad fa-search" aria-hidden="true"></i>
          <input v-model="searchText" type="search" placeholder="Search Quests" aria-label="Search Quests"
            autocomplete="off" enterkeyhint="search" @keypress="playTextSound" @keyup="resetTextSound" />
        </label>
      </div>

      <xp-app-bottom-nav
        :tabs="questTabs"
        v-model="view"
        aria-label="Quest Navigation"
        @change="onViewChange"
      />
    </ion-footer>
  </ion-page></template>

<script lang="ts" src="./MyQuests.ts" />
<style lang="scss" src="./_MyQuests.scss" scoped />

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
      <XpLoading v-if="isLoading" />

      <!--
        One row per quest. The Board groups them by when they are due (Overdue, Today, This week, Later, Done) and a
        tap opens the quest; the List keeps them flat, overdue first, with a Done button on every open one.
      -->
      <div v-else-if="sections.length" class="quest-sections">
        <xp-app-section v-for="section in sections" :key="section.key" :label="section.label"
          :class="`quest-section quest-section--${section.key}`">
          <xp-app-row v-for="row in section.rows" :key="row.id" :id="row.id" class="quest-log-row"
            :class="{ 'is-overdue': row.status === 'overdue', 'is-tamed': row.status === 'done', 'is-pending': row.status === 'pending', 'is-later': row.status === 'later', 'is-celebrating': celebrating?.id === row.id, 'is-celebrating--pending': celebrating?.id === row.id && celebrating.pending, 'is-landed': landed === row.id }"
            :data-status="row.status" :title="row.title" :subtitle="row.subtitle" :image="row.image" :icon="row.icon"
            :chevron="!(view === 'list' && row.canFinish)" :disabled="finishing === row.id" @click="openRow(row)">
            <template v-if="row.hasChips" #chips>
              <xp-app-chip v-if="row.rewards.xp" kind="xp" :value="row.rewards.xp" />
              <xp-app-chip v-if="row.rewards.gp" kind="gp" :value="row.rewards.gp" />
              <xp-app-chip v-if="row.rewards.ap" kind="ap" :value="row.rewards.ap" />
              <xp-app-chip v-if="row.requiresApproval" kind="tag" value="GM approves" />
              <xp-app-chip v-if="row.who" kind="tag" :value="row.who" />
            </template>
            <template v-if="(view === 'list' && row.canFinish) || row.stateLabel" #trailing>
              <span v-if="celebrating?.id === row.id" class="quest-stamp" :class="{ 'quest-stamp--pending': celebrating.pending }"
                aria-hidden="true">
                <i :class="['fad', celebrating.pending ? 'fa-hourglass-half' : 'fa-check-double']"></i>
                {{ celebrating.pending ? "Sent" : "Tamed" }}
              </span>
              <button v-else-if="view === 'list' && row.canFinish" type="button" class="xp-app-btn quest-done-btn"
                :disabled="finishing === row.id" :aria-label="`Done: ${row.title}`" @click="confirmDone(row.source)">
                <i class="fad fa-check-double" aria-hidden="true"></i>
                Done
              </button>
              <span v-else class="quest-state" :class="{
                'tamed-ribbon': row.status === 'done',
                'pending-ribbon': row.status === 'pending',
              }">{{ row.stateLabel }}</span>
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

      <!-- A tap on a quest opens its bestiary entry: the beast, its checklist, and Hunt / Claim -->
      <XpBeastCardModal v-if="activeRow" @didDismiss="onTaskDismissed" :quest="activeRow.quest"
        :status="activeRow.status" :due="activeRow.due" :dueLabel="activeRow.dueLabel" :userId="userId" />
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

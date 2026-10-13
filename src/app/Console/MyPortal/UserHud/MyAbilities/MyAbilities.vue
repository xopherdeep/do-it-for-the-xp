<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="tertiary">
        <ion-buttons slot="start">
          <xp-back-button :icon="arrowBack"></xp-back-button>
          <i class="fad fa-book-spells fa-lg" />
        </ion-buttons>
        <ion-title> My Powers </ion-title>
      </ion-toolbar>
      <ion-toolbar color="tertiary">
        <ion-searchbar
          color="light"
          placeholder="Search Powers"
          v-model="search"
        />
      </ion-toolbar>
    </ion-header>

    <ion-content class="my-abilities">
      <XpLoading v-if="isLoading" />
      <div v-else-if="!visible.length" class="powers-empty">
        <p v-if="!abilities.length">No Powers yet. Ask your Game Master to add some.</p>
        <p v-else>No Powers match. Try another tab.</p>
      </div>
      <div v-else class="powers-list">
        <xp-power-card
          v-for="ability in visible"
          :key="ability.id"
          :ability="ability"
          :status="statuses[ability.id] || 'locked'"
          :unlocked="Boolean(unlocks[ability.id])"
          :snapshot="snapshot"
          :grounded-reason="groundedReason"
          :casting="casting === ability.id"
          @cast="cast"
        />
      </div>
    </ion-content>

    <ion-footer class="abilities-footer">
      <xp-app-bottom-nav
        :tabs="powerTabs"
        v-model="filter"
        aria-label="Powers Navigation"
      />
    </ion-footer>
  </ion-page>
</template>

<script lang="ts" src="./MyAbilities.ts" />
<style lang="scss" src="./_MyAbilities.scss" scoped />

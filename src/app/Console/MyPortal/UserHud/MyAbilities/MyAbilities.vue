<template>
  <ion-page :class="rootClass" :style="rootStyle">
    <ion-header>
      <ion-toolbar>
        <xp-app-header title="Powers" icon="book-spells" :meta="mpMeta">
          <template #start>
            <ion-buttons>
              <xp-back-button :icon="arrowBack"></xp-back-button>
            </ion-buttons>
          </template>
        </xp-app-header>
      </ion-toolbar>
    </ion-header>

    <ion-content class="my-abilities">
      <xp-power-timer-bar v-if="heroId" :hero-id="heroId" />
      <XpLoading v-if="isLoading" />
      <xp-app-empty
        v-else-if="!groups.length"
        class="powers-empty"
        icon="book-spells"
        :text="!abilities.length ? t('powers.empty.none') : t('powers.empty.filter')"
      />
      <div v-else class="powers-list">
        <xp-app-section v-for="group in groups" :key="group.type" :label="group.label">
          <div class="powers-grid">
            <xp-power-card
              v-for="row in group.rows"
              :key="row.id"
              :ability="row.ability"
              :status="statuses[row.id] || 'locked'"
              :unlocked="Boolean(unlocks[row.id])"
              :snapshot="snapshot"
              :casting="casting === row.id"
              :grounded-reason="groundedReason"
              :timer-left="timerLeftOf[row.id] ?? null"
              @cast="cast"
            />
          </div>
        </xp-app-section>
      </div>
    </ion-content>

    <ion-footer class="abilities-footer">
      <div class="xp-app-bar">
        <label class="xp-app-search">
          <i class="fad fa-search" aria-hidden="true"></i>
          <input
            v-model="search"
            type="search"
            placeholder="Search Powers"
            aria-label="Search Powers"
            autocomplete="off"
            enterkeyhint="search"
          />
        </label>
      </div>
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

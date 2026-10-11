<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="tertiary">
        <ion-buttons slot="start">
          <ion-back-button
            :default-href="`/my-portal/${heroId}`"
            :icon="arrowBack"
          ></ion-back-button>
          <i class="fad fa-book-spells fa-lg" />
        </ion-buttons>
        <ion-title> My Powers </ion-title>
      </ion-toolbar>
      <ion-toolbar>
        <ion-segment
          @ionChange="segmentChanged($event)"
          color="tertiary"
          scrollable
          :value="filter"
        >
          <ion-segment-button value="all">
            <ion-icon :icon="colorWandOutline"></ion-icon>
            All
          </ion-segment-button>
          <ion-segment-button value="real-life">
            <ion-icon :icon="keyOutline"></ion-icon>
            Privileges
          </ion-segment-button>
          <ion-segment-button value="in-game">
            <ion-icon :icon="flashOutline"></ion-icon>
            Spells
          </ion-segment-button>
          <ion-segment-button value="unlocked">
            <ion-icon :icon="lockOpenOutline"></ion-icon>
            Unlocked
          </ion-segment-button>
          <ion-segment-button value="locked">
            <ion-icon :icon="lockClosedOutline"></ion-icon>
            Locked
          </ion-segment-button>
        </ion-segment>
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
          :casting="casting === ability.id"
          @cast="cast"
        />
      </div>
    </ion-content>

    <ion-footer>
      <ion-toolbar color="tertiary">
        <ion-grid>
          <ion-row>
            <ion-col class="ion-no-padding">
              <ion-searchbar
                color="light"
                placeholder="Search Powers"
                v-model="search"
              ></ion-searchbar>
            </ion-col>
          </ion-row>
        </ion-grid>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<script lang="ts" src="./MyAbilities.ts" />
<style lang="scss" src="./_MyAbilities.scss" scoped />

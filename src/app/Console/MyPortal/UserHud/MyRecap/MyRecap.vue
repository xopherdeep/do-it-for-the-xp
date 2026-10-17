<template>
  <ion-page class="my-recap icon-colors">
    <ion-header>
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <xp-back-button></xp-back-button>
        </ion-buttons>
        <ion-title><i class="fad fa-scroll-old mr-2" aria-hidden="true"></i>This week in the village</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="bg-slide bg-slide-dark">
      <div v-if="!loaded" class="recap-loading"><ion-spinner name="crescent"></ion-spinner></div>
      <div v-else class="recap" data-cy="weekly-recap-page">
        <div class="recap-span" role="group" aria-label="Which week">
          <button type="button" :class="{ on: span === 'rolling' }" :aria-pressed="span === 'rolling'"
            @click="chooseSpan('rolling')">Last 7 days</button>
          <button type="button" :class="{ on: span === 'previous' }" :aria-pressed="span === 'previous'"
            @click="chooseSpan('previous')">Last week</button>
        </div>

        <!-- The family: made to be screenshotted -->
        <section class="rpg-box recap-family" data-cy="recap-family">
          <h2><i class="fad fa-users" aria-hidden="true"></i> The village</h2>
          <p class="recap-range">{{ range }}</p>
          <div v-if="!recap.isEmpty" class="recap-numbers">
            <div class="big-stat"><span class="big-value">{{ recap.family.chores }}</span><span class="big-label">Chores</span></div>
            <div class="big-stat xp"><span class="big-value">{{ recap.family.xp }}</span><span class="big-label">XP</span></div>
            <div class="big-stat gp"><span class="big-value">{{ recap.family.gp }}</span><span class="big-label">GP</span></div>
          </div>
          <p v-if="crownLine" class="recap-crown"><i class="fad fa-crown" aria-hidden="true"></i> {{ crownLine }}</p>
          <ul class="recap-lines">
            <li v-for="line in recap.lines" :key="line">{{ line }}</li>
          </ul>
          <p v-if="recap.isEmpty" class="recap-empty" data-cy="recap-empty">
            Do a quest and your week will show up here.
          </p>
          <ion-button v-else expand="block" class="recap-share" data-cy="share-recap" @click="share">
            <i class="fad fa-share-alt mr-2" aria-hidden="true"></i>Share the week
          </ion-button>
        </section>

        <!-- One card per hero (the Game Master sees all; a hero sees their own) -->
        <section v-for="hero in shownHeroes" :key="hero.heroId" class="rpg-box recap-hero" data-cy="recap-hero">
          <header class="recap-hero-head">
            <img class="recap-avatar" :src="hero.avatarSrc" alt="" />
            <div>
              <h3>{{ hero.name }}</h3>
              <p v-if="hero.isHeroOfTheWeek" class="recap-badge"><i class="fad fa-crown" aria-hidden="true"></i> Hero of the week</p>
            </div>
          </header>
          <div class="recap-numbers">
            <div class="big-stat"><span class="big-value">{{ hero.chores }}</span><span class="big-label">Chores</span></div>
            <div class="big-stat xp"><span class="big-value">{{ hero.xp }}</span><span class="big-label">XP</span></div>
            <div class="big-stat gp"><span class="big-value">{{ hero.gp }}</span><span class="big-label">GP</span></div>
            <div class="big-stat"><span class="big-value">{{ hero.ap }}</span><span class="big-label">AP</span></div>
          </div>
          <dl class="recap-facts">
            <div v-if="hero.streak > 0"><dt><i class="fad fa-fire" aria-hidden="true"></i> Streak</dt><dd>{{ hero.streak }} {{ hero.streak === 1 ? "day" : "days" }}</dd></div>
            <div v-if="hero.bestStreak > 1"><dt>Best run</dt><dd>{{ hero.bestStreak }} days</dd></div>
            <div v-if="hero.busiest"><dt>Busiest day</dt><dd>{{ hero.busiest }}</dd></div>
            <div v-if="hero.levelUps.length"><dt><i class="fad fa-arrow-alt-circle-up" aria-hidden="true"></i> Level</dt><dd>reached {{ hero.levelUps[hero.levelUps.length - 1] }}</dd></div>
            <div v-if="hero.pending"><dt>Waiting for approval</dt><dd>{{ hero.pending }}</dd></div>
            <div v-if="isGameMaster && hero.sentBack"><dt>Sent back</dt><dd>{{ hero.sentBack }}</dd></div>
          </dl>
          <ol v-if="hero.topBeasts.length" class="beast-list">
            <li v-for="beast in hero.topBeasts" :key="beast.name">
              <span class="beast-name"><i class="fad fa-dragon" aria-hidden="true"></i> {{ beast.name }}</span><span class="beast-count">x{{ beast.count }}</span>
            </li>
          </ol>
          <p v-else class="recap-empty">No beasts tamed yet. A fresh week awaits!</p>
        </section>
      </div>
    </ion-content>
  </ion-page>
</template>

<script lang="ts" src="./MyRecap.ts"></script>
<style lang="scss" src="./_MyRecap.scss" scoped></style>

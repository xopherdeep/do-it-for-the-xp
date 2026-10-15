<template>
  <ion-page class="my-records icon-colors">
    <ion-header>
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <xp-back-button></xp-back-button>
        </ion-buttons>
        <ion-title><i class="fad fa-scroll-old mr-2" aria-hidden="true"></i>Hero Records</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="bg-slide bg-slide-dark">
      <div v-if="!loaded" class="records-loading"><ion-spinner name="crescent"></ion-spinner></div>
      <div v-else class="records">
        <!-- The weekly recap: made to be screenshotted -->
        <section class="rpg-box recap-card" data-cy="weekly-recap">
          <header class="recap-head">
            <img class="recap-avatar" :src="avatarSrc" alt="" />
            <div>
              <h2>{{ nickname }}'s Week</h2>
              <p class="recap-range">{{ weekRange }}</p>
            </div>
          </header>
          <div class="recap-numbers">
            <div class="big-stat">
              <span class="big-value">{{ insights.thisWeek.quests }}</span>
              <span class="big-label">Quests</span>
              <span class="big-change">{{ questChange }}</span>
            </div>
            <div class="big-stat xp">
              <span class="big-value">{{ insights.thisWeek.xp }}</span>
              <span class="big-label">XP</span>
              <span class="big-change">{{ xpChange }}</span>
            </div>
            <div class="big-stat gp">
              <span class="big-value">{{ insights.thisWeek.gp }}</span>
              <span class="big-label">GP</span>
            </div>
          </div>
          <ul class="recap-lines">
            <li v-for="line in recap" :key="line">{{ line }}</li>
          </ul>
          <ion-button expand="block" class="recap-share" data-cy="share-recap" @click="shareRecap">
            <i class="fad fa-share-alt mr-2" aria-hidden="true"></i>Share my week
          </ion-button>
        </section>

        <!-- Streak -->
        <section v-if="rules.streaks" class="rpg-box records-card streak-card">
          <h3><i class="fad fa-fire" aria-hidden="true"></i> Daily Streak</h3>
          <div class="streak-row">
            <div class="streak-now">
              <span class="big-value">{{ insights.streak.current }}</span>
              <span class="big-label">{{ insights.streak.current === 1 ? "day" : "days" }}</span>
            </div>
            <dl class="streak-facts">
              <div><dt>Best</dt><dd>{{ Math.max(insights.streak.best, insights.streak.current) }} days</dd></div>
              <div><dt>Shields</dt><dd>{{ insights.streak.shields }}</dd></div>
              <div><dt>Next chest</dt><dd>day {{ next.day }}</dd></div>
            </dl>
          </div>
          <p v-if="insights.streak.atRisk" class="streak-warning">Finish a quest today to keep your streak!</p>
        </section>

        <!-- XP over the last 8 weeks -->
        <section class="rpg-box records-card">
          <h3><i class="fad fa-chart-bar" aria-hidden="true"></i> XP by week</h3>
          <div class="xp-chart" role="img" :aria-label="`XP earned each week for the last ${bars.length} weeks`">
            <div v-for="bar in bars" :key="bar.from" class="xp-bar-col" :class="{ now: bar.isThisWeek }">
              <span class="xp-bar-value">{{ bar.xp || "" }}</span>
              <div class="xp-bar-track">
                <div class="xp-bar" :style="{ '--bar-height': `${bar.height}%` }"></div>
              </div>
              <span class="xp-bar-label">{{ bar.isThisWeek ? "Now" : bar.label }}</span>
            </div>
          </div>
        </section>

        <!-- All-time records -->
        <section class="rpg-box records-card">
          <h3><i class="fad fa-trophy-alt" aria-hidden="true"></i> All-time</h3>
          <div class="records-grid">
            <div class="record"><span class="record-value">{{ insights.allTime.quests }}</span><span class="record-label">Quests done</span></div>
            <div class="record"><span class="record-value">{{ insights.allTime.xp }}</span><span class="record-label">XP from quests</span></div>
            <div class="record"><span class="record-value">{{ insights.allTime.beasts }}</span><span class="record-label">Kinds of beasts tamed</span></div>
            <div class="record"><span class="record-value">{{ insights.allTime.fights }}</span><span class="record-label">Battles won</span></div>
            <div class="record"><span class="record-value small">{{ busiestDay }}</span><span class="record-label">Busiest day</span></div>
            <div class="record"><span class="record-value small">{{ favoriteTime }}</span><span class="record-label">Favorite time</span></div>
          </div>
        </section>

        <!-- Beasts -->
        <section class="rpg-box records-card">
          <h3><i class="fad fa-dragon" aria-hidden="true"></i> Most tamed</h3>
          <ol v-if="insights.topBeasts.length" class="beast-list">
            <li v-for="beast in insights.topBeasts" :key="beast.questId">
              <span class="beast-name">{{ beast.name }}</span><span class="beast-count">x{{ beast.count }}</span>
            </li>
          </ol>
          <p v-else class="records-empty">Tame your first beast to see it here.</p>
        </section>

        <section class="rpg-box records-card">
          <h3><i class="fad fa-running" aria-hidden="true"></i> Ran from most</h3>
          <ol v-if="insights.dodged.length" class="beast-list dodged">
            <li v-for="beast in insights.dodged" :key="beast.questId">
              <span class="beast-name">{{ beast.name }}</span><span class="beast-count">ran {{ beast.count }}x</span>
            </li>
          </ol>
          <p v-else class="records-empty">You have never run from a fight. Brave hero!</p>
        </section>
      </div>
    </ion-content>
  </ion-page>
</template>

<script lang="ts" src="./MyRecords.ts"></script>
<style lang="scss" src="./_MyRecords.scss" scoped></style>

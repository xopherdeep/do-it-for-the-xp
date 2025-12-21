<template>
  <ion-page :class="$options.name">
    <ion-header>
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <ion-back-button
            :default-href="`/my-portal/${userId}/my-home`"
            :icon="arrowBack"
          ></ion-back-button>
        </ion-buttons>
        <ion-title v-if="user && user.name">
          {{ user.name.first }}
          {{ user.name.middle }}
          {{ user.name.last }}
        </ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content
      :fullscreen="true"
      v-if="user && user.stats"
      class="ion-padding rpg-box bg-slide"
    >
      <!-- Single Consolidated Card -->
      <ion-card class="profile-card">
        <!-- Hero Section -->
        <ion-card-header class="hero-section">
          <div class="hero-container">
            <!-- Left Side: Avatar -->
            <div class="hero-avatar-side">
              <div class="hero-avatar-wrapper">
                <ion-avatar class="hero-avatar">
                  <ion-img :src="$requireAvatar(`./${user.avatar || '001-gamer'}.svg`)" />
                </ion-avatar>
                <div class="level-badge">
                  <ion-badge color="success">Lv.{{ user.stats?.level || 1 }}</ion-badge>
                </div>
              </div>
            </div>

            <!-- Right Side: Info -->
            <div class="hero-info-side">
              <ion-card-title class="profile-name">{{ user.name?.nick }}</ion-card-title>

              <!-- XP Bar Section -->
              <div class="xp-section">
                <div class="xp-header">
                  <span class="xp-label">XP</span>
                  <span class="xp-percent">{{ Math.round(xpProgress * 100) }}%</span>
                </div>
                <ion-progress-bar
                  color="success"
                  :value="xpProgress"
                  class="xp-bar"
                ></ion-progress-bar>
              </div>

              <!-- Class & Food Row -->
              <div class="hero-stats-row">
                <div class="hero-stat-item">
                  <div class="stat-icon-wrapper class-color">
                    <i :class="`fad ${getClassIcon(user.jobClass)} fa-2x`"></i>
                  </div>
                  <div class="stat-text">
                    <span class="stat-label">CLASS</span>
                    <span class="stat-value">{{ user.jobClass || 'Adventurer' }}</span>
                  </div>
                </div>
                <div
                  v-if="user.favoriteFood"
                  class="hero-stat-item"
                >
                  <div class="stat-icon-wrapper food-color">
                    <i :class="`fad ${getFoodIcon(user.favoriteFood)} fa-2x`"></i>
                  </div>
                  <div class="stat-text">
                    <span class="stat-label">FAVORITE FOOD</span>
                    <span class="stat-value">{{ user.favoriteFood }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Current Activity & Race (Smaller) -->
          <div class="hero-footer-row">
            <ion-chip
              v-if="user.race"
              color="tertiary"
              outline
              size="small"
            >
              <i class="fad fa-dna"></i>
              <ion-label>{{ user.race }}</ion-label>
            </ion-chip>
            <div
              v-if="user.currentActivity"
              class="activity-status"
            >
              <ion-badge
                color="success"
                class="status-pulse"
              >
                <i class="fad fa-running mr-1"></i>
                {{ user.currentActivity }}
              </ion-badge>
            </div>
          </div>
        </ion-card-header>

        <ion-card-content class="stats-content">
          <!-- Vitals Row -->
          <div class="vitals-grid">
            <div class="vital-item vital-hp">
              <div class="vital-icon">
                <i class="fad fa-heart fa-lg"></i>
              </div>
              <div class="vital-info">
                <span class="vital-label">HP</span>
                <ion-progress-bar
                  color="danger"
                  :value="(user.stats?.hp?.now || 0) / (user.stats?.hp?.max || 1)"
                ></ion-progress-bar>
                <span class="vital-value">{{ user.stats?.hp?.now || 0 }}/{{ user.stats?.hp?.max || 0 }}</span>
              </div>
            </div>
            <div class="vital-item vital-mp">
              <div class="vital-icon">
                <i class="fad fa-sparkles fa-lg"></i>
              </div>
              <div class="vital-info">
                <span class="vital-label">MP</span>
                <ion-progress-bar
                  color="tertiary"
                  :value="(user.stats?.mp?.now || 0) / (user.stats?.mp?.max || 1)"
                ></ion-progress-bar>
                <span class="vital-value">{{ user.stats?.mp?.now || 0 }}/{{ user.stats?.mp?.max || 0 }}</span>
              </div>
            </div>
            <div class="vital-item vital-gp">
              <div class="vital-icon">
                <i class="fad fa-coins fa-lg"></i>
              </div>
              <div class="vital-info">
                <span class="vital-label">GP</span>
                <span class="vital-value large">{{ user.stats?.gp?.wallet || 0 }}</span>
              </div>
            </div>
            <div class="vital-item vital-ap">
              <div class="vital-icon">
                <i class="fad fa-hand-holding-magic fa-lg"></i>
              </div>
              <div class="vital-info">
                <span class="vital-label">AP</span>
                <span class="vital-value large">
                  {{ (typeof user.stats?.ap === 'object' ? user.stats?.ap?.total : user.stats?.ap) || 0 }}
                </span>
              </div>
            </div>
          </div>

          <!-- Stacked Accordions for Stats -->
          <ion-accordion-group class="stats-accordions">
            <ion-accordion
              v-for="(area, category) in areas"
              :key="category"
              :value="category"
            >
              <ion-item
                slot="header"
                class="stat-header"
              >
                <i
                  slot="start"
                  class="fad fa-lg stat-icon"
                  :class="getAreaFaIcon(category)"
                  :style="{ color: `var(--ion-color-${area.color})` }"
                ></i>
                <ion-label :color="area.color">
                  <strong class="capitalize">{{ category }}</strong>
                </ion-label>
                <ion-note
                  slot="end"
                  :color="area.color"
                >
                  {{ getAreaTotal(area, user.stats) }}
                </ion-note>
              </ion-item>
              <ion-list
                slot="content"
                class="stat-list"
              >
                <ion-item
                  v-for="(desc, stat) in area.stats"
                  :key="stat"
                  lines="none"
                  class="stat-item"
                >
                  <ion-label>
                    <h3
                      class="capitalize"
                      :style="{ color: `var(--ion-color-${area.color})` }"
                    >{{ stat }}</h3>
                    <p class="stat-desc">{{ desc }}</p>
                  </ion-label>
                  <ion-badge
                    slot="end"
                    :color="area.color"
                    class="stat-badge"
                  >
                    {{ user.stats[stat] || 0 }}
                  </ion-badge>
                </ion-item>
              </ion-list>
            </ion-accordion>
          </ion-accordion-group>
        </ion-card-content>
      </ion-card>
    </ion-content>
  </ion-page>
</template>

<script src="./UserProfile.ts" />
<style lang="scss" src="./_UserProfile.scss" scoped />

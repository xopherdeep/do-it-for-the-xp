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
          <xp-app-row
            v-for="row in group.rows"
            :key="row.id"
            class="power-row"
            :class="{ 'is-locked': row.locked, 'is-open': openId === row.id }"
            :data-ability-id="row.id"
            :title="row.name"
            :subtitle="row.description"
            :icon="row.icon"
            :chevron="false"
            :active="openId === row.id"
            @click="toggleOpen(row.id)"
          >
            <template #chips>
              <div v-if="row.needed > 0" class="power-ap">
                <div
                  class="power-meter"
                  role="progressbar"
                  aria-label="AP toward this Power"
                  aria-valuemin="0"
                  :aria-valuemax="row.needed"
                  :aria-valuenow="Math.min(row.earned, row.needed)"
                >
                  <div class="power-meter-fill" :style="{ width: row.meterWidth }" />
                </div>
                <span class="power-ap-text">{{ row.apText }}</span>
              </div>
              <xp-app-chip kind="tag" :value="row.typeLabel" />
              <xp-app-chip kind="mp" :value="row.mpCost" />
              <xp-app-chip kind="tag" :value="row.frequencyLabel" />
              <xp-app-chip v-if="row.timerLabel" kind="tag" :value="row.timerLabel" />
              <p v-if="row.stateLine" class="power-state">{{ row.stateLine }}</p>
            </template>
            <template #trailing>
              <button
                type="button"
                class="xp-app-btn cast-btn"
                :disabled="!row.canCast"
                :aria-label="`Cast ${row.name}`"
                @click="cast(row.id)"
              >
                Cast
              </button>
            </template>
          </xp-app-row>
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

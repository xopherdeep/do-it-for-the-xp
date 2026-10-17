<template>
  <ion-page :class="[$options.name, 'xp-settings-page']">
    <ion-header :translucent="true">
      <ion-toolbar class="rpg-box">
        <ion-title> Settings </ion-title>
        <ion-buttons slot="start">
          <ion-menu-button
            @click="$fx.ui[$fx.theme.ui].select.play()"
          ></ion-menu-button>
          <ion-icon
            :ios="pizzaOutline"
            :md="pizzaSharp"
            class="fa-2x ml-2"
          />
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content
      :fullscreen="true"
      class="rpg-box bg-slide ion-padding"
    >
      <!-- One panel for each question: who plays, how the game runs, what this phone does, the account -->
      <ion-card v-for="section in sections" :key="section.id" class="settings-section" :data-section="section.id">
        <ion-list>
          <ion-item-group>
            <ion-item-divider>
              <ion-label>{{ section.title }}</ion-label>
            </ion-item-divider>
            <ion-item
              v-for="item in section.items"
              :key="item.id"
              button
              detail
              lines="full"
              :router-link="item.route"
              class="settings-row"
              :class="{ 'settings-row--soon': item.soon }"
              :data-test="`settings-${item.id}`"
            >
              <ion-img slot="start" class="settings-row__icon" :src="item.icon" alt="" />
              <ion-label class="ion-text-wrap">
                <h2>{{ item.title }}</h2>
                <p>{{ item.description }}</p>
              </ion-label>
              <ion-badge v-if="item.soon" slot="end" color="medium" class="soon-badge">Soon</ion-badge>
            </ion-item>
          </ion-item-group>
        </ion-list>
      </ion-card>

      <!-- XP Pro closes the page, full width -->
      <router-link :to="proItem.route" class="settings-pro" :data-test="`settings-${proItem.id}`">
        <span class="settings-pro__crown" aria-hidden="true"><i class="fad fa-crown"></i></span>
        <span class="settings-pro__text">
          <strong>{{ proItem.title }}</strong>
          <small>{{ proItem.description }}</small>
        </span>
        <i class="fad fa-chevron-right settings-pro__go" aria-hidden="true"></i>
      </router-link>
    </ion-content>
  </ion-page>
</template>

<script lang="ts" src="./XpSettingsHome.ts" />
<style lang="scss" src="./_XpSettingsHome.scss" scoped />

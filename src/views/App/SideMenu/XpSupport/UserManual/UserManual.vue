<template>
  <ion-page :class="$options.name">
    <ion-header :translucent="true">
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <ion-back-button default-href="/support"></ion-back-button>
        </ion-buttons>
        <ion-title>
          User Manual
        </ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <ion-grid>
        <ion-row>
          <ion-col size="12">
            <ion-card>
              <ion-card-header>
                <ion-card-title>Getting Started</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <p>Welcome to the app! This guide will help you understand the basic features and how to use them effectively.</p>
              </ion-card-content>
            </ion-card>
          </ion-col>

          <ion-col size="12" v-for="(section, index) in sections" :key="index">
            <ion-card>
              <ion-card-header>
                <ion-card-title>{{ section.title }}</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <p>{{ section.content }}</p>
                <div v-if="section.steps && section.steps.length > 0">
                  <ion-list>
                    <ion-item v-for="(step, stepIndex) in section.steps" :key="stepIndex">
                      <ion-label>
                        <h3>Step {{ stepIndex + 1 }}</h3>
                        <p>{{ step }}</p>
                      </ion-label>
                    </ion-item>
                  </ion-list>
                </div>
                <div v-if="section.image" class="ion-text-center">
                  <img :src="section.image" :alt="section.title" class="manual-image" />
                </div>
              </ion-card-content>
            </ion-card>
          </ion-col>
        </ion-row>
      </ion-grid>
    </ion-content>
  </ion-page>
</template>

<script src="./UserManual" lang="ts" />
<style lang="scss" src="./_UserManual.scss" scoped/>

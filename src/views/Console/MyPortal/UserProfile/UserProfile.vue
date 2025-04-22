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
      <ion-grid>
        <ion-row>
          <ion-col size="12" size-md="6">
            <ion-card>
              <ion-card-header>
                <ion-avatar class="mx-auto">
                  <ion-img :src="$requireAvatar(`./${user.avatar}.svg`)" />
                </ion-avatar>
                <ion-card-title class="text-center mt-2">{{ user.name?.nick }}</ion-card-title>
                <ion-card-subtitle class="text-center">{{ user.jobClass || 'Adventurer' }}</ion-card-subtitle>
              </ion-card-header>
              <ion-card-content>
                <ion-list>
                  <ion-item>
                    <ion-label>Level</ion-label>
                    <ion-badge color="success">{{ user.stats?.level || 1 }}</ion-badge>
                  </ion-item>
                  <ion-item>
                    <ion-label>HP</ion-label>
                    <ion-note slot="end" color="danger">{{ user.stats?.hp?.now || 0 }}/{{ user.stats?.hp?.max || 0 }}</ion-note>
                  </ion-item>
                  <ion-item>
                    <ion-label>MP</ion-label>
                    <ion-note slot="end" color="tertiary">{{ user.stats?.mp?.now || 0 }}/{{ user.stats?.mp?.max || 0 }}</ion-note>
                  </ion-item>
                  <ion-item>
                    <ion-label>GP</ion-label>
                    <ion-note slot="end" color="warning">{{ user.stats?.gp?.wallet || 0 }}</ion-note>
                  </ion-item>
                </ion-list>
              </ion-card-content>
            </ion-card>
          </ion-col>
          
          <ion-col
            v-for="(area, category) in areas"
            :key="category"
            size="12"
            size-md="6"
          >
            <ion-card>
              <ion-accordion-group>
                <ion-accordion :value="category">
                  <ion-item slot="header">
                    <ion-note slot="start">
                      <ion-icon
                        size="large"
                        :color="area.color"
                        :icon="area.icon"
                      ></ion-icon>
                    </ion-note>
                    <ion-label :color="area.color">
                      <strong>{{ category }}</strong>
                    </ion-label>
                  </ion-item>
                  <ion-list slot="content">
                    <ion-item
                      v-for="(desc, stat) in area.stats"
                      :key="stat"
                    >
                      <ion-label :color="area.color">
                        <strong>
                          {{ stat }}
                        </strong>
                        <p>
                          {{ desc }}
                        </p>
                      </ion-label>
                      <ion-note
                        slot="end"
                        :color="area.color"
                      >
                        {{ user.stats[stat] || 0 }}
                      </ion-note>
                    </ion-item>
                  </ion-list>
                </ion-accordion>
              </ion-accordion-group>
            </ion-card>
          </ion-col>
        </ion-row>
      </ion-grid>
    </ion-content>
  </ion-page>
</template>

<script src="./UserProfile.ts" />
<style lang="scss" src="./_UserProfile.scss" scoped />

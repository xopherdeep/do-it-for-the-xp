<template>
  <ion-page :class="$options.name">
    <ion-toolbar class="rpg-box">
      <ion-buttons>
        <ion-back-button
          :default-href="`/my-portal/${userId}/my-profile`"
          :icon="arrowBack"
        ></ion-back-button>
        <ion-title v-if="user && user.name">
          {{ user.name.first }}
          {{ user.name.middle }}
          {{ user.name.last }}
        </ion-title>
      </ion-buttons>
    </ion-toolbar>
    <ion-content
      :fullscreen="true"
      v-if="user && user.stats"
      class="ion-padding rpb-box bg-slide"
    >
      <ion-grid>
        <ion-row>
          <ion-col
            v-for="(area, category) in areas"
            :key="category"
            size="12"
            size-md="6"
          >
            <ion-card>
              <ion-accordion-group :value="category">
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

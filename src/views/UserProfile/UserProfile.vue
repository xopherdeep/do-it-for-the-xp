<template>
  <ion-page :class="$options.name">
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button :router-link="`/my-portal/${userId}`" >
            <ion-icon :icon="arrowBack" slot="icon-only"/>
          </ion-button>
        </ion-buttons>
        <ion-title v-if="user.name"> 
          {{user.name.first}}
          {{user.name.middle}}
          {{user.name.last}}
        </ion-title>
      </ion-toolbar>
    </ion-header>
    
    <ion-content :fullscreen="true" v-if="user.stats">
      <ion-accordion-group v-for="area, category in areas" :key="category" :value="category">
          <ion-accordion :value="category">
            <ion-item slot="header">
                <ion-note slot="start" >
                  <ion-icon  size="large" :color="area.color" :icon="area.icon"></ion-icon>
                </ion-note>
                <ion-label :color="area.color">
                  <strong>{{category}}</strong>
                </ion-label>
            </ion-item>
            <ion-list slot="content">
              <ion-item v-for="desc, stat in area.stats" :key="stat">
                <ion-label :color="area.color">
                  <strong>
                    {{stat}}
                  </strong>
                </ion-label>
                <ion-note slot="end" :color="area.color">
                  <strong>
                  {{desc}} 
                  --
                    {{user.stats[stat]}}
                  </strong>
                </ion-note>
              </ion-item>
            </ion-list>
          </ion-accordion>
      </ion-accordion-group>
    </ion-content>
  </ion-page>
</template>

<script src="./UserProfile.js" />
<style lang="scss" src="./_UserProfile.scss" scoped/>
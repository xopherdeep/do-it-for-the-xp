<template>
  <ion-page :class="$options.name">
    <ion-header :translucent="true">
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <ion-menu-button color="primary" @click="$fx.ui[$fx.theme.ui].select.play()"></ion-menu-button>
          <i class="fa fa-cog fa-lg" />
        </ion-buttons>
        <ion-title> 
          Settings
        </ion-title>
      </ion-toolbar>
    </ion-header>
    
    <ion-content :fullscreen="true">
      <ion-grid>
        <ion-row>
          <ion-col>
            <ion-card>
              <ion-list>
                <ion-item button :routerLink="`/xp-settings/general`" detail="true">
                  <ion-thumbnail slot="start">
                    <img :src="requireIconImg('./settings.png')"/>
                  </ion-thumbnail>
                  &nbsp;
                  General
                  <br/>
                  <small>
                    &nbsp;- Customize your family setup and general preferences from here.
                  </small>
                </ion-item>
                <ion-item button :routerLink="`/xp-settings/family`" detail="true">
                  <ion-thumbnail slot="start">
                    <img :src="requireIconImg('./team.png')"/>
                  </ion-thumbnail>
                  &nbsp;
                  Family Settings
                  &nbsp;-&nbsp;
                  <small>
                    Add kids, invite adults and manage your family settings from here.
                  </small>
                </ion-item>
                <ion-item href="chore" detail="true">
                  <ion-thumbnail slot="start">
                    <img :src="requireIconImg('./innovation.png')"/>
                  </ion-thumbnail>
                  &nbsp;
                  Chore
                  &nbsp;-&nbsp;
                  <small>
                    From photo proof to late penalty, everything to personalize your chore system
                  </small>
                </ion-item>
                <ion-item href="notifications" detail="true">
                  <ion-thumbnail slot="start">
                    <img :src="requireIconImg('./notification.png')"/>
                  </ion-thumbnail>
                  &nbsp;
                  Notifications
                  &nbsp;-&nbsp;
                  <small>
                    Setup who gets notified and when they get notified here
                  </small>
                </ion-item>
                <ion-item href="reward" detail="true">
                  <ion-thumbnail slot="start">
                    <img :src="requireIconImg('./new.png')"/>
                  </ion-thumbnail>
                  &nbsp;
                  Reward
                  &nbsp;-&nbsp;
                  <small>
                    Your Gold Point to current conversion, cast-out and reward approval can be found here
                  </small>
                </ion-item>
                <ion-item href="party" detail="true">
                  <ion-thumbnail slot="start">
                    <img :src="requireIconImg('./collaboration.png')"/>
                  </ion-thumbnail>
                  &nbsp;
                  Party
                  &nbsp;-&nbsp;
                  <small>
                    All settings pertaining to your party can be found here...
                  </small>
                </ion-item>
                <ion-item router-link="/xp-settings/sound" button detail="true">
                  <ion-thumbnail slot="start">
                    <img :src="requireIconImg('./listener.png')"/>
                  </ion-thumbnail>
                  &nbsp;
                  Sound
                  &nbsp;-&nbsp;
                  <small>
                    Adjust your sound settings here.
                  </small>
                </ion-item>
              </ion-list>
            </ion-card>
          </ion-col>
        </ion-row>
      </ion-grid>
    </ion-content>
  </ion-page>
</template>

<script src="./XpSettingsHome" />
<style lang="scss" src="./_XpSettingsHome.scss" scoped/>
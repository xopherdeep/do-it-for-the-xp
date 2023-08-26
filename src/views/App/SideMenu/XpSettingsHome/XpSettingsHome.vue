<template>
  <ion-page :class="$options.name">
    <ion-header :translucent="true">
      <ion-toolbar class="rpg-box">
        <ion-title> Settings </ion-title>
        <ion-buttons slot="start">
          <ion-menu-button
            color="primary"
            @click="$fx.ui[$fx.theme.ui].select.play()"
          ></ion-menu-button>
        </ion-buttons>
        <ion-buttons slot="end">
          <ion-button>
            <i class="fa fa-cog fa-lg" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="rpg-box">
      <ion-list>
        <ion-item button :routerLink="`/xp-settings/general`" detail="true">
          <ion-thumbnail slot="end">
            <img :src="requireIconImg('./settings.png')" />
          </ion-thumbnail>
          <ion-label>
            <h1>General</h1>
            <p>
              Customize your family setup and general preferences from here.
            </p>
          </ion-label>
        </ion-item>
        <ion-item button :routerLink="`/xp-settings/family`" detail="true">
          <ion-thumbnail slot="end">
            <img :src="requireIconImg('./team.png')" />
          </ion-thumbnail>
          <ion-label>
            <h1>Family Settings</h1>
            <p>
              Add kids, invite adults and manage your family settings from here.
            </p>
          </ion-label>
        </ion-item>
        <ion-item href="chore" detail="true">
          <ion-thumbnail slot="end">
            <img :src="requireIconImg('./innovation.png')" />
          </ion-thumbnail>
          <ion-label>
            <h1>Chore</h1>
            <p>
              From photo proof to late penalty, everything to personalize your
              chore system
            </p>
          </ion-label>
        </ion-item>
        <ion-item href="notifications" detail="true">
          <ion-thumbnail slot="end">
            <img :src="requireIconImg('./notification.png')" />
          </ion-thumbnail>
          <ion-label>
            <h1>Notifications</h1>
            <p>Setup who gets notified and when they get notified here</p>
          </ion-label>
        </ion-item>
        <ion-item href="reward" detail="true">
          <ion-thumbnail slot="end">
            <img :src="requireIconImg('./new.png')" />
          </ion-thumbnail>
          <ion-label>
            <h1>Reward</h1>
            <p>
              Your Gold Point to current conversion, cast-out and reward
              approval can be found here
            </p>
          </ion-label>
        </ion-item>
        <ion-item href="party" detail="true">
          <ion-thumbnail slot="end">
            <img :src="requireIconImg('./collaboration.png')" />
          </ion-thumbnail>
          <ion-label>
            <h1>Party</h1>
            <p>All settings pertaining to your party can be found here...</p>
          </ion-label>
        </ion-item>
        <ion-item router-link="/xp-settings/sound" button detail="true">
          <ion-thumbnail slot="end">
            <img :src="requireIconImg('./listener.png')" />
          </ion-thumbnail>
          <ion-label>
            <h1>Sound</h1>
            <p>Adjust your sound settings here.</p>
          </ion-label>
        </ion-item>
      </ion-list>
    </ion-content>
  </ion-page>
</template>

<script src="./XpSettingsHome" />
<style lang="scss" src="./_XpSettingsHome.scss" scoped />

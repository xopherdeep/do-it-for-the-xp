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
        <!-- <ion-buttons slot="start">
          <ion-button>
            <i class="fa fa-cog fa-lg" />
          </ion-button>
        </ion-buttons> -->
      </ion-toolbar>
    </ion-header>
    <ion-content
      :fullscreen="true"
      class="rpg-box bg-slide"
    >
      <ion-card class="md:max-w-[80%] max-w-[95%]">
        <ion-list>
          <ion-item
            button
            :routerLink="`/xp-settings/general`"
            detail="true"
          >
            <ion-thumbnail slot="start">
              <ion-img :src="requireIconImg('./settings.png')" />
            </ion-thumbnail>
            <ion-label>
              <h1>General</h1>
              <p>
                Customize your family setup and general preferences from here.
              </p>
            </ion-label>
          </ion-item>
          <ion-item
            button
            :routerLink="`/xp-settings/family`"
            detail="true"
            class="flex flex-row gap-4 justify-between"
          >
            <ion-thumbnail slot="start">
              <ion-img :src="requireIconImg('./team.png')" />
            </ion-thumbnail>
            <ion-divider/>
            <ion-label >
              <h1>Family Settings</h1>
              <p>
                Add kids, invite adults and manage your family settings from here.
              </p>
            </ion-label>
          </ion-item>
          <ion-item
            button
            :routerLink="`/xp-settings/chore`"
            detail="true"
          >
            <ion-thumbnail slot="start">
              <ion-img :src="requireIconImg('./innovation.png')" />
            </ion-thumbnail>
            <ion-label>
              <h1>Chore</h1>
              <p>
                From photo proof to late penalty, everything to personalize your
                chore system
              </p>
            </ion-label>
          </ion-item>
          <ion-item
            button
            :routerLink="`/xp-settings/notifications`"
            detail="true"
          >
            <ion-thumbnail slot="start">
              <ion-img :src="requireIconImg('./notification.png')" />
            </ion-thumbnail>
            <ion-label>
              <h1>Notifications</h1>
              <p>Setup who gets notified and when they get notified here</p>
            </ion-label>
          </ion-item>
          <ion-item
            button
            :routerLink="`/xp-settings/reward`"
            detail="true"
          >
            <ion-thumbnail slot="start">
              <ion-img :src="requireIconImg('./new.png')" />
            </ion-thumbnail>
            <ion-label>
              <h1>Reward</h1>
              <p>
                Your Gold Point to current conversion, cast-out and reward
                approval can be found here
              </p>
            </ion-label>
          </ion-item>
          <ion-item
            button
            :routerLink="`/xp-settings/party`"
            detail="true"
          >
            <ion-thumbnail slot="start">
              <ion-img :src="requireIconImg('./collaboration.png')" />
            </ion-thumbnail>
            <ion-label>
              <h1>Party</h1>
              <p>All settings pertaining to your party can be found here...</p>
            </ion-label>
          </ion-item>
          <ion-item
            router-link="/xp-settings/sound"
            button
            detail="true"
          >
            <ion-thumbnail slot="start">
              <ion-img :src="requireIconImg('./listener.png')" />
            </ion-thumbnail>
            <ion-label>
              <h1>Sound</h1>
              <p>Adjust your sound settings here.</p>
            </ion-label>
          </ion-item>
          <ion-item
            button
            :routerLink="`/xp-settings/theme`"
            detail="true"
          >
            <ion-thumbnail slot="start">
              <ion-img :src="requireIconImg('./settings.png')" />
            </ion-thumbnail>
            <ion-label>
              <h1>Theme</h1>
              <p>Customize app appearance, UI style, and game theme</p>
            </ion-label>
          </ion-item>
        </ion-list>
      </ion-card>
    </ion-content>
  </ion-page>
</template>

<script src="./XpSettingsHome" />
<style lang="scss" src="./_XpSettingsHome.scss" scoped />

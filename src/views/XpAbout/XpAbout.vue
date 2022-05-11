<template>
  <ion-page>
    <ion-content>
      <swiper pager="true">
        <swiper-slide>
          <h1>Welcome to XP!</h1>
          <img :src="requireImg('./mobile-game.svg')"/>
          <ion-text>
            Hi! We hope you find that our <b>XP</b> app helps making doing
            chores into the most fun you've ever had! This is what a chore app
            should be like for both Parent and Child.
          </ion-text>
        </swiper-slide>
        <swiper-slide>
          <h1>Do it for the <b>XP</b></h1>
          <img :src="requireImg('./level.svg')"/>
          <ion-text>
            As in any chore app you'll see, Points are reward As chores are
            completed. In <b>XP</b> , however, you are rewarded: AP, GP, and XP!
          </ion-text>
        </swiper-slide>
        <swiper-slide>
          <h1>Gain Levels</h1>
          <img :src="requireImg('./024-level.svg')"/>
          <ion-text>
            Raise your level as you continue your quest with XP. The more you
            use XP, the more abilities you'll unlock and rewards you will cash
            out.

          </ion-text>

          <ion-button router-link="/switch-profile/"> Start XP </ion-button>
        </swiper-slide>
      </swiper>
    </ion-content>
  </ion-page>
</template>

<script src="./XpAbout.js" />
<style lang="scss" src="./_XpAbout.scss" scoped />

<template>
<ion-page>
  <ion-content>
<ion-slides pager="true" :options="slideOpts">
    <ion-slide>
      <ion-img :src="requireImg('./mobile-game.svg')"></ion-img>
      <h1> Welcome!</h1>
      <ion-text>
       Our <b>XP</b> app is the practical use of what 
        a Chore app should really be like for both Parent and Child.
      </ion-text>
    </ion-slide>
    <ion-slide>
      <ion-img :src="requireImg('./level.svg')"></ion-img>
      <h1> Do it for the <b>XP</b> </h1>
      <ion-text>
        As in any chore app you'll see, Points are reward As chores are completed.
        In <b>XP</b> , however, you are rewarded: AP, GP, and XP!
      </ion-text>

    </ion-slide>
    <ion-slide>
      <ion-img :src="requireImg('./024-level.svg')"></ion-img>
      <h1>Gain Levels</h1>
      <ion-text>
        Raise your level as you continue your quest with XP.
        The more you use XP, the more abilities you'll unlock and rewards you will cash out.
      </ion-text>
        <ion-button router-link="/switch-profile/">
          Start XP
        </ion-button>
    </ion-slide>
  </ion-slides>

  </ion-content>
</ion-page>
</template>

<script src="./XpAbout.js" />
<style lang="scss" src="./_XpAbout.scss" scoped/>
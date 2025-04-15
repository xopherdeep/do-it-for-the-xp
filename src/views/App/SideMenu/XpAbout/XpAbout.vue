<template>
  <ion-page>
    <ion-content>
      <swiper pager="true">
        <swiper-slide>
          <h1>Welcome to XP!</h1>
          <ion-img :src="$requireIcon('./mobile-game.svg')" />
          <ion-text>
            Welcome to <b>XP</b>! Your life is an adventure, and this app helps you track your progress, manage your tasks (we call them quests!), and reward yourself along the way. Get ready for a fun and fulfilling journey!
          </ion-text>
        </swiper-slide>
        <swiper-slide>
          <h1>Turn Tasks into Quests</h1>
          <ion-img :src="$requireIcon('./level.svg')" />
          <ion-text>
            XP transforms everyday chores and goals into exciting quests. We've blended the engaging power of gaming with practical task management to create an entertaining platform for your life's adventure. Do it for the <b>XP</b>!
          </ion-text>
        </swiper-slide>
        <swiper-slide>
          <h1>Earn Rewards & Gain Levels</h1>
          <ion-img :src="$requireIcon('./024-level.svg')" />
          <ion-text>
            Completing quests earns you different kinds of points: AP (Ability Points), GP (Gold Points), and XP (Experience Points)! Use AP to unlock new features, spend GP on real-world rewards you define, and gain XP to level up your character. The more you use the app, the more powerful and rewarding your journey becomes!
          </ion-text>
        </swiper-slide>
      </swiper>
    </ion-content>
  </ion-page>
</template>

<script src="./XpAbout" />
<style lang="scss" src="./_XpAbout.scss" scoped />

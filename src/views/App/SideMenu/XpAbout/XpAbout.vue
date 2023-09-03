<template>
  <ion-page>
    <ion-content>
      <swiper pager="true">
        <swiper-slide>
          <h1>Welcome to XP!</h1>
          <ion-img :src="$requireIcon('./mobile-game.svg')" />
          <ion-text>
            Hello, and welcome to the World of <b>XP</b>!
            You have been summoned to embark on a fun and fulfilling jouney.
          </ion-text>
        </swiper-slide>
        <swiper-slide>
          <h1>Do it for the <b>XP</b></h1>
          <ion-img :src="$requireIcon('./level.svg')" />
          <ion-text>
            We've combined the inticing power of gaming with the mezmerizing
            functionality of a phone app to bring you a most entertaining
            platform to manage and reward quests throughout your adventure.
          </ion-text>
        </swiper-slide>
        <swiper-slide>
          <h1>Gain Levels</h1>
          <ion-img :src="$requireIcon('./024-level.svg')" />
          <ion-text>
            As in any chore app you'll see, Points are reward As chores are
            completed. In <b>XP</b> , however, you are rewarded: AP, GP, and XP!
            Raise your level as you continue your quest with XP. The more you
            use XP, the more abilities you'll unlock and rewards you will cash
            out.


          </ion-text>
          <ion-card>
            <ion-menu-button>
              Open Menu

            </ion-menu-button>
          </ion-card>
        </swiper-slide>
      </swiper>
    </ion-content>
  </ion-page>
</template>

<script src="./XpAbout" />
<style lang="scss" src="./_XpAbout.scss" scoped />

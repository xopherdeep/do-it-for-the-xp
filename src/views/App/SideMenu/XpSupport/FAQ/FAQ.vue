<template>
  <ion-page :class="$options.name">
    <ion-header :translucent="true">
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <ion-back-button default-href="/support"></ion-back-button>
        </ion-buttons>
        <ion-title>
          Frequently Asked Questions
        </ion-title>
      </ion-toolbar>
    </ion-header>


    <ion-content  class="bg-slide flex flex-row items-center justify-center h-full w-full p-10">
      <ion-card class="max-w-2xl w-fit self-center">
        <ion-grid>
          <ion-row>
            <ion-col size="12">
              <ion-accordion-group>
                <ion-accordion
                  v-for="(faq, index) in faqs"
                  :key="index"
                  :value="index.toString()"
                  class="rpg-box"
                >
                  <ion-item
                    slot="header"
                    class="ion-no-padding"
                  >
                    <ion-label>{{ faq.question }}</ion-label>
                  </ion-item>
                  <div
                    slot="content"
                    class="ion-padding"
                  >
                    <p>{{ faq.answer }}</p>
                  </div>
                </ion-accordion>
              </ion-accordion-group>
            </ion-col>
          </ion-row>
        </ion-grid>
      </ion-card>
    </ion-content>
  </ion-page>
</template>

<script src="./FAQ.ts" lang="ts"></script>
<style lang="scss" src="./_FAQ.scss" scoped></style>

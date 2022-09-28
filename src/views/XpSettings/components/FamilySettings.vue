<template>
  <ion-page :class="$options.name">
    <ion-header :translucent="true">
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <ion-back-button 
            :default-href="`/xp-settings/`" 
          ></ion-back-button>
        </ion-buttons>
        <ion-title> 
          Family Settings
        </ion-title>
      </ion-toolbar>
    </ion-header>
    
    <ion-content :fullscreen="true">
      <ion-grid>
        <ion-row>
          <ion-col>
            <ion-card>
              <ion-card-title>
                Your Family
              </ion-card-title>
              <ion-card-header>
                <h1>

                McJudyPollard
                </h1>

              </ion-card-header>
            </ion-card>
            <ion-item>
              <ion-label>
                Lock My Family Setup
                <p>
                  Prevent making changes to the family
                </p>
              </ion-label>
              <ion-toggle
                @ionChange="toggleFamily"
              >
              </ion-toggle>
            </ion-item>
          </ion-col>
        </ion-row>
      </ion-grid>
      <ion-item-group>
        <ion-item-divider>
          <ion-label>Adults</ion-label>
          <ion-button slot="end" v-if="!lockFamily" id="add-adult">
            Add Adult
          </ion-button>
        </ion-item-divider>

        <ion-item>
          <ion-label>Angola</ion-label>
        </ion-item>
        <ion-item>
          <ion-label>Argentina</ion-label>
        </ion-item>
        <ion-item lines="none">
          <ion-label>Armenia</ion-label>
        </ion-item>
      </ion-item-group>

      <ion-item-group>
        <ion-item-divider>
          <ion-label>Kids</ion-label>
          <ion-button slot="end" v-if="!lockFamily">
            Add Kid 
          </ion-button>
        </ion-item-divider>

        <ion-item>
          <ion-label>Bangladesh</ion-label>
        </ion-item>
        <ion-item>
          <ion-label>Belarus</ion-label>
        </ion-item>
        <ion-item lines="none">
          <ion-label>Belgium</ion-label>
        </ion-item>
      </ion-item-group>
    </ion-content>
    <ion-modal ref="modal" trigger="add-adult" >
      <ion-header>
        <ion-toolbar>
          <ion-buttons slot="start">
            <ion-button @click="cancel()">Cancel</ion-button>
          </ion-buttons>
          <ion-title>Welcome</ion-title>
          <ion-buttons slot="end">
            <ion-button :strong="true" @click="confirm()">Confirm</ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content class="ion-padding">
        <ion-item>
          <ion-label position="stacked">Enter your name</ion-label>
          <ion-input ref="input" type="text" placeholder="Your name"></ion-input>
        </ion-item>
      </ion-content>
    </ion-modal>
  </ion-page>
</template>

<script lang="javascript">
  import { defineComponent, ref } from 'vue'

  import ionic from "@/assets/js/mixins/ionic";

  import {
    arrowBack
  } from "ionicons/icons"

  export default defineComponent({
    data() {
      return {
        lockFamily: false 
      }
    },
    methods: {
      toggleFamily(){
        this.lockFamily = !this.lockFamily
      }
    },
    mixins: [ionic],
    setup() {
      const toppings = [];
      // code
      return {
        toppings,
        arrowBack
      }
    },
  })
</script>

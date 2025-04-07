<template>
  <ion-page :class="$options.name">
    <ion-header :translucent="true">
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <ion-back-button default-href="/support"></ion-back-button>
        </ion-buttons>
        <ion-title>
          Feature Requests
        </ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <ion-grid>
        <ion-row>
          <ion-col size="12">
            <ion-card>
              <ion-card-header>
                <ion-card-title>Submit a Feature Request</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <p>Have an idea to make the app better? We'd love to hear it! Fill out the form below to submit your feature request.</p>
                
                <form @submit.prevent="submitFeatureRequest">
                  <ion-item>
                    <ion-label position="floating">Title</ion-label>
                    <ion-input v-model="featureRequest.title" required></ion-input>
                  </ion-item>
                  
                  <ion-item>
                    <ion-label position="floating">Category</ion-label>
                    <ion-select v-model="featureRequest.category" interface="popover">
                      <ion-select-option value="gameplay">Gameplay</ion-select-option>
                      <ion-select-option value="ui">User Interface</ion-select-option>
                      <ion-select-option value="characters">Characters</ion-select-option>
                      <ion-select-option value="items">Items & Equipment</ion-select-option>
                      <ion-select-option value="other">Other</ion-select-option>
                    </ion-select>
                  </ion-item>
                  
                  <ion-item>
                    <ion-label position="floating">Description</ion-label>
                    <ion-textarea 
                      v-model="featureRequest.description" 
                      rows="6" 
                      placeholder="Please describe your feature idea in detail..."
                      required
                    ></ion-textarea>
                  </ion-item>
                  
                  <ion-item>
                    <ion-label position="floating">Why is this feature important?</ion-label>
                    <ion-textarea 
                      v-model="featureRequest.importance" 
                      rows="3" 
                      placeholder="Explain why this feature would be valuable..."
                    ></ion-textarea>
                  </ion-item>
                  
                  <div class="ion-padding-top">
                    <ion-button type="submit" expand="block">Submit Request</ion-button>
                  </div>
                </form>
              </ion-card-content>
            </ion-card>
          </ion-col>
          
          <ion-col size="12">
            <ion-card>
              <ion-card-header>
                <ion-card-title>Popular Feature Requests</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <ion-list>
                  <ion-item v-for="(feature, index) in popularFeatures" :key="index">
                    <ion-label>
                      <h2>{{ feature.title }}</h2>
                      <p>{{ feature.description }}</p>
                    </ion-label>
                    <div slot="end" class="vote-container">
                      <ion-button fill="clear" @click="voteForFeature(feature.id)">
                        <i class="fad fa-thumbs-up"></i>
                      </ion-button>
                      <span>{{ feature.votes }}</span>
                    </div>
                  </ion-item>
                </ion-list>
              </ion-card-content>
            </ion-card>
          </ion-col>
        </ion-row>
      </ion-grid>
      
      <ion-toast
        :is-open="showToast"
        :message="toastMessage"
        :duration="3000"
        @didDismiss="showToast = false"
      ></ion-toast>
    </ion-content>
  </ion-page>
</template>

<script src="./FeatureRequest.ts" lang="ts"></script>
<style lang="scss" src="./_FeatureRequest.scss" scoped></style>

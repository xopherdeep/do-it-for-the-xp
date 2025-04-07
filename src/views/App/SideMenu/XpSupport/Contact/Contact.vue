<template>
  <ion-page :class="$options.name">
    <ion-header :translucent="true">
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <ion-back-button default-href="/support"></ion-back-button>
        </ion-buttons>
        <ion-title>
          Contact Developers
        </ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <ion-grid>
        <ion-row>
          <ion-col size="12" size-md="6">
            <ion-card>
              <ion-card-header>
                <ion-card-title>Send us a message</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <form @submit.prevent="submitContactForm">
                  <ion-item>
                    <ion-label position="floating">Name</ion-label>
                    <ion-input v-model="contactForm.name" required></ion-input>
                  </ion-item>
                  
                  <ion-item>
                    <ion-label position="floating">Email</ion-label>
                    <ion-input type="email" v-model="contactForm.email" required></ion-input>
                  </ion-item>
                  
                  <ion-item>
                    <ion-label position="floating">Subject</ion-label>
                    <ion-select v-model="contactForm.subject" interface="popover">
                      <ion-select-option value="question">Question</ion-select-option>
                      <ion-select-option value="bug">Bug Report</ion-select-option>
                      <ion-select-option value="suggestion">Suggestion</ion-select-option>
                      <ion-select-option value="other">Other</ion-select-option>
                    </ion-select>
                  </ion-item>
                  
                  <ion-item>
                    <ion-label position="floating">Message</ion-label>
                    <ion-textarea 
                      v-model="contactForm.message" 
                      rows="6" 
                      placeholder="Type your message here..."
                      required
                    ></ion-textarea>
                  </ion-item>
                  
                  <div class="ion-padding-top">
                    <ion-button type="submit" expand="block">Send Message</ion-button>
                  </div>
                </form>
              </ion-card-content>
            </ion-card>
          </ion-col>
          
          <ion-col size="12" size-md="6">
            <ion-card>
              <ion-card-header>
                <ion-card-title>Contact Information</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <ion-list>
                  <ion-item>
                    <ion-icon name="mail-outline" slot="start"></ion-icon>
                    <ion-label>
                      <h2>Email</h2>
                      <p>support@xpgame.com</p>
                    </ion-label>
                  </ion-item>
                  
                  <ion-item>
                    <ion-icon name="call-outline" slot="start"></ion-icon>
                    <ion-label>
                      <h2>Phone</h2>
                      <p>(555) 123-4567</p>
                    </ion-label>
                  </ion-item>
                  
                  <ion-item>
                    <ion-icon name="logo-twitter" slot="start"></ion-icon>
                    <ion-label>
                      <h2>Twitter</h2>
                      <p>@XPGameOfficial</p>
                    </ion-label>
                  </ion-item>
                  
                  <ion-item>
                    <ion-icon name="logo-discord" slot="start"></ion-icon>
                    <ion-label>
                      <h2>Discord</h2>
                      <p>Join our community server</p>
                    </ion-label>
                    <ion-button slot="end" fill="clear" href="https://discord.gg/xpgame" target="_blank">
                      Join
                    </ion-button>
                  </ion-item>
                </ion-list>
                
                <div class="support-hours">
                  <h3>Support Hours</h3>
                  <p>Monday - Friday: 9:00 AM - 6:00 PM EST</p>
                  <p>Saturday: 10:00 AM - 2:00 PM EST</p>
                  <p>Sunday: Closed</p>
                </div>
              </ion-card-content>
            </ion-card>
            
            <ion-card>
              <ion-card-header>
                <ion-card-title>FAQ</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <p>Before contacting us, you might want to check our <a @click="navigateToFAQ">Frequently Asked Questions</a> page to see if your question has already been answered.</p>
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

<script src="./Contact.ts" lang="ts"></script>
<style lang="scss" src="./_Contact.scss" scoped></style>

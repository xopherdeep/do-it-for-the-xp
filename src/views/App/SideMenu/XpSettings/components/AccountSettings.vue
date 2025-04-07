<template>
  <ion-page :class="$options.name">
    <ion-header :translucent="true">
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <ion-back-button :default-href="`/xp-settings/`"></ion-back-button>
        </ion-buttons>
        <ion-title>Account Settings</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="rpg-box">
      <ion-card class="settings-card">
        <ion-card-header>
          <ion-card-title>Account Information</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-item>
            <ion-label position="stacked">Email Address</ion-label>
            <ion-input v-model="accountInfo.email" type="email"></ion-input>
          </ion-item>
          <ion-item>
            <ion-label position="stacked">Username</ion-label>
            <ion-input v-model="accountInfo.username" type="text"></ion-input>
          </ion-item>
          <ion-button expand="block" class="ion-margin-top" @click="saveAccountInfo">
            Save Changes
          </ion-button>
        </ion-card-content>
      </ion-card>

      <ion-card class="settings-card">
        <ion-card-header>
          <ion-card-title>Change Password</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-item>
            <ion-label position="stacked">Current Password</ion-label>
            <ion-input v-model="passwordChange.current" type="password"></ion-input>
          </ion-item>
          <ion-item>
            <ion-label position="stacked">New Password</ion-label>
            <ion-input v-model="passwordChange.new" type="password"></ion-input>
          </ion-item>
          <ion-item>
            <ion-label position="stacked">Confirm New Password</ion-label>
            <ion-input v-model="passwordChange.confirm" type="password"></ion-input>
          </ion-item>
          <ion-button expand="block" class="ion-margin-top" @click="changePassword">
            Update Password
          </ion-button>
        </ion-card-content>
      </ion-card>

      <ion-card class="settings-card">
        <ion-card-header>
          <ion-card-title>Subscription</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-item lines="none">
            <ion-label>
              <h2>Current Plan: {{ subscriptionInfo.plan }}</h2>
              <p>Renews on: {{ subscriptionInfo.renewalDate }}</p>
            </ion-label>
            <ion-badge color="warning" slot="end" class="premium-badge">
              <i class="fa fa-crown"></i> Premium
            </ion-badge>
          </ion-item>
          <ion-button expand="block" color="primary" @click="managePlan">
            Manage Subscription
          </ion-button>
        </ion-card-content>
      </ion-card>

      <ion-card class="settings-card">
        <ion-card-header>
          <ion-card-title>Linked Accounts</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-item>
            <ion-icon name="logo-google" slot="start"></ion-icon>
            <ion-label>
              <h2>Google</h2>
              <p v-if="linkedAccounts.google">Connected</p>
              <p v-else>Not connected</p>
            </ion-label>
            <ion-button slot="end" fill="outline" size="small" @click="toggleAccountLink('google')">
              {{ linkedAccounts.google ? 'Disconnect' : 'Connect' }}
            </ion-button>
          </ion-item>
          <ion-item>
            <ion-icon name="logo-apple" slot="start"></ion-icon>
            <ion-label>
              <h2>Apple</h2>
              <p v-if="linkedAccounts.apple">Connected</p>
              <p v-else>Not connected</p>
            </ion-label>
            <ion-button slot="end" fill="outline" size="small" @click="toggleAccountLink('apple')">
              {{ linkedAccounts.apple ? 'Disconnect' : 'Connect' }}
            </ion-button>
          </ion-item>
        </ion-card-content>
      </ion-card>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import ionic from "@/mixins/ionic";
import { 
  IonPage, 
  IonHeader, 
  IonToolbar, 
  IonButtons, 
  IonBackButton,
  IonTitle, 
  IonContent, 
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
  IonIcon,
  IonBadge,
  toastController,
  alertController
} from '@ionic/vue';

export default defineComponent({
  name: 'account-settings',
  components: {
    IonPage,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonItem,
    IonLabel,
    IonInput,
    IonButton,
    IonIcon,
    IonBadge
  },
  mixins: [ionic],
  methods: {
    async saveAccountInfo() {
      // Validate email
      if (!this.validateEmail(this.accountInfo.email)) {
        this.showToast('Please enter a valid email address', 'danger');
        return;
      }
      
      // In a real app, this would save to a database
      this.showToast('Account information updated successfully');
    },
    
    validateEmail(email: string) {
      const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return re.test(email);
    },
    
    async changePassword() {
      // Simple validation
      if (!this.passwordChange.current || !this.passwordChange.new || !this.passwordChange.confirm) {
        this.showToast('Please fill in all password fields', 'danger');
        return;
      }
      
      if (this.passwordChange.new !== this.passwordChange.confirm) {
        this.showToast('New passwords do not match', 'danger');
        return;
      }
      
      if (this.passwordChange.new.length < 8) {
        this.showToast('Password must be at least 8 characters', 'danger');
        return;
      }
      
      // In a real app, this would verify the current password and update to the new one
      this.showToast('Password updated successfully');
      this.passwordChange.current = '';
      this.passwordChange.new = '';
      this.passwordChange.confirm = '';
    },
    
    async managePlan() {
      const alert = await alertController.create({
        header: 'Manage Subscription',
        message: 'You will be redirected to the subscription management page.',
        buttons: [
          {
            text: 'Cancel',
            role: 'cancel'
          },
          {
            text: 'Continue',
            handler: () => {
              // In a real app, this would redirect to a subscription management page
              this.showToast('Subscription management page would open here');
            }
          }
        ]
      });
      await alert.present();
    },
    
    async toggleAccountLink(account: string) {
      if (this.linkedAccounts[account]) {
        // Disconnect account
        this.linkedAccounts[account] = false;
        this.showToast(`${account.charAt(0).toUpperCase() + account.slice(1)} account disconnected`);
      } else {
        // Connect account - in a real app this would open OAuth flow
        this.linkedAccounts[account] = true;
        this.showToast(`${account.charAt(0).toUpperCase() + account.slice(1)} account connected`);
      }
    },
    
    async showToast(message: string, color: string = 'success') {
      const toast = await toastController.create({
        message,
        duration: 2000,
        position: 'bottom',
        color
      });
      await toast.present();
    }
  },
  setup() {
    const accountInfo = ref({
      email: 'user@example.com',
      username: 'XpHero123'
    });
    
    const passwordChange = ref({
      current: '',
      new: '',
      confirm: ''
    });
    
    const subscriptionInfo = ref({
      plan: 'Family Premium',
      renewalDate: 'May 15, 2025'
    });
    
    const linkedAccounts = ref({
      google: true,
      apple: false
    });
    
    return {
      accountInfo,
      passwordChange,
      subscriptionInfo,
      linkedAccounts
    };
  }
});
</script>

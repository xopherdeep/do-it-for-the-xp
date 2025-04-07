<template>
  <ion-page class="xp-membership">
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-menu-button></ion-menu-button>
        </ion-buttons>
        <ion-title>Premium Membership</ion-title>
      </ion-toolbar>
    </ion-header>
    
    <ion-content :fullscreen="true">
      <ion-grid>
        <ion-row>
          <ion-col>
            <ion-card class="premium-card">
              <ion-card-title>
                Your Premium Plan
              </ion-card-title>
              <ion-card-header>
                <ion-text>
                  <h1>
                    {{ formatCurrency(currentPlan.price) }}
                    <ion-chip color="light">
                      Paid {{ currentPlan.interval === 'month' ? 'Monthly' : 'Annually' }}
                    </ion-chip>
                    <ion-badge color="warning">
                      Premium
                    </ion-badge>
                  </h1>
                </ion-text>
              </ion-card-header>

              <ion-card-content>
                <div class="membership-info">
                  <div class="info-item">
                    <ion-icon :icon="calendarOutline" size="small"></ion-icon>
                    <ion-text>
                      Next payment: <b>{{ nextPaymentDate }}</b>
                    </ion-text>
                  </div>
                  <div class="info-item">
                    <ion-icon :icon="starOutline" size="small"></ion-icon>
                    <ion-text>
                      Member since: <b>{{ memberSince }}</b>
                    </ion-text>
                  </div>
                  <div class="info-item">
                    <ion-icon :icon="cardOutline" size="small"></ion-icon>
                    <ion-text>
                      Payment method: <b>{{ paymentMethod.type }} ending in {{ paymentMethod.last4 }}</b>
                    </ion-text>
                  </div>
                </div>
              </ion-card-content>
            </ion-card>
          </ion-col>
        </ion-row>

        <ion-row>
          <ion-col>
            <div class="plan-selector">
              <ion-segment :value="activePlan" @ionChange="changePlan($event.detail.value)">
                <ion-segment-button value="monthly">
                  <ion-label>Monthly</ion-label>
                </ion-segment-button>
                <ion-segment-button value="annual">
                  <ion-label>Annual <ion-chip color="warning" size="small">Save 20%</ion-chip></ion-label>
                </ion-segment-button>
              </ion-segment>
            </div>
          </ion-col>
        </ion-row>

        <ion-row>
          <ion-col>
            <ion-card>
              <ion-card-title>
                Premium Benefits
              </ion-card-title>
              <ion-card-content>
                <ion-list class="benefits-list">
                  <ion-item v-for="(benefit, index) in benefits" :key="index">
                    <ion-icon :icon="checkmarkCircle" color="success" slot="start" />
                    {{ benefit }}
                  </ion-item>
                </ion-list>
                <ion-button expand="block" color="danger" class="cancel-button" @click="openCancelModal">
                  Cancel Membership 
                  <ion-icon :icon="stopCircle" slot="end" size="small" />
                </ion-button>
              </ion-card-content>
            </ion-card>
          </ion-col>
        </ion-row>
      </ion-grid>

      <!-- Animated background -->
      <div class="night">
        <div class="shooting_star" v-for="n in 20" :key="n"></div>
      </div>

      <!-- Cancel Membership Modal -->
      <ion-modal :is-open="isModalOpen" @didDismiss="closeModal">
        <ion-header>
          <ion-toolbar>
            <ion-title>Cancel Membership</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="closeModal">Close</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
          <h2>We're sorry to see you go!</h2>
          <p>Before you cancel, please consider:</p>
          <ion-list>
            <ion-item>
              <ion-icon :icon="informationCircleOutline" slot="start" color="primary"></ion-icon>
              <ion-label>You'll lose access to all premium features</ion-label>
            </ion-item>
            <ion-item>
              <ion-icon :icon="trendingUpOutline" slot="start" color="primary"></ion-icon>
              <ion-label>Your progress and achievements will be limited</ion-label>
            </ion-item>
            <ion-item>
              <ion-icon :icon="walletOutline" slot="start" color="primary"></ion-icon>
              <ion-label>Rejoining later may cost more due to price changes</ion-label>
            </ion-item>
          </ion-list>
          <ion-button expand="block" color="medium" @click="closeModal" class="ion-margin-top">
            Keep My Membership
          </ion-button>
          <ion-button expand="block" color="danger" @click="confirmCancel" class="ion-margin-top">
            Proceed with Cancellation
          </ion-button>
        </ion-content>
      </ion-modal>
    </ion-content>
  </ion-page>
</template>

<script src="./XpMembership.ts" />
<style lang="scss" src="./_XpMembership.scss" scoped/>

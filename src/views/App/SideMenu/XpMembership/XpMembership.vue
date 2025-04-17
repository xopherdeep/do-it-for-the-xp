<template>
  <ion-page class="xp-membership">
    <ion-header :translucent="true">
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <ion-menu-button color="light"></ion-menu-button>
          <ion-icon
            :ios="moonOutline"
            :md="moonSharp"
            class="fa-2x ml-2"
          />
        </ion-buttons>
        <ion-title>Adventure Pass</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content
      :fullscreen="true"
      class="bg-slide ion-padding"
    >
      <ion-grid>
        <!-- Current Status Card -->
        <ion-row>
          <ion-col>
            <ion-card class="status-card">
              <ion-card-header>
                <ion-card-title>Your Family's Adventure Status</ion-card-title>
                <ion-card-title class="ion-text-nowrap">
                  <ion-icon
                    :icon="shieldCheckmark"
                    color="success"
                    class="status-icon"
                  ></ion-icon>
                  Adventure Pass: <ion-text color="success">Active!</ion-text>
                </ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <ion-row class="flex flex-row gap-4 w-full align-middle items-center justify-between">
                  <ion-col class="info-item p-0">
                    <ion-icon
                      :icon="rocketOutline"
                      size="small"
                    ></ion-icon>
                    <ion-label>
                      Current Plan:
                      <ion-chip
                        color="primary"
                        class="plan-chip"
                      >
                        {{ currentPlan.name }}
                      </ion-chip>
                    </ion-label>
                  </ion-col>
                  <ion-col class="info-item p-0">
                    <ion-icon
                      :icon="calendarClearOutline"
                      size="small"
                    ></ion-icon>
                    <ion-label>
                      Renews: <ion-chip>
                        {{ nextPaymentDate }}
                      </ion-chip>
                    </ion-label>
                  </ion-col>
                  <ion-col class="info-item p-0">
                    <ion-icon
                      :icon="peopleOutline"
                      size="small"
                    ></ion-icon>
                    <ion-label>
                      Adventuring Since: <ion-chip>{{ memberSince }}</ion-chip>
                    </ion-label>
                  </ion-col>
                  <ion-col class="info-item p-0">
                    <ion-icon
                      :icon="cardOutline"
                      size="small"
                    ></ion-icon>
                    <ion-label>
                      Payment:
                      <ion-chip>
                        {{ paymentMethod.type }}
                        ...{{
                        paymentMethod.last4
                        }}
                      </ion-chip>
                    </ion-label>
                  </ion-col>
                </ion-row>
              </ion-card-content>
            </ion-card>
          </ion-col>
        </ion-row>

        <!-- Plan Selection -->
        <ion-row class="ion-justify-content-center ion-align-items-center">
          <ion-col size="12">
            <h2 class="section-title">Choose Your Adventure Length</h2>
          </ion-col>
          <ion-col
            size="12"
            size-md="6"
            v-for="plan in plans"
            :key="plan.id"
          >
            <ion-card
              button
              class="plan-card"
              :class="{ 'active-plan': activePlan === plan.id }"
              @click="changePlan(plan.id)"
            >
              <ion-card-header>
                <ion-badge
                  v-if="plan.id === 'annual'"
                  color="warning"
                  class="savings-badge"
                >Save {{ plan.savings }}%</ion-badge>
                <ion-card-title>{{ plan.name }}</ion-card-title>
                <ion-card-subtitle>{{ formatCurrency(plan.price) }} /
                  {{
                  plan.interval === "month" ? "month" : "year"
                  }}</ion-card-subtitle>
              </ion-card-header>
              <ion-card-content>
                <ion-radio
                  :value="plan.id"
                  :checked="activePlan === plan.id"
                  mode="md"
                ></ion-radio>
                <ion-label>{{
                  plan.id === "annual" ? "Best Value!" : "Flexible Option"
                  }}</ion-label>
              </ion-card-content>
            </ion-card>
          </ion-col>
        </ion-row>

        <!-- Benefits Card -->
        <ion-row>
          <ion-col>
            <ion-card class="benefits-card">
              <ion-card-header>
                <ion-card-title>
                  <ion-icon
                    :icon="sparklesOutline"
                    color="primary"
                  ></ion-icon>
                  Your Adventure Perks
                </ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <ion-list
                  lines="none"
                  class="benefits-list"
                >
                  <ion-item
                    v-for="(benefit, index) in benefits"
                    :key="index"
                  >
                    <ion-icon
                      :icon="checkmarkCircle"
                      color="success"
                      slot="start"
                    />
                    <ion-label>{{ benefit }}</ion-label>
                  </ion-item>
                </ion-list>
                <ion-button
                  expand="block"
                  color="danger"
                  fill="outline"
                  class="cancel-button ion-margin-top"
                  @click="openCancelModal"
                >
                  Pause Adventure Pass
                  <ion-icon
                    :icon="pauseCircleOutline"
                    slot="end"
                    size="small"
                  />
                </ion-button>
              </ion-card-content>
            </ion-card>
          </ion-col>
        </ion-row>
      </ion-grid>

      <!-- Cancel Membership Modal -->
      <ion-modal
        :is-open="isModalOpen"
        @didDismiss="closeModal"
        class="cancel-modal"
      >
        <ion-card>

          <ion-header>
            <ion-toolbar color="warning">
              <ion-title>Pause Adventure Pass?</ion-title>
              <ion-buttons slot="end">
                <ion-button
                  @click="closeModal"
                  color="dark"
                >Close</ion-button>
              </ion-buttons>
            </ion-toolbar>
          </ion-header>
          <ion-card-content class="ion-padding text-center">
            <ion-icon
              :icon="sadOutline"
              size="large"
              color="warning"
              class="modal-icon"
            ></ion-icon>
            <h2>Thinking of Pausing Your Adventure?</h2>
            <p>If you pause, your family will miss out on these perks:</p>
            <ion-list lines="none">
              <ion-item>
                <ion-icon
                  :icon="gameControllerOutline"
                  slot="start"
                  color="primary"
                ></ion-icon>
                <ion-label>Unlimited access to all quests & activities</ion-label>
              </ion-item>
              <ion-item>
                <ion-icon
                  :icon="banOutline"
                  slot="start"
                  color="primary"
                ></ion-icon>
                <ion-label>Ad-free experience for uninterrupted fun</ion-label>
              </ion-item>
              <ion-item>
                <ion-icon
                  :icon="sparklesOutline"
                  slot="start"
                  color="primary"
                ></ion-icon>
                <ion-label>Exclusive family challenges & rewards</ion-label>
              </ion-item>
              <ion-item>
                <ion-icon
                  :icon="lockClosedOutline"
                  slot="start"
                  color="primary"
                ></ion-icon>
                <ion-label>Your current price is locked in!</ion-label>
              </ion-item>
            </ion-list>
            <ion-button
              expand="block"
              color="success"
              @click="closeModal"
              class="ion-margin-top"
            >
              <ion-icon
                :icon="playCircleOutline"
                slot="start"
              ></ion-icon>
              Keep the Adventure Going!
            </ion-button>
            <ion-button
              expand="block"
              color="danger"
              fill="outline"
              @click="confirmCancel"
              class="ion-margin-top"
            >
              <ion-icon
                :icon="pauseCircleOutline"
                slot="start"
              ></ion-icon>
              Yes, Pause My Pass
            </ion-button>
          </ion-card-content>
        </ion-card>
      </ion-modal>
    </ion-content>
  </ion-page>
</template>

<script src="./XpMembership.ts"></script>
<style lang="scss" src="./_XpMembership.scss" scoped></style>

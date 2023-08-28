<template>
  <ion-page :class="$options.name">
    <ion-header>
      <ion-toolbar color="warning">
        <ion-buttons slot="start">
          <ion-back-button :default-href="`/my-portal/${userId}/home-town`"></ion-back-button>
          <!-- <ion-icon :icon="storefrontOutline" slot="icon-only" /> -->
          <i class="fa fa-piggy-bank fa-2x"></i>
        </ion-buttons>
        <ion-title>
          Gold Bank
        </ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="gold-bank" v-if="user">
      <xp-loading v-if="isLoading" />
      <ion-grid v-else>
        <ion-row>
          <ion-col size="12">
            <ion-card>
              <!-- <ion-title>Automatic Teller Machine</ion-title> -->
              <ion-card-content>
                Hello, Welcome to Gold Bank. Here you can deposit
                and withdraw your savings, or pay off your debt.
                <!-- <ion-list>
                  <ion-item lines="none">
                  </ion-item>
                  <ion-item
                    lines="none"
                    v-if="user"
                  >
                    Your savings is
                    <xp-gp :gp="user.stats.gp.savings" />

                  </ion-item>
                  <ion-item lines="none">
                    Please select a transation.
                  </ion-item>
                </ion-list>
                <ion-buttons>
                  <ion-button>
                    <i class="fad fa-wallet fa-2x"></i>
                    Withdrawl
                  </ion-button>
                  <ion-button>
                    <i class="fad fa-piggy-bank fa-2x"></i>
                    Deposit
                  </ion-button>
                </ion-buttons> -->
              </ion-card-content>
            </ion-card>

          </ion-col>

        </ion-row>
        <ion-row v-if="user">
          <ion-col size="6">
            <ion-card>
              <ion-title>
                Savings

              </ion-title>
              <ion-card-content class="ion-text-right">
                <xp-gp :gp="user.stats.gp.savings" />
              </ion-card-content>
            </ion-card>
          </ion-col>
          <ion-col size="6">
            <ion-card>
              <ion-title>
                Debt
              </ion-title>
              <ion-card-content class="ion-text-right">
                <xp-gp :gp="user.stats.gp.debt" />
              </ion-card-content>
            </ion-card>
          </ion-col>
        </ion-row>
        <ion-row>
          <ion-col size="6">
            <ion-card>
              <ion-title>
                XPC$
              </ion-title>
              <ion-card-content class="ion-text-right">
                0
              </ion-card-content>
            </ion-card>
          </ion-col>
          <ion-col size="6">
            <ion-card>
              <ion-title>
                GP to XPC$
              </ion-title>
              <ion-card-content class="ion-text-right">
                $1 = <xp-gp :gp="100" />
              </ion-card-content>
            </ion-card>
          </ion-col>
        </ion-row>
        <ion-row>
          <ion-col>
            <ion-card>

        <ion-card-header>
          <ion-card-title>
            My Wallet
          </ion-card-title>
          <!-- <ion-title>
            My Wallet
          </ion-title> -->
          <!-- <ion-chip>
            <xp-gp :gp="100" />
            (Earned)
          </ion-chip>
          -
          <ion-chip>
            (Spent)
            <xp-gp :gp="50" />
          </ion-chip>
          = -->
          <ion-card-subtitle class="ion-float-right">
            Max: {{ user.stats.gp.limit }}
          </ion-card-subtitle>
          <ion-progress-bar
            color="warning"
            :value="user.stats.gp.wallet / user.stats.gp.limit"
          >
          </ion-progress-bar>
          <ion-card-title>
            <xp-gp :gp="user.stats.gp.wallet" />
            available
            <i class="fad fa-wallet ion-float-right"></i>
          </ion-card-title>
        </ion-card-header>
            </ion-card>

          </ion-col>
        </ion-row>
      </ion-grid>
      <!-- fab placed to the bottom and start and on the bottom edge of the content overlapping footer with a list to the right -->
      <ion-fab
        vertical="bottom"
        horizontal="center"
        slot="fixed"
        @click.stop="presentActionSheet"
      >
        <ion-fab-button color="warning">
          <i class="fad fa-piggy-bank fa-2x"></i>
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  </ion-page>
</template>

<script src="./GoldBank.ts" />
<style lang="scss" src="./_GoldBank.scss" scoped />

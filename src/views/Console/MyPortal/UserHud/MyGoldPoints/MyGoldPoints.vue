<template>
  <ion-page v-if="user">
    <ion-header>
      <ion-toolbar color="warning">
        <ion-buttons slot="start">
          <ion-back-button :default-href="`/my-portal/${userId}`"></ion-back-button>
          <!-- <ion-icon
            :icon="serverOutline"
            size="large"
          /> -->
          <i class="fad fa-wallet fa-2x"></i>
        </ion-buttons>

        <ion-title> My Funds </ion-title>
      </ion-toolbar>
      <ion-item v-if="walletSegment === 'activity'">
        <ion-label>Date Range</ion-label>
        <ion-select
          @ionChange="changeDate"
          :interface-options="customAlertOptions"
          interface="alert"
          placeholder="All Time"
          :v-bind="date"
        >
          <ion-select-option value="All Time">All Time</ion-select-option>
          <ion-select-option value="today"> Today </ion-select-option>
          <ion-select-option value="yesterday"> Yesterday </ion-select-option>
          <ion-select-option value="thisWeek"> This Week </ion-select-option>
          <ion-select-option value="last7days"> Last 7 Days </ion-select-option>
          <ion-select-option value="last14days">
            Last 14 Days
          </ion-select-option>
          <ion-select-option value="olives"> Last 30 Days </ion-select-option>
          <ion-select-option value="olives"> This Month </ion-select-option>
          <ion-select-option value="olives"> Last Month </ion-select-option>
          <ion-select-option value="olives"> Last 2 Months </ion-select-option>
          <ion-select-option value="olives"> Last 3 Months </ion-select-option>
          <ion-select-option value="olives"> Last 4 Months </ion-select-option>
          <ion-select-option value="olives"> Last 6 Months </ion-select-option>
          <ion-select-option value="olives"> This Year </ion-select-option>
        </ion-select>
      </ion-item>
    </ion-header>

    <ion-content
      class="ion-padding"
      v-if="walletSegment === 'wallet'"
    >
      <ion-card color="gold">
        <ion-card-header>
          <ion-card-title>
            GP Earned
          </ion-card-title>
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
        <ion-card-content class="ion-text-right">
          <ion-list>
            <ion-item
              lines="none"
              @click="clickAddSavings"
              button
            >
              <ion-label>
                Savings:
              </ion-label>
              <xp-gp :gp="user.stats.gp.savings" />
              <i
                class="fas fa-plus ion-float-right"
                slot="end"
              ></i>
            </ion-item>
            <ion-item
              lines="none"
              button
              @click="clickPayDebt"
              :disabled="user.stats.gp.debt === 0"
            >
              <ion-label>
                Debt:
              </ion-label>
              <xp-gp :gp="user.stats.gp.debt" />
              <i
                slot="end"
                class="fas fa-minus ion-float-right"
              ></i>
            </ion-item>
          </ion-list>
        </ion-card-content>
      </ion-card>
      <ion-card>
        <ion-card-header>
          <ion-card-title>
            Transactions
          </ion-card-title>
        </ion-card-header>
        <ion-list>
          <ion-item
            button
            detail
            lines="none"
          >
            <i
              class="fad fa-file-invoice-dollar fa-2x"
              slot="start"
              button
              detail
            ></i>
            <ion-label>
              <h2>
                Pay Load / Debt
              </h2>
              <p>

              </p>

            </ion-label>
          </ion-item>
          <ion-item
            button
            detail
            lines="none"
          >
            <i
              class="fad fa-hand-holding-usd fa-2x"
              slot="start"
            ></i>
            <ion-label>
              <h2>

                Cash Out
              </h2>
              <p>

              </p>

            </ion-label>
          </ion-item>
          <ion-item
            button
            detail
            lines="none"
            @click="openSendRequest"
          >
            <i
              class="fad fa-envelope-open-dollar fa-2x"
              slot="start"
            ></i>
            <ion-label>
              <h2>
                Send / Request
              </h2>
              <p>

              </p>

            </ion-label>
          </ion-item>
        </ion-list>
      </ion-card>
    </ion-content>
    <ion-content
      class="ion-padding"
      v-if="walletSegment === 'about'"
    >
      <ion-grid>
        <ion-row>
          <ion-col>
            <ion-card>
              <ion-card-header>
                <ion-card-title>
                  About GP
                </ion-card-title>

              </ion-card-header>
              <ion-card-content>
                Gold points are the currency of Xadion.
                You'll need a wallet to use them.
                You start off with a wallet of 0 gold points, with a
                limit of 1000 gold points. Upgrade your wallet to hold
                more GP.

              </ion-card-content>
            </ion-card>

          </ion-col>
        </ion-row>
        <ion-row>
          <ion-col>
            <ion-card>
              <ion-list>
                <ion-item>
                  <ion-checkbox
                    slot="start"
                    checked
                    readonly
                  />
                  <i
                    slot="end"
                    class="fad fa-wallet ion-margin"
                  ></i>
                  <ion-label>
                    <h5>
                      Child's Wallet
                    </h5>
                    <p>
                      Maximum: <xp-gp :gp="100" />
                    </p>
                  </ion-label>
                </ion-item>
                <ion-item>
                  <ion-checkbox
                    slot="start"
                    disabled
                  />
                  <i
                    slot="end"
                    class="fad fa-wallet fa-2x ion-margin"
                  ></i>
                  <ion-label>
                    <h4>
                      Adult's Wallet
                    </h4>
                    <p>
                      Maximum: <xp-gp :gp="1000" />
                    </p>
                  </ion-label>
                </ion-item>
                <ion-item>
                  <ion-checkbox
                    slot="start"
                    disabled
                  />
                  <i
                    slot="end"
                    class="fad fa-wallet fa-3x ion-margin"
                  ></i>
                  <ion-label>
                    <h3>
                      Giant's Wallet
                    </h3>
                    <p>
                      Maximum: <xp-gp :gp="10000" />
                    </p>
                  </ion-label>
                </ion-item>
                <!-- You can continue with more sizes, like so: -->
                <ion-item>
                  <ion-checkbox
                    slot="start"
                    disabled
                  />
                  <i
                    slot="end"
                    class="fad fa-wallet fa-4x ion-margin"
                  ></i>
                  <ion-label>
                    <h2>
                      Titan's Wallet
                    </h2>
                    <p>
                      Maximum: <xp-gp :gp="50000" />
                    </p>
                  </ion-label>
                </ion-item>
                <ion-item>
                  <ion-checkbox
                    slot="start"
                    disabled
                  />
                  <i
                    slot="end"
                    class="fad fa-wallet fa-5x ion-margin"
                  ></i>
                  <ion-label>
                    <h1>
                      Deity's Wallet
                    </h1>
                    <p>
                      Maximum: <xp-gp :gp="100000" />
                    </p>
                  </ion-label>
                </ion-item>
              </ion-list>
              <ion-button
                expand="block"
                color="primary"
              >
                Upgrade Wallet
              </ion-button>
            </ion-card>
          </ion-col>
        </ion-row>
      </ion-grid>
    </ion-content>
    <ion-footer color="primary">
      <ion-segment
        v-model="walletSegment"
        color="warning"
      >
        <ion-segment-button value="activity">
          <ion-label>
            <i class="fad fa-coins fa-lg"></i>
            Activity
          </ion-label>
        </ion-segment-button>
        <ion-segment-button value="wallet">
          <ion-label>
            <i class="fad fa-wallet fa-lg"></i>
            GP
          </ion-label>
        </ion-segment-button>
        <!-- <ion-segment-button value="about">
          <ion-label>
            <i class="fad fa-question fa-lg"></i>
            Debts
          </ion-label>
        </ion-segment-button> -->
        <ion-segment-button value="about">
          <ion-label>
            <i class="fad fa-question fa-lg"></i>
            About
          </ion-label>
        </ion-segment-button>
      </ion-segment>
      <!-- <ion-toolbar color="warning">
        <ion-grid>
          <ion-row>
            <ion-col size="6">
              <ion-button
                color="dark"
                :router-link="`/my-portal/${userId}`"
                expand="block"
              >
                <ion-icon
                  :icon="chevronBack"
                  slot="icon-only"
                />
              </ion-button>
            </ion-col>
            <ion-col>
              <ion-button
                :router-link="`/my-portal/${userId}`"
                expand="block"
              >
                <ion-icon
                  :icon="pause"
                  slot="icon-only"
                />
              </ion-button>
            </ion-col>
            <ion-col>
              <ion-button
                :router-link="`/my-portal/${userId}`"
                expand="block"
              >
                <ion-icon
                  :icon="play"
                  slot="icon-only"
                />
              </ion-button>
            </ion-col>
            <ion-col>
              <ion-button
                :router-link="`/my-portal/${userId}`"
                expand="block"
              >
                <ion-icon
                  :icon="stop"
                  slot="icon-only"
                />
              </ion-button>
            </ion-col>
            <ion-col class="ion-float-right">
              <ion-button
                disabled="true"
                color="dark"
                :router-link="`/my-portal/${userId}`"
                expand="block"
              >
                <ion-icon
                  :icon="chevronForward"
                  slot="icon-only"
                />
              </ion-button>
            </ion-col>
          </ion-row>
        </ion-grid>
      </ion-toolbar> -->
    </ion-footer>
  </ion-page>
</template>

<script src="./MyGoldPoints" lang="ts" />
<style lang="scss" src="./_MyGoldPoints.scss" scoped />

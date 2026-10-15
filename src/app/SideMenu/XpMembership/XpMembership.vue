<template>
  <ion-page class="xp-membership">
    <ion-header :translucent="true">
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <ion-menu-button />
          <ion-icon :icon="ribbonOutline" class="fa-2x ml-2" />
        </ion-buttons>
        <ion-title>XP Pro</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="adventure-pass-content ion-padding">
      <ion-grid>
        <ion-row>
          <ion-col>
            <pro-status-card />
          </ion-col>
        </ion-row>

        <ion-row v-if="!hasLifetime">
          <ion-col size="12">
            <h2 class="section-title">Choose Your Adventure Length</h2>
            <ion-card v-if="native" class="native-note-card">
              <ion-card-content class="native-note" data-cy="native-coming-soon">
                Purchases on this device are coming soon. Already bought XP Pro? Restore with your key in Settings &gt; XP Pro.
              </ion-card-content>
            </ion-card>
          </ion-col>
          <template v-if="!native">
            <ion-col size="12" size-md="4" v-for="item in items" :key="item.id">
              <ion-card class="plan-card" :data-cy="`plan-${item.id}`">
                <ion-card-header>
                  <ion-card-title>{{ item.title }}</ion-card-title>
                  <ion-card-subtitle data-cy="plan-price">{{ item.priceLabel }}</ion-card-subtitle>
                </ion-card-header>
                <ion-card-content>
                  <div v-if="item.trial" class="item-trial">7 days free</div>
                  <ion-button class="buy-button" :disabled="pro.loading" @click="buy(item.id)">
                    {{ item.trial ? "Start free trial" : "Buy" }}
                  </ion-button>
                </ion-card-content>
              </ion-card>
            </ion-col>
          </template>
        </ion-row>

        <ion-row>
          <ion-col>
            <ion-card class="benefits-card rpg-box">
              <ion-card-header>
                <ion-card-title>
                  <ion-icon :icon="sparklesOutline" color="primary" />
                  Your Adventure Perks
                </ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <ion-list lines="none" class="benefits-list">
                  <ion-item v-for="perk in perks" :key="perk.gate" data-cy="perk">
                    <ion-icon :icon="checkmarkCircle" color="success" slot="start" />
                    <ion-label>
                      <b>{{ perk.name }}</b>: {{ perk.text }}
                    </ion-label>
                  </ion-item>
                </ion-list>
                <p class="coming-soon">Coming to XP Pro: Family Sync across devices, parent reports, hero cosmetics.</p>
                <p class="free-forever">Heroes, custom quests and custom beasts stay free forever.</p>
              </ion-card-content>
            </ion-card>
          </ion-col>
        </ion-row>

        <ion-row>
          <ion-col class="restore-col">
            <router-link class="restore-link" to="/xp-settings/pro" data-cy="restore-link">
              Restore with key / Email me my key
            </router-link>
          </ion-col>
        </ion-row>
      </ion-grid>
    </ion-content>
  </ion-page>
</template>

<script lang="ts" src="./XpMembership.ts"></script>
<style lang="scss" src="./_XpMembership.scss" scoped></style>

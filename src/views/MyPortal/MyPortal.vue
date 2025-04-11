<template>
  <ion-page class="ion-page" :class="$options.name" v-cloak>
    <ion-content class="bg-transparent icon-colors" v-if="user">
      <xp-fab-user-hud
        :user="user"
        :isUserFabOn="isUserFabOn"
        @open-profile="openUserProfileModal"
      />
      <xp-user-points-hud v-if="isUserFabOn" :stats="user.stats" />
      <!-- <xp-fab-gold-points :user="user" :isUserFabOn="isUserFabOn" /> -->
      <xp-fab-quick-draw
        v-if="isUserFabOn"
        :user="user"
        :equipment="equipment"
        @openHud="
          isRPGBoxOpen = true;
          play$fx('openMenu');
        "
      />
      <xp-fab-page-menu
        v-if="isUserFabOn"
        :user="user"
        :page-name="compass.name"
      />
      <xp-fab-page-shortcuts v-if="isUserFabOn" :shortcuts="userActions" />

      <ion-tabs v-if="user.stats">
        <ion-router-outlet ref="outlet" :userId="user.id"></ion-router-outlet>
        <ion-tab-bar slot="bottom" v-if="user.stats && !battleState('active')">
          <ion-tab-button
            color="success"
            tab="my-profile"
            :href="`/my-portal/${userId}/my-profile`"
          >
            <ion-icon :icon="personCircle" color="success"></ion-icon>
            <ion-label v-if="user.name">
              {{ user.name.nick }}
            </ion-label>
            <ion-badge color="danger"> {{ user.stats.hp.now }} HP </ion-badge>
          </ion-tab-button>
          <ion-tab-button tab="my-home" :href="compass.link">
            <i class="fad fa-2x" :class="`fa-${compass.icon}`"></i>
            <ion-label>
              {{ compass.name }}
            </ion-label>
          </ion-tab-button>
          <ion-tab-button
            tab="my-party"
            :href="`/my-portal/${userId}/my-party`"
          >
            <i class="fab fa-fort-awesome fa-2x"></i>
            <ion-label>Party</ion-label>
          </ion-tab-button>
          <!-- 
          To favor immersion, we're taking these out
          <ion-tab-button
            tab="home-town"
            :href="`/my-portal/${userId}/home-town`"
          >
            <i class="fad fa-archway fa-2x"></i>
            <i class="fal fa-city fa-2x"></i>
            <ion-label>Town</ion-label>
          </ion-tab-button> -->
          <!-- <ion-tab-button
            tab="world-map"
            :disabled="false"
            :href="`/my-portal/${userId}/world-map`"
          >
            <i class="fal fa-globe fa-2x"></i>
            <ion-label>World</ion-label>
          </ion-tab-button> -->
          <!-- <ion-tab-button tab="shop" :href="`/my-portal/${userId}/shop`">
            <ion-icon :icon="storefrontOutline" color="secondary"></ion-icon>
            <ion-label>Shop</ion-label>
            <ion-badge color="warning"
              >¤{{ user.stats.gp.wallet }} GP</ion-badge
            >
          </ion-tab-button> 
          -->
        </ion-tab-bar>
      </ion-tabs>
    </ion-content>

    <!-- EQUIPMENT MODAL -->
    <xp-equipment-modal
      :isOpen="isRPGBoxOpen"
      :equipment="equipment"
      @equip-item="clickItem"
      @close="closeModal"
    />

    <!-- USER PROFILE MODAL -->
    <user-profile-modal
      :is-open="isUserProfileModalOpen"
      :user="user"
      @close="closeUserProfileModal"
    />
  </ion-page>
</template>

<script src="./MyPortal.js"></script>
<style lang="scss" src="./_MyPortal.scss"></style>

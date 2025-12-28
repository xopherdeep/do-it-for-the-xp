<template>
  <ion-page
    class="ion-page"
    :class="$options.name"
    v-cloak
  >
    <ion-content
      class="bg-transparent icon-colors"
      v-if="!user"
    >
      <div class="h-full w-full flex items-center justify-center">
        <ion-spinner name="crescent"></ion-spinner>
      </div>
    </ion-content>

    <ion-content
      class="bg-transparent icon-colors"
      v-else
    >
      <!-- Symmetric Main HUD Organism -->
      <xp-main-hud
        v-if="isUserFabOn && user.stats"
        :stats="user.stats"
      >
        <template #avatar>
          <xp-fab-user-hud
            :user="user"
            :isUserFabOn="isUserFabOn"
            @open-profile="openUserProfileModal"
          />
        </template>
      </xp-main-hud>
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
      <!-- Retro FAB (Centered Menu) -->
      <xp-fab-page-menu
        v-if="isUserFabOn && fabStyle === 'retro'"
        :user="user"
        :page-name="compass.name"
        :key="`menu-${route.path}`"
      />
      
      <!-- Modern FAB (Radial Shortcuts) -->
      <xp-fab-page-shortcuts
        v-if="isUserFabOn && fabStyle === 'modern'"
        :shortcuts="userActions"
        :key="`shortcuts-${route.path}`"
      />

      <ion-tabs v-if="user && user.stats">
        <ion-router-outlet
          ref="outlet"
          :userId="user.id"
        ></ion-router-outlet>
        
        <!-- Docked XP Bar -->
        <div 
          class="tab-docked-xp" 
          v-if="user.stats && !battleState('active')"
          slot="bottom"
        >
          <xp-gp-bar :stats="user.stats" />
          <xp-xp-bar :stats="user.stats" :hairline="true" />
        </div>

        <ion-tab-bar
          slot="bottom"
          v-if="user.stats && !battleState('active')"
        >
          <ion-tab-button
            color="success"
            tab="my-profile"
            @click.prevent="openUserProfileModal"
          >
            <i
              class="fad fa-2x fa-hand-holding-seedling"
            ></i>
            <ion-label v-if="user.name">
              {{ user.name.nick }}
            </ion-label>
            <!-- <ion-badge color="danger"> {{ user.stats.hp.now }} HP </ion-badge> -->
          </ion-tab-button>
          <ion-tab-button
            tab="my-home"
            :href="compass.link"
          >
            <i
              class="fad fa-2x"
              :class="`fa-${compass.icon}`"
            ></i>
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
      :user="user"
      @equip-item="clickItem"
      @close="closeModal"
      @open-pegasus-modal="openPegasusModal"
    />

    <!-- USER PROFILE MODAL -->
    <user-profile-modal
      :is-open="isUserProfileModalOpen"
      :user="user"
      @close="closeUserProfileModal"
    />

    <!-- PEGASUS WORLD MAP MODAL (Wind Whistle) -->
    <xp-world-map-modal 
      :is-open="isPegasusModalOpen" 
      @close="closePegasusModal"
    />
  </ion-page>
</template>

<script src="./MyPortal"></script>
<style lang="scss" src="./_MyPortal.scss"></style>

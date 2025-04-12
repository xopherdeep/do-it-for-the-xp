<template>
  <ion-page :class="$options.name">
    <ion-header :translucent="true">
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <ion-back-button default-href="/xp-settings"></ion-back-button>
        </ion-buttons>
        <ion-title>Party Settings</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="rpg-box">
      <ion-card>
        <ion-list>
          <!-- General Party Settings -->
          <ion-item-group>
            <ion-item-divider>
              <ion-label>General Party Settings</ion-label>
            </ion-item-divider>
            
            <ion-item>
              <ion-label>
                <h2>Lock My Family Circle</h2>
                <p>Prevent making changes to the family party</p>
              </ion-label>
              <ion-toggle v-model="settings.lockFamily"></ion-toggle>
            </ion-item>

            <ion-item>
              <ion-label>
                <h2>Allow Party Creation</h2>
                <p>Enable creating new parties/guilds with friends</p>
              </ion-label>
              <ion-toggle v-model="settings.allowPartyCreation"></ion-toggle>
            </ion-item>
          </ion-item-group>

          <!-- Post & View Permissions -->
          <ion-item-group>
            <ion-item-divider>
              <ion-label>Post & View Permissions</ion-label>
            </ion-item-divider>

            <!-- Family Circle Posts -->
            <ion-item>
              <ion-label>
                <h2>Family Circle Posts</h2>
                <p>Show posts from families in your circle</p>
              </ion-label>
              <ion-toggle v-model="settings.showFamilyCirclePosts"></ion-toggle>
            </ion-item>

            <ion-item v-if="settings.showFamilyCirclePosts">
              <ion-label>
                <h3>Who Can Post Messages</h3>
                <p>Control who can post in family circles</p>
              </ion-label>
            </ion-item>
            <ion-item v-if="settings.showFamilyCirclePosts" lines="none">
              <div class="avatar-group">
                <div v-for="user in users" :key="user.id" class="avatar-wrapper">
                  <ion-avatar @click="toggleUserPermission(user.id, 'canPost')">
                    <img :src="appConfig.$getUserAvatar(user)" :alt="user.name.full">
                    <i class="fad fa-check-circle status-icon" v-if="settings.permissions[user.id]?.canPost"></i>
                  </ion-avatar>
                  <span class="avatar-name">{{ user.name.nick }}</span>
                </div>
              </div>
            </ion-item>

            <ion-item v-if="settings.showFamilyCirclePosts">
              <ion-label>
                <h3>Who Can View Messages</h3>
                <p>Control who can view family circle messages</p>
              </ion-label>
            </ion-item>
            <ion-item v-if="settings.showFamilyCirclePosts" lines="none">
              <div class="avatar-group">
                <div v-for="user in users" :key="user.id" class="avatar-wrapper">
                  <ion-avatar @click="toggleUserPermission(user.id, 'canView')">
                    <img :src="appConfig.$getUserAvatar(user)" :alt="user.name.full">
                    <i class="fad fa-check-circle status-icon" v-if="settings.permissions[user.id]?.canView"></i>
                  </ion-avatar>
                  <span class="avatar-name">{{ user.name.nick }}</span>
                </div>
              </div>
            </ion-item>
          </ion-item-group>

          <!-- Party Join Settings -->
          <ion-item-group>
            <ion-item-divider>
              <ion-label>Party Join Settings</ion-label>
            </ion-item-divider>

            <ion-item>
              <ion-label>
                <h2>Party Join Requests</h2>
                <p>Require approval for party join requests</p>
              </ion-label>
              <ion-toggle v-model="settings.requireJoinApproval"></ion-toggle>
            </ion-item>

            <ion-item>
              <ion-label>
                <h2>Allow Party Invites</h2>
                <p>Let party members invite others</p>
              </ion-label>
              <ion-toggle v-model="settings.allowPartyInvites"></ion-toggle>
            </ion-item>

            <ion-item v-if="settings.allowPartyInvites">
              <ion-label>Who Can Send Invites</ion-label>
              <ion-select v-model="settings.invitePermission" interface="action-sheet">
                <ion-select-option value="adults">Adults Only</ion-select-option>
                <ion-select-option value="all">All Members</ion-select-option>
                <ion-select-option value="leader">Party Leader Only</ion-select-option>
              </ion-select>
            </ion-item>
          </ion-item-group>
        </ion-list>
      </ion-card>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from 'vue'
import { useStore } from 'vuex'
import { 
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonList, IonItem, IonLabel, IonToggle, IonCard,
  IonBackButton, IonButtons, IonAvatar, IonItemDivider,
  IonSelect, IonSelectOption, IonItemGroup
} from '@ionic/vue'
import appConfig from '@/app.config'
import ionic from "@/mixins/ionic"

export default defineComponent({
  name: 'PartySettings',
  components: {
    IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
    IonList, IonItem, IonLabel, IonToggle, IonCard,
    IonBackButton, IonButtons, IonAvatar, IonItemDivider,
    IonSelect, IonSelectOption, IonItemGroup
  },
  mixins: [ionic],
  setup() {
    const store = useStore()
    const settings = ref({
      lockFamily: false,
      allowPartyCreation: true,
      showFamilyCirclePosts: true,
      requireJoinApproval: true,
      allowPartyInvites: true,
      invitePermission: 'adults',
      permissions: {} as Record<string, { canPost: boolean, canView: boolean }>
    })

    // Get all users from Vuex store
    const users = computed(() => store.getters.usersAz)

    // Initialize permissions for all users
    users.value.forEach(user => {
      settings.value.permissions[user.id] = {
        canPost: true,
        canView: true
      }
    })

    const toggleUserPermission = (userId: string, permission: 'canPost' | 'canView') => {
      if (!settings.value.permissions[userId]) {
        settings.value.permissions[userId] = {
          canPost: true,
          canView: true
        }
      }
      settings.value.permissions[userId][permission] = !settings.value.permissions[userId][permission]
    }

    return {
      settings,
      users,
      toggleUserPermission,
      appConfig
    }
  }
})
</script>

<style lang="scss" scoped>
.avatar-group {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  padding: 0.5rem;

  .avatar-wrapper {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    cursor: pointer;
  }

  ion-avatar {
    width: 60px;
    height: 60px;
    position: relative;
    
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 50%;
      aspect-ratio: 1;
    }

    .status-icon {
      position: absolute;
      bottom: -5px;
      right: -5px;
      font-size: 1.2rem;
      color: var(--ion-color-success);
      background: var(--ion-background-color);
      border-radius: 50%;
    }
  }

  .avatar-name {
    font-size: 0.8rem;
    margin-top: 0.25rem;
    text-align: center;
  }
}
</style>
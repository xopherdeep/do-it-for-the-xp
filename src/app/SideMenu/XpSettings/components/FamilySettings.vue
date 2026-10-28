<template>
  <ion-page :class="[$options.name, 'xp-settings-page']">
    <ion-header :translucent="true">
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <xp-back-button></xp-back-button>
        </ion-buttons>
        <ion-title>Family</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="rpg-box bg-slide ion-padding">
      <ion-card class="max-w-2xl">
        <ion-list>
          <ion-item-group>
            <ion-item-divider>
              <ion-label>Game Masters</ion-label>
              <ion-button slot="end" size="small" v-if="!lockFamily && canManage" @click="openModal({ presetGameMaster: true })">
                <i class="fad fa-user-plus mr-2"></i>
                Add
              </ion-button>
            </ion-item-divider>
            <xp-profile-item v-for="profile in profiles.filter((p) => p.isAdult)" :key="profile.id" :profile="profile"
              :isLocked="lockFamily || !canManage" @clickAddProfile="clickEditProfile" @clickDeleteProfile="clickDeleteProfile" />
          </ion-item-group>

          <ion-item-group>
            <ion-item-divider>
              <ion-label>Heroes</ion-label>
              <ion-button slot="end" size="small" v-if="!lockFamily && canManage" @click="openModal({ presetGameMaster: false })">
                <i class="fad fa-user-plus mr-2"></i>
                Add
              </ion-button>
            </ion-item-divider>

            <xp-profile-item v-for="profile in profiles.filter((p) => !p.isAdult)" :key="profile.id" :profile="profile"
              :isLocked="lockFamily || !canManage" @clickAddProfile="clickEditProfile" @clickDeleteProfile="clickDeleteProfile" />
          </ion-item-group>

          <ion-item-group v-if="canManage">
            <ion-item-divider>
              <ion-label>Setup</ion-label>
            </ion-item-divider>
            <ion-item lines="none">
              <ion-label>
                <h2>Family setup is complete</h2>
                <p>Hide the add, edit and delete buttons so nobody changes the family by accident</p>
              </ion-label>
              <ion-toggle :checked="lockFamily" @ionChange="setLockFamily($event.detail.checked)"></ion-toggle>
            </ion-item>
          </ion-item-group>
        </ion-list>
      </ion-card>

      <xp-family-phones v-if="canManage" />

      <ion-card v-if="canManage" class="max-w-2xl family-items">
        <ion-list>
          <ion-item-divider>
            <ion-label>Item rules</ion-label>
          </ion-item-divider>
          <ion-item>
            <ion-label>
              <h2>Trusted Hour</h2>
              <p>Lets the Trusted Hour Power open an hour when a hero's claims skip the approval queue</p>
            </ion-label>
            <ion-toggle :checked="family.trustedHour" @ionChange="setFamily({ trustedHour: $event.detail.checked })"> </ion-toggle>
          </ion-item>
        </ion-list>
      </ion-card>

      <ion-card v-if="canManage" class="max-w-2xl family-bedtime" data-cy="bedtime-settings">
        <ion-list>
          <ion-item-divider>
            <ion-label>Bedtime</ion-label>
          </ion-item-divider>
          <ion-item>
            <ion-label class="ion-text-wrap">
              <h2>Lights out</h2>
              <p>Between these times a hero's portal goes to sleep: no quests, shops or temples until morning. Game Masters are never locked out.</p>
            </ion-label>
            <ion-toggle data-cy="bedtime-toggle" :checked="rules.bedtime.enabled" @ionChange="rules.setBedtime({ enabled: $event.detail.checked })"></ion-toggle>
          </ion-item>
          <ion-item :disabled="!rules.bedtime.enabled">
            <ion-label>
              <h2>Lights out at</h2>
            </ion-label>
            <ion-select
              slot="end"
              class="family-bedtime__clock"
              interface="action-sheet"
              aria-label="Lights out at"
              :value="rules.bedtime.from"
              @ionChange="rules.setBedtime({ from: $event.detail.value })"
            >
              <ion-select-option v-for="clock in clocks" :key="clock" :value="clock">{{ clockLabel(clock) }}</ion-select-option>
            </ion-select>
          </ion-item>
          <ion-item :disabled="!rules.bedtime.enabled" lines="none">
            <ion-label>
              <h2>Wake up at</h2>
            </ion-label>
            <ion-select
              slot="end"
              class="family-bedtime__clock"
              interface="action-sheet"
              aria-label="Wake up at"
              :value="rules.bedtime.to"
              @ionChange="rules.setBedtime({ to: $event.detail.value })"
            >
              <ion-select-option v-for="clock in clocks" :key="clock" :value="clock">{{ clockLabel(clock) }}</ion-select-option>
            </ion-select>
          </ion-item>
        </ion-list>
        <ion-card-content v-if="rules.bedtime.enabled && rules.bedtime.from === rules.bedtime.to" class="family-bedtime__note">
          <p>Pick two different times, or the bedtime never starts.</p>
        </ion-card-content>
      </ion-card>

      <ion-card v-if="canReissueCode" class="max-w-2xl family-recovery" data-cy="recovery-code-settings">
        <ion-list>
          <ion-item-divider>
            <ion-label>Recovery code</ion-label>
          </ion-item-divider>
          <ion-item lines="none">
            <ion-label class="ion-text-wrap">
              <h2>Forgot PIN code</h2>
              <p>Lost your recovery code? Make a new one. The old code stops working the moment the new one is made.</p>
            </ion-label>
            <ion-button slot="end" size="small" data-cy="reissue-recovery-code" @click="clickNewRecoveryCode">
              <i class="fad fa-key mr-2"></i>
              New code
            </ion-button>
          </ion-item>
        </ion-list>
      </ion-card>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from "vue";
import ionic from "@/lib/mixins/ionic";
import { profileStorage } from "@/lib/databases/profileStorage";
import { ProfileDb } from "@/lib/databases";
import User from "@/lib/utils/User";
import { alertController, modalController, toastController } from "@ionic/vue";
import XpProfileItem from "./ProfileItem.vue";
import XpFamilyPhones from "./XpFamilyPhones.vue";
import AddProfile from "@/app/SideMenu/SwitchProfile/AddProfile/AddProfile.vue";
import { useUserStore } from "@/lib/store/stores/user";
import { canManageFamily, deleteProfileProblem, FAMILY_GM_ONLY_MESSAGE } from "@/router/_Guards/gm.guard";
import { heroAvatarSrc } from "@/lib/hero-look/look";
import { dialogMessage } from "@/lib/utils/dialogMessage";
import { orphanCreations } from "@/lib/services/creations/myCreations";
import { canReissueRecoveryCode } from "@/lib/services/profile/pinRecovery";
import { reissueRecoveryCode } from "@/app/SideMenu/SwitchProfile/pinRecoveryPrompts";
import debug from "@/lib/utils/debug";
import { useGameRulesStore } from "@/lib/store/stores/gameRules";
import {
  BEDTIME_CLOCKS,
  clockLabel,
  DEFAULT_FAMILY_SETTINGS,
  loadFamilySettings,
  type FamilySettings,
} from "@/lib/services/family/familySettings";

const FAMILY_LOCK_KEY = "xp.familyLocked";

const readFamilyLock = (): boolean => {
  try {
    return localStorage.getItem(FAMILY_LOCK_KEY) === "true";
  } catch {
    return false;
  }
};

const writeFamilyLock = (locked: boolean): void => {
  try {
    localStorage.setItem(FAMILY_LOCK_KEY, String(locked));
  } catch {
    // chemx-allow: best-effort storage blocked, so the lock lasts until the page is left
  }
};

export default defineComponent({
  name: "xp-settings-family",
  mixins: [ionic],
  components: { XpProfileItem, XpFamilyPhones },
  setup() {
    // "Family setup is complete" hides the add, edit and delete buttons; kept on this device across visits
    const lockFamily = ref(readFamilyLock());
    const setLockFamily = (locked: boolean) => {
      lockFamily.value = locked;
      writeFamilyLock(locked);
    };
    const userStore = useUserStore();
    const profileDb = new ProfileDb(profileStorage);
    const requireAvatar = require.context("@/assets/images/avatars/", false, /\.svg$/);

    // Get profiles from Pinia store
    const profiles = computed(() => userStore.usersAz);

    // Only a Game Master adds, edits or deletes profiles; heroes see the list without the buttons
    const canManage = computed(() => canManageFamily(userStore));

    // The recovery code belongs to the Game Master signed in as themselves (not a hero they are playing)
    const canReissueCode = computed(() => canReissueRecoveryCode(userStore));

    // Methods
    const loadProfiles = async () => {
      await userStore.loadUsers();
    };

    // Load profiles when component mounts
    loadProfiles();

    // Saved through the game rules, so the lights-out screen follows the bedtime card at once
    const rules = useGameRulesStore();
    void rules.load();

    // The Item rules card: whether the Trusted Hour Power may cast
    const family = ref<FamilySettings>(JSON.parse(JSON.stringify(DEFAULT_FAMILY_SETTINGS)));
    loadFamilySettings().then((loaded) => (family.value = loaded));
    const setFamily = (change: Partial<FamilySettings>) => {
      if (!canManage.value) return;
      family.value = { ...family.value, ...change };
      void rules.save(change);
    };

    return {
      family,
      setFamily,
      rules,
      clocks: BEDTIME_CLOCKS,
      clockLabel,
      userStore,
      requireAvatar,
      profiles,
      canManage,
      canReissueCode,
      profileDb,
      lockFamily,
      setLockFamily,
      loadProfiles,
    };
  },
  methods: {
    async refuse(message: string) {
      const toast = await toastController.create({
        message,
        duration: 2500,
        position: "top",
        cssClass: "rpg-toast",
      });
      await toast.present();
    },
    async clickEditProfile(profile: User) {
      if (!this.canManage) return this.refuse(FAMILY_GM_ONLY_MESSAGE);
      await this.openModal({ profile });
    },
    async openModal(componentProps?: any) {
      if (!this.canManage) return this.refuse(FAMILY_GM_ONLY_MESSAGE);
      const modal = await modalController.create({
        component: AddProfile,
        cssClass: "fullscreen",
        componentProps,
      });
      modal.onDidDismiss().then(this.loadProfiles);
      modal.present();
    },
    async deleteProfile(profile: User) {
      // Backstop for the alert: refuse again at the moment of deleting
      const problem = deleteProfileProblem(profile, this.userStore);
      if (problem) return this.refuse(problem);
      const { profileDb, loadProfiles } = this;
      await profileDb
        .removeProfile(profile.id)
        .then(() => this.returnCreationsOf(profile.id))
        .then(loadProfiles)
        .then(profileDb.showDeleteToast);
    },
    /** The deleted hero's creations still waiting go back to the Game Master as "maker gone"; a failure here never blocks the delete */
    async returnCreationsOf(heroId: string) {
      try {
        await orphanCreations(heroId, new Date());
      } catch (error) {
        debug.warn("Could not send the deleted hero's creations back", error);
      }
    },
    async clickDeleteProfile(profile: User) {
      const problem = deleteProfileProblem(profile, this.userStore);
      if (problem) return this.refuse(problem);
      const alert = await alertController.create({
        header: `Delete ${profile.name.nick || profile.name.full}?`,
        cssClass: ["rpg-alert", "rpg-alert--danger"],
        message: dialogMessage({
          lead: "Their profile, stats and progress go away.",
          note: "This can't be undone.",
        }),
        buttons: [
          { text: "Cancel", role: "cancel" },
          {
            text: "Delete",
            role: "destructive",
            handler: () => this.deleteProfile(profile),
          },
        ],
      });
      await alert.present();
    },
    async clickNewRecoveryCode() {
      // Backstop for the button: only the signed-in Game Master makes their own code
      if (!this.canReissueCode) return this.refuse(FAMILY_GM_ONLY_MESSAGE);
      const profile = this.userStore.users[this.userStore.currentUser.id as string];
      try {
        await reissueRecoveryCode(profile);
      } catch (error) {
        debug.error("Could not make a new recovery code", error);
        await this.refuse("The new recovery code could not be saved. Try again.");
      }
    },
    getUserAvatar(user) {
      return heroAvatarSrc(user, (key: string) => this.requireAvatar(key)) || undefined;
    },
  },
});
</script>

<style lang="scss">
.family-bedtime__clock {
  font-size: 1.1rem;
  min-width: 7rem;
  justify-content: flex-end;
}

.family-bedtime__note p {
  margin: 0;
  font-size: 0.85rem;
  opacity: 0.8;
}
</style>

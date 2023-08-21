<template>
  <ion-header>
    <ion-toolbar class="rpg-box">
      <ion-title>Start New Profile</ion-title>
      <ion-buttons slot="end"> </ion-buttons>
    </ion-toolbar>
  </ion-header>
  <ion-content class="rpg-box">
    <ion-list>
      <ion-item class="avatar-row">
        <ion-button
          :disabled="avatarIndex === 1"
          slot="start"
          @click="previousAvatar"
        >
          <ion-icon :icon="arrowBack" />
        </ion-button>
        <ion-img :src="currentAvatar" class="img-avatar" />
        <ion-button
          :disabled="avatarIndex === maxAvatarIndex"
          slot="end"
          @click="nextAvatar"
        >
          <ion-icon :icon="arrowForward" />
        </ion-button>
        <ion-input type="number" v-model="avatarIndex" min="1" max="51" />
      </ion-item>
      <ion-item>
        <ion-label>Full Name</ion-label>
        <ion-input v-model="fullName"></ion-input>
      </ion-item>
      <ion-item>
        <i slot="end" :class="`${selectedJobIcon} fa-2x`" />
        <ion-label> Job Class </ion-label>
        <ion-select v-model="jobClass">
          <ion-select-option
            v-for="(job, index) in jobClassOptions"
            :key="index"
            :value="job.name"
          >
            {{ job.name }}
          </ion-select-option>
        </ion-select>
      </ion-item>
      <ion-item>
        <ion-label>Favorite Thing</ion-label>
        <ion-input v-model="favoriteThing"></ion-input>
      </ion-item>
      <ion-item>
        <i slot="end" :class="`${selectedFoodIcon} fa-2x`" />
        <ion-label> Favorite Food </ion-label>
        <ion-select v-model="favoriteFood">
          <ion-select-option
            v-for="food in foodOptions"
            :key="food.value"
            :value="food.value"
          >
            {{ food.value }}
          </ion-select-option>
        </ion-select>
      </ion-item>
    </ion-list>
    <InputSettings />
  </ion-content>
  <ion-footer>
    <ion-toolbar>
      <ion-button slot="start" color="danger" @click="closeModal">
        Cancel
      </ion-button>
      <ion-button
        :disabled="!favoriteFood || !favoriteThing || !jobClass || !fullName"
        color="success"
        slot="end"
        @click="clickSaveProfile"
      >
        Save Profile
      </ion-button>
    </ion-toolbar>
  </ion-footer>
</template>
<script lang="ts" setup>
  import { computed, ref } from "vue";
  import {
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonImg,
    IonIcon,
    IonSelect,
    IonSelectOption,
    IonFooter,
    IonInput,
    modalController,
  } from "@ionic/vue";
  import { arrowBack, arrowForward } from "ionicons/icons";
  import { FOOD_OPTIONS, JOB_CLASS_OPTIONS } from "@/constants";

  import { ProfileDb } from "@/databases";
  import { profileStorage } from "../SwitchProfile.vue";
  import InputSettings from "../../XpSettings/components/InputSettings.vue";

  const $requireAvatar = require.context(
    "@/assets/images/avatars",
    false,
    /\.svg$/
  );

  const jobClassOptions = ref(JOB_CLASS_OPTIONS);
  const foodOptions = ref(FOOD_OPTIONS);
  const favoriteFood = ref("");
  const favoriteThing = ref("");
  const jobClass = ref("Warrior");
  const storage = new ProfileDb(profileStorage);
  const fullName = ref("");
  const avatarIndex = ref(1);
  const maxAvatarIndex = $requireAvatar.keys().length;

  const paddedIndex = computed(() =>
    avatarIndex.value.toString().padStart(3, "0")
  );

  const currentAvatar = computed(() =>
    $requireAvatar(`./${paddedIndex.value}-gamer.svg`)
  );

  const selectedFoodIcon = computed(() => {
    const findFavoriteFood = (food) => food.value === favoriteFood.value;
    const selectedFood = foodOptions.value.find(findFavoriteFood);
    return selectedFood ? selectedFood.icon : "fad fa-utensils";
  });

  const selectedJobIcon = computed(() => {
    const findJobClass = (job) => job.name === jobClass.value;
    const selectedJob = jobClassOptions.value.find(findJobClass);
    return selectedJob ? selectedJob.icon : "fad fa-utensils";
  });

  function clickSaveProfile() {
    const profile = storage.newProfile({
      name: { full: fullName.value },
      avatar: `${paddedIndex.value}-gamer`,
      favoriteThing: favoriteThing.value,
      favoriteFood: favoriteFood.value,
      jobClass: jobClass.value,
    });
    storage.setProfile(profile).then(profileAdded);
  }

  function closeModal() {
    modalController.dismiss();
  }

  function profileAdded() {
    closeModal();
    clearForm();
  }

  function clearForm() {
    fullName.value = "";
    favoriteThing.value = "";
    favoriteFood.value = "";
    jobClass.value = "";
    avatarIndex.value = 1;
  }

  function previousAvatar() {
    if (avatarIndex.value > 1) {
      avatarIndex.value--;
    }
  }

  function nextAvatar() {
    if (avatarIndex.value < maxAvatarIndex) {
      avatarIndex.value++;
    }
  }
</script>
@/databases/profile @/databases/profile.db

<template>
  <!-- fab placed to the (vertical) center and end -->
  <ion-fab vertical="bottom" horizontal="center" slot="fixed">
    <ion-fab-button @click="openModal">
      <ion-icon :icon="add"></ion-icon>
    </ion-fab-button>
  </ion-fab>
  <ion-modal :is-open="showModal" @ionModalDidDismiss="closeModal">
    <ion-header>
      <ion-toolbar class="rpg-box">
        <ion-title>Create New Profile</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="closeModal">Close</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="rpg-box">
      <ion-list>
        <ion-item>
          <ion-label>Full Name</ion-label>
          <ion-input v-model="fullName"></ion-input>
        </ion-item>
        <ion-item>
          <ion-label>Job Class</ion-label>
          <ion-select v-model="jobClass">
            <ion-select-option v-for="job in jobClassOptions" :key="job" :value="job">
              {{ job }}
            </ion-select-option>
          </ion-select>
        </ion-item>
        <ion-item>
          <ion-label>Favorite Thing</ion-label>
          <ion-input v-model="favoriteThing"></ion-input>
        </ion-item>
        <ion-item>
          <ion-label>
            Favorite Food
          </ion-label>
          <ion-select v-model="favoriteFood">
            <ion-select-option v-for="food in foodOptions" :key="food.value" :value="food.value">
              <i :class="`${food.icon}`"></i>
              {{ food.value }}
            </ion-select-option>
            <i :class="`${selectedFoodIcon} fa-2x`"></i>
          </ion-select>

        </ion-item>
      </ion-list>
      <ion-button expand="full" @click="saveProfile">Save Profile</ion-button>
    </ion-content>
    <ion-footer>
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="end">
          <ion-button @click="saveProfile">Save Profile</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-footer>

  </ion-modal>
</template>

<script lang="ts">
  import ionic from "@/mixins/ionic";
import User from "@/utils/User";
  import { add } from "ionicons/icons";
  import Vue, { defineComponent } from 'vue'
  export default defineComponent({
    name: 'AddProfile',
    mixins: [ionic],
    data() {
      return {
        showModal: false,
        fullName: '',
        favoriteThing: '',
        favoriteFood: '',
        jobClass: '',
        jobClassOptions: ['Warrior', 'Mage', 'Thief', 'Monk'],
        foodOptions: [
          { value: 'Pizza', icon: 'fad fa-pizza-slice' },
          { value: 'Burger', icon: 'fad fa-burger-soda' },
          { value: 'Cheeseburger', icon: 'fad fa-cheeseburger' },
          { value: 'French Fries', icon: 'fad fa-french-fries' },
          { value: 'Popcorn', icon: 'fad fa-popcorn' },
          { value: 'Burrito', icon: 'fad fa-burrito' },
          { value: 'Apple', icon: 'fad fa-apple' },
          { value: 'Carrot', icon: 'fad fa-carrot' },
          { value: 'Candy Cane', icon: 'fad fa-candy-cane' },
          { value: 'Candy Corn', icon: 'fad fa-candy-corn' },
          { value: 'Cookie', icon: 'fad fa-cookie' },
          { value: 'Corn', icon: 'fad fa-corn' },
          { value: 'Fried Egg', icon: 'fad fa-egg-fried' },
          { value: 'Drumstick', icon: 'fad fa-drumstick' },
          { value: 'Hotdog', icon: 'fad fa-hotdog' },
          { value: 'Pie', icon: 'fad fa-pie' },
          { value: 'Salad', icon: 'fad fa-salad' }
        ],
      };
    },
    computed: {
      selectedFoodIcon() {
        const selectedFood = this.foodOptions.find(food => food.value === this.favoriteFood);
        return selectedFood ? selectedFood.icon : '';
      }, 
      storedProfiles:{
        get(){
          const storedProfiles = localStorage.getItem('profiles');
          return storedProfiles ? JSON.parse(storedProfiles) : []
        },
        set(storedProfiles){
          // Save the updated profiles array back to local storage
          localStorage.setItem('profiles', JSON.stringify(storedProfiles));
        }
      }
    },
    methods: {
      openModal() {
        this.showModal = true;
        console.log(this.showModal);
      },
      closeModal() {
        this.showModal = false;
      },
      saveProfile() {
        const { 
          fullName, 
          favoriteThing, 
          favoriteFood,
          jobClass
        } = this;

        const newProfile = new User({
          name: {fullName},
          favoriteThing,
          favoriteFood,
          jobClass
        })

        // Create a new profile object
        this.storedProfiles.push(newProfile);
        this.setProfiles(this.storedProfiles);

        this.clearForm()
        this.closeModal();
        this.$emit('add-profile', newProfile);
      },
      // Clear the form data
      clearForm(){
        this.fullName = '';
        this.favoriteThing = '';
        this.favoriteFood = '';
        this.jobClass = '';
      },
      setProfiles(profiles){
        localStorage.setItem('profiles', JSON.stringify(profiles));
      },
      unlockJobClass(level) {
        if (level >= 10) {
          this.jobClassOptions.push('Knight');
        }
        if (level >= 20) {
          this.jobClassOptions.push('Black Mage');
        }
        // Add more job classes as needed
      },
    },
    setup() {
      return {
        add
      }
    }
  })
</script>
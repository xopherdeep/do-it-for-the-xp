<template>
  <!-- fab placed to the (vertical) center and end -->
  <ion-fab
    :class="$options.name"
    vertical="bottom"
    horizontal="center"
    slot="fixed"
  >
    <ion-fab-button @click="openModal">
      <ion-icon :icon="add"></ion-icon>
    </ion-fab-button>
    <ion-modal
      :class="$options.name"
      :is-open="showModal"
      @ionModalDidDismiss="closeModal"
    >
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
          <ion-item class="avatar-row">
            <ion-label>Avatar</ion-label>
            <ion-button slot="start" @click="previousAvatar"
              ><ion-icon :icon="arrowBack"></ion-icon
            ></ion-button>
            <ion-img :src="currentAvatar" class="img-avatar"></ion-img>
            <ion-button slot="end" @click="nextAvatar"
              ><ion-icon :icon="arrowForward"></ion-icon
            ></ion-button>
            <i :class="`${selectedFoodIcon} fa-4x ion-padding`"></i>
            <i :class="`${selectedJobIcon} fa-4x`"></i>
            <ion-input type="number" v-model="avatarIndex" min="1" max="51"/>
          </ion-item>
          <ion-item>
            <ion-label>Full Name</ion-label>
            <ion-input v-model="fullName"></ion-input>
          </ion-item>
          <ion-item>
            <ion-label>Job Class</ion-label>
            <ion-select v-model="jobClass">
              <ion-select-option
                v-for="job in jobClassOptions"
                :key="job"
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
            <ion-label>
              Favorite Food
            </ion-label>
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
        <!-- <ion-button expand="full" @click="saveProfile">Save Profile</ion-button> -->
      <ion-footer>
        <ion-toolbar class="rpg-box">
          <ion-buttons slot="end">
            <ion-button @click="saveProfile">Save Profile</ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-footer>
      </ion-content>
    </ion-modal>
  </ion-fab>
</template>

<script lang="ts">
  import ionic from "@/mixins/ionic";
  import store from "@/store";
  import User from "@/utils/User";
  import { add, arrowBack, arrowForward } from "ionicons/icons";
  import Vue, { defineComponent } from "vue";
  export default defineComponent({
    name: "xp-add-profile",
    mixins: [ionic],
    data() {
      return {
        showModal: false,
        fullName: "",
        favoriteThing: "",
        favoriteFood: "",
        jobClass: "Warrior",
        avatarIndex: 1,
        maxAvatarIndex: 51,
        jobClassOptions: [{
          name: "Warrior",
          icon: "fad fa-user-cowboy",
        },{
          name: "Mage",
          icon: "fad fa-user-crown",
        },{
          name: "Thief",
          icon: "fad fa-user-secret",
        },{
          name: "Monk",
          icon: "fad fa-user-hard-hat",
        }],
        foodOptions: [
          { value: "Pizza", icon: "fad fa-pizza-slice" },
          { value: "Burger", icon: "fad fa-burger-soda" },
          { value: "Cheeseburger", icon: "fad fa-cheeseburger" },
          { value: "French Fries", icon: "fad fa-french-fries" },
          { value: "Popcorn", icon: "fad fa-popcorn" },
          { value: "Burrito", icon: "fad fa-burrito" },
          { value: "Apple", icon: "fad fa-apple" },
          { value: "Carrot", icon: "fad fa-carrot" },
          { value: "Candy Cane", icon: "fad fa-candy-cane" },
          { value: "Candy Corn", icon: "fad fa-candy-corn" },
          { value: "Cookie", icon: "fad fa-cookie" },
          { value: "Corn", icon: "fad fa-corn" },
          { value: "Fried Egg", icon: "fad fa-egg-fried" },
          { value: "Drumstick", icon: "fad fa-drumstick" },
          { value: "Hotdog", icon: "fad fa-hotdog" },
          { value: "Pie", icon: "fad fa-pie" },
          { value: "Salad", icon: "fad fa-salad" },
        ],
      };
    },
    computed: {
      paddedIndex() {
        return this.avatarIndex.toString().padStart(3, "0");
      },
      currentAvatar() {
        return this.$requireAvatar(`./${this.paddedIndex}-gamer.svg`);
      },
      selectedFoodIcon() {
        const { foodOptions, favoriteFood } = this; 
        const findFavoriteFood = food => food.value === favoriteFood 
        const selectedFood = foodOptions.find( findFavoriteFood );
        return selectedFood ? selectedFood.icon : "fad fa-utensils";
      },

      selectedJobIcon(){
        const { jobClassOptions, jobClass } = this; 
        const findJobClass = job => job.name === jobClass 
        const selectedJob = jobClassOptions.find( findJobClass );
        return selectedJob ? selectedJob.icon : "fad fa-utensils";
      },

      storedProfiles: {
        get() {
          const storedProfiles = localStorage.getItem("profiles");
          return storedProfiles ? JSON.parse(storedProfiles) : [];
        },
        set(storedProfiles) {
          // Save the updated profiles array back to local storage
          localStorage.setItem("profiles", JSON.stringify(storedProfiles));
        },
      },
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
        const { fullName, favoriteThing, favoriteFood, jobClass, paddedIndex } =
          this;

        const newProfile = new User({
          id: this.storedProfiles.length,
          name: { fullName },
          favoriteThing,
          favoriteFood,
          jobClass,
          avatar: `${paddedIndex}-gamer`,
        });

        // Create a new profile object
        this.storedProfiles.push(newProfile);
        this.setProfiles(this.storedProfiles);

        this.clearForm();
        this.closeModal();
        this.$emit("add-profile", newProfile);
      },
      // Clear the form data
      clearForm() {
        this.fullName = "";
        this.favoriteThing = "";
        this.favoriteFood = "";
        this.jobClass = "";
        this.avatarIndex = 1;
      },
      setProfiles(profiles) {
        localStorage.setItem("profiles", JSON.stringify(profiles));
      },
      previousAvatar() {
        if (this.avatarIndex > 1) {
          this.avatarIndex--;
        }
      },
      nextAvatar() {
        if (this.avatarIndex < this.maxAvatarIndex) {
          this.avatarIndex++;
        }
      },
      unlockJobClass(level) {
        if (level >= 10) {
          this.jobClassOptions.push({
            name: "Red Mage",
            icon: "fad fa-hat-wizard",
          });
        }
        if (level >= 20) {
          this.jobClassOptions.push({
            name: "White Mage",
            icon: "fad fa-hat-wizard",
          });
        }
        // Add more job classes as needed
      },
    },
    setup() {
      return {
        add,
        arrowBack,
        arrowForward,
      };
    },
  });
</script>

<style lang="scss">
  ion-modal {
    .img-avatar {
      width: 100px;
      height: 100px;
      border-radius: 50%;
      flex-grow: 1;
      margin: 1em;
    }
    ion-input {
      text-align: right;
    }
  }
</style>

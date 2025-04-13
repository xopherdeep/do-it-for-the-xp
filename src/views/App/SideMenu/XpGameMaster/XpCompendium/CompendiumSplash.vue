<template>
  <ion-page class="compendium-splash">
    <!-- <ion-header>
      <ion-toolbar>
        <ion-title>Game Master Compendium</ion-title>
      </ion-toolbar>
    </ion-header> -->
    <ion-content :fullscreen="true">
      <div class="splash-banner">
        <h1>Game Master Compendium</h1>
        <p>Configure the core elements of your XP system.</p>
      </div>

      <!-- Point System Overview -->
      <ion-grid class="point-cards-grid">
        <ion-row class="ion-justify-content-center">
          <ion-col size="12" size-md="4">
            <ion-card class="point-card xp-card">
              <ion-card-header class="ion-text-center">
                <div class="point-icon-container xp-color">
                  <i class="fad fa-hand-holding-seedling fa-2x"></i>
                </div>
                <ion-card-title>Experience (XP)</ion-card-title>
              </ion-card-header>
              <ion-card-content class="ion-text-center">
                Awarded for completing Quests. Drives player level progression.
              </ion-card-content>
            </ion-card>
          </ion-col>
          <ion-col size="12" size-md="4">
            <ion-card class="point-card ap-card">
              <ion-card-header class="ion-text-center">
                <div class="point-icon-container ap-color">
                  <i class="fad fa-hand-holding-magic fa-2x"></i>
                </div>
                <ion-card-title>Ability Points (AP)</ion-card-title>
              </ion-card-header>
              <ion-card-content class="ion-text-center">
                Unlocks special Abilities. Earned over time, may expire ("use it or lose it").
              </ion-card-content>
            </ion-card>
          </ion-col>
          <ion-col size="12" size-md="4">
            <ion-card class="point-card gp-card">
              <ion-card-header class="ion-text-center">
                <div class="point-icon-container gp-color">
                  <i class="fad fa-hand-holding-usd fa-2x"></i>
                </div>
                <ion-card-title>Gold Points (GP)</ion-card-title>
              </ion-card-header>
              <ion-card-content class="ion-text-center">
                In-game currency. Used to purchase items from Shops. Can be earned, spent, and saved.
              </ion-card-content>
            </ion-card>
          </ion-col>
        </ion-row>
      </ion-grid>

      <div class="flow-chart-container">
        <div class="section-title">
          <div class="line"></div>
          <h2>Game Elements</h2>
          <div class="line"></div>
        </div>

        <div class="flow-chart">
          <!-- Task Lists -->
          <div class="flow-item">
            <ion-card button @click="navigateTo('/game-master/compendium/bestiary')" class="flow-card">
              <i class="fad fa-hand-holding-heart card-bg-icon"></i>
              <ion-card-header>
                <ion-card-title>
                  <i class="fad fa-hand-holding-heart"></i> Task Lists
                </ion-card-title>
              </ion-card-header>
              <ion-card-content>
                Create and organize task-lists as "Beasts". Attach them to Quests.
              </ion-card-content>
            </ion-card>
            <div class="connector">
              <i class="fas fa-arrow-down"></i> <!-- Using solid arrow -->
            </div>
          </div>

          <!-- Quests -->
          <div class="flow-item">
            <ion-card button @click="navigateTo('/game-master/compendium/achievements')" class="flow-card">
              <i class="fad fa-hand-holding-seedling card-bg-icon"></i>
              <ion-card-header>
                <ion-card-title>
                  <i class="fad fa-hand-holding-seedling"></i> Quests (XP)
                </ion-card-title>
              </ion-card-header>
              <ion-card-content>
                Create quests for players to complete and earn XP. Define difficulty, requirements, and rewards.
              </ion-card-content>
            </ion-card>
             <!-- Connector removed, handled by layout -->
          </div>

          <!-- Rewards Row (Abilities & Shops side-by-side) -->
          <div class="flow-split-items">
            <!-- Abilities -->
            <div class="flow-split-item">
               <div class="connector vertical-connector"> <!-- Vertical connector above -->
                 <i class="fas fa-arrow-down"></i>
               </div>
              <ion-card button @click="navigateTo('/game-master/compendium/abilities')" class="flow-card">
                <i class="fad fa-hand-holding-magic card-bg-icon"></i>
                <ion-card-header>
                  <ion-card-title>
                    <i class="fad fa-hand-holding-magic"></i> Abilities (AP)
                  </ion-card-title>
                </ion-card-header>
                <ion-card-content>
                  Define abilities players unlock with AP.
                </ion-card-content>
              </ion-card>
               <div class="connector vertical-connector"> <!-- Vertical connector below -->
                 <i class="fas fa-arrow-down"></i>
               </div>
            </div>

            <!-- Shops -->
            <div class="flow-split-item">
               <div class="connector vertical-connector"> <!-- Vertical connector above -->
                 <i class="fas fa-arrow-down"></i>
               </div>
              <ion-card button @click="navigateTo('/game-master/compendium/accessories')" class="flow-card">
                <i class="fad fa-hand-holding-usd card-bg-icon"></i>
                <ion-card-header>
                  <ion-card-title>
                    <i class="fad fa-hand-holding-usd"></i> Shops (GP)
                  </ion-card-title>
                </ion-card-header>
                <ion-card-content>
                  Create items players purchase with GP.
                </ion-card-content>
              </ion-card>
               <div class="connector vertical-connector"> <!-- Vertical connector below -->
                 <i class="fas fa-arrow-down"></i>
               </div>
            </div>
          </div>

           <!-- Connector removed, handled by layout -->

          <!-- Temples -->
          <div class="flow-item temples-item"> <!-- Added class for specific styling -->
            <ion-card button @click="navigateTo('/game-master/compendium/temples')" class="flow-card">
              <i class="fad fa-hand-holding-water card-bg-icon"></i>
              <ion-card-header>
                <ion-card-title>
                  <i class="fad fa-hand-holding-water"></i> Temples
                </ion-card-title>
              </ion-card-header>
              <ion-card-content>
                Configure temples where players can undertake special quests and challenges.
              </ion-card-content>
            </ion-card>
          </div>
        </div>
        <!-- Removed Get Started Button -->
      </div>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import ionic from "@/mixins/ionic";

export default defineComponent({
  name: "compendium-splash",
  mixins: [ionic],
  methods: {
    navigateTo(path) {
      this.$router.push(path);
    }
  }
});
</script>

<style scoped>
/* Define point colors */
:host {
  --xp-color: var(--ion-color-success);
  --ap-color: var(--ion-color-tertiary);
  --gp-color: var(--ion-color-warning);
  --flow-connector-color: var(--ion-color-medium-shade);
}

ion-content {
  --background: var(--ion-color-light);
}

/* Banner styling */
.splash-banner {
  background: linear-gradient(135deg, var(--ion-color-primary-shade), var(--ion-color-primary));
  color: var(--ion-color-primary-contrast);
  padding: 1.5rem 1rem;
  text-align: center;
  border-bottom-left-radius: 20px;
  border-bottom-right-radius: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 1.5rem; /* Reduced margin */
}

.splash-banner h1 {
  font-size: 1.8rem; /* Slightly smaller */
  margin-bottom: 0.25rem;
  font-weight: 600; /* Adjusted weight */
}
.splash-banner p {
  font-size: 0.95rem;
  opacity: 0.9;
}


/* Point cards grid */
.point-cards-grid {
  padding: 0 0.5rem; /* Reduced padding */
  margin-bottom: 2rem; /* Reduced margin */
}

.point-card {
  --background: #ffffff; /* Ensure white background */
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
  margin: 0.5rem 0; /* Add vertical margin */
  height: 100%; /* Make cards in a row equal height */
  display: flex;
  flex-direction: column;
}

.point-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.12);
}

.point-card ion-card-header {
  padding-bottom: 0.5rem;
}

.point-icon-container {
  margin-bottom: 0.75rem;
  display: inline-block; /* Center icon properly */
}

/* Assign specific colors to icons */
.xp-color { color: var(--xp-color); }
.ap-color { color: var(--ap-color); }
.gp-color { color: var(--gp-color); }


.point-card ion-card-title {
  font-size: 1.1rem; /* Adjusted size */
  font-weight: 600;
  margin-top: 0;
}

.point-card ion-card-content {
  font-size: 0.9rem;
  color: var(--ion-color-medium-shade);
  flex-grow: 1; /* Allow content to push footer down if needed */
  padding-top: 0;
}


/* Flow chart section */
.flow-chart-container {
  padding: 0 1rem 2rem 1rem; /* Add bottom padding */
}

.section-title {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1.5rem; /* Reduced margin */
}

.section-title h2 {
  margin: 0 1rem;
  color: var(--ion-color-dark); /* Darker color for better contrast */
  font-size: 1.4rem; /* Adjusted size */
  font-weight: 600;
}

.section-title .line {
  height: 1px;
  background-color: var(--ion-color-medium-tint); /* Lighter line */
  flex-grow: 1;
  max-width: 80px; /* Shorter line */
}

.flow-chart {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0; /* Remove gap, handled by connectors */
}

.flow-item {
  width: 100%;
  max-width: 500px; /* Slightly narrower max-width */
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 0; /* Remove margin, handled by connectors */
}

.flow-card {
  width: 100%;
  border-radius: 10px; /* Slightly smaller radius */
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.07);
  transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
  position: relative;
  overflow: hidden;
  z-index: 1;
  --background: #ffffff;
  margin: 0; /* Remove default card margin */
}

.card-bg-icon {
  position: absolute;
  right: -10px; /* Adjust position */
  bottom: -10px; /* Adjust position */
  font-size: 5rem; /* Slightly smaller */
  opacity: 0.04; /* Even more subtle */
  z-index: -1;
  color: var(--ion-color-medium); /* Neutral color */
}

.flow-card:hover {
  transform: translateY(-3px); /* Subtle hover */
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.1);
}

.flow-card ion-card-header {
  padding-bottom: 0.5rem;
}
.flow-card ion-card-title {
  font-size: 1.15rem;
  font-weight: 600;
  display: flex;
  align-items: center;
}
.flow-card ion-card-title i {
  margin-right: 0.5rem;
  font-size: 1.1em; /* Slightly larger icon in title */
  width: 20px; /* Ensure alignment */
  text-align: center;
}
.flow-card ion-card-content {
  font-size: 0.9rem;
  padding-top: 0;
  color: var(--ion-color-medium-shade);
}


.connector {
  height: 35px; /* Reduced height */
  display: flex;
  justify-content: center;
  align-items: center;
  color: var(--flow-connector-color);
  font-size: 1.2rem; /* Smaller icon */
  width: 100%;
}

.flow-split-items {
  display: flex;
  flex-wrap: nowrap; /* Prevent wrapping on medium screens */
  justify-content: center;
  gap: 1.5rem; /* Increased gap for clarity */
  width: 100%;
  max-width: 500px; /* Match flow-item */
  align-items: stretch; /* Align items vertically */
  position: relative; /* For pseudo-element connector */
  margin: 0; /* Remove margin */
}

/* Horizontal line connecting the split items (visual only) */
.flow-split-items::before {
  content: '';
  position: absolute;
  top: -18px; /* Position above the cards, aligned with the bottom of the connector */
  left: 25%; /* Start approx from center of left item */
  right: 25%; /* End approx at center of right item */
  height: 2px;
  background-color: var(--flow-connector-color);
  z-index: 0;
}


.flow-split-item {
  flex: 1 1 0; /* Allow equal shrinking/growing */
  max-width: calc(50% - 0.75rem); /* Adjust based on gap */
  display: flex;
  flex-direction: column;
  align-items: center;
}

.vertical-connector {
  height: 35px;
  display: flex;
  justify-content: center;
  align-items: center;
  color: var(--flow-connector-color);
  font-size: 1.2rem;
}

/* Ensure the Temples item aligns correctly after the split */
.temples-item {
  margin-top: 0; /* Remove top margin if any */
}


/* Media queries for responsive design */
@media (max-width: 767px) { /* Target mobile devices */
  .point-cards-grid ion-col {
     /* Ensure full width on small screens */
     flex: 0 0 100%;
     max-width: 100%;
  }
  .point-card {
    margin-bottom: 1rem; /* Add space between stacked cards */
  }

  .flow-split-items {
    flex-wrap: wrap; /* Allow wrapping on small screens */
    gap: 0; /* Remove gap when wrapped */
    max-width: 100%; /* Allow full width */
  }
  .flow-split-items::before {
    display: none; /* Hide horizontal connector line on mobile */
  }

  .flow-split-item {
    max-width: 100%; /* Full width when wrapped */
    flex-basis: 100%;
  }
  /* Add connector between wrapped split items */
  .flow-split-item:first-child .vertical-connector:last-of-type {
     display: flex; /* Show connector below first item when wrapped */
  }
   .flow-split-item:last-child .vertical-connector:first-of-type {
     display: none; /* Hide connector above second item when wrapped */
  }

}

@media (min-width: 768px) { /* Styles for medium screens and up */
   /* Hide connectors between split items when side-by-side */
   .flow-split-item .vertical-connector:last-of-type {
     display: none;
   }
    /* Ensure connector above second item is shown */
   .flow-split-item:last-child .vertical-connector:first-of-type {
     display: flex;
   }
}

</style>

<template>
  <ion-page class="compendium-splash">
    <!-- <ion-header>
      <ion-toolbar>
        <ion-title>Game Master Compendium</ion-title>
      </ion-toolbar>
    </ion-header> -->
    <ion-content>
      <div class="splash-banner">
        <h1>Setup XP</h1>
        <p>Create an immersive experience through connected game elements.
          <br />
          Earn XP, AP, and GP to unlock abilities, purchase items, and progress in your game.
        </p>
      </div>

      <!-- Point System Cards with visual improvements -->
      <div class="point-cards-container">
        <ion-card class="point-card xp-card" >
          <div class="point-icon-container xp-bg">
            <i class="fad fa-hand-holding-seedling"></i>
          </div>
          <ion-card-header>
            <ion-card-title>Experience Points</ion-card-title>
          </ion-card-header>
          <ion-card-content>
              XP represents time and effort spent on tasks. 
              Players earn XP by completing quests, which leads to level progression.
          </ion-card-content>
        </ion-card>

        <ion-card class="point-card ap-card" >
          <div class="point-icon-container ap-bg">
            <i class="fad fa-hand-holding-magic"></i>
          </div>
          <ion-card-header>
            <ion-card-title>Ability Points</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <p>AP unlocks special privileges and abilities based on how much is earned in specific timeframes.</p>
            <p>AP is a "use it or lose it" currency that expires after a set time.</p>
          </ion-card-content>
        </ion-card>

        <ion-card class="point-card gp-card" >
          <div class="point-icon-container gp-bg">
            <i class="fad fa-hand-holding-usd"></i>
          </div>
          <ion-card-header>
            <ion-card-title>Gold Points</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <p>GP is the monetary value of the system. Players can earn, spend, and save GP.</p>
            <p>Players deposit GP into savings and make withdrawals to their wallet.</p>
          </ion-card-content>
        </ion-card>
      </div>

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
                Create and organize task-lists as "Beasts" in your game world. These task-lists can be attached to quests.
              </ion-card-content>
            </ion-card>
            <div class="connector">
              <i class="fad fa-arrow-down"></i>
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
                Create quests for players to complete and earn XP. Set difficulty levels, requirements, and rewards.
              </ion-card-content>
            </ion-card>
            <div class="connector fork">
              <i class="fad fa-arrows-split-up-and-left"></i>
            </div>
          </div>

          <!-- Rewards Row -->
          <div class="flow-split-items">
            <!-- Abilities -->
            <div class="flow-split-item">
              <ion-card button @click="navigateTo('/game-master/compendium/abilities')" class="flow-card">
                <i class="fad fa-hand-holding-magic card-bg-icon"></i>
                <ion-card-header>
                  <ion-card-title>
                    <i class="fad fa-hand-holding-magic"></i> Abilities (AP)
                  </ion-card-title>
                </ion-card-header>
                <ion-card-content>
                  Define abilities that players can unlock with AP (Ability Points).
                </ion-card-content>
              </ion-card>
            </div>

            <!-- Shops -->
            <div class="flow-split-item">
              <ion-card button @click="navigateTo('/game-master/compendium/accessories')" class="flow-card">
                <i class="fad fa-hand-holding-usd card-bg-icon"></i>
                <ion-card-header>
                  <ion-card-title>
                    <i class="fad fa-hand-holding-usd"></i> Shops (GP)
                  </ion-card-title>
                </ion-card-header>
                <ion-card-content>
                  Create items that players can purchase with GP (Game Points).
                </ion-card-content>
              </ion-card>
            </div>
          </div>

          <div class="connector merge">
            <i class="fad fa-arrows-to-dot"></i>
          </div>

          <!-- Temples -->
          <div class="flow-item">
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

        <div class="get-started-container">
          <ion-button size="large" @click="navigateTo('/game-master/compendium/achievements')" class="get-started-btn">
            <i class="fad fa-gamepad-modern"></i>
            Get Started
          </ion-button>
        </div>
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
:host {
  --xp-color: var(--ion-color-success);
  --ap-color: var(--ion-color-tertiary);
  --gp-color: var(--ion-color-warning);
}

/* Banner styling */
.splash-banner {
  background: linear-gradient(135deg, #1a237e, #283593);
  color: white;
  padding: 2rem 1rem;
  text-align: center;
  margin-bottom: 2rem;
  border-bottom-left-radius: 30% 5%;
  border-bottom-right-radius: 30% 5%;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.splash-banner h1 {
  font-size: 2rem;
  margin-bottom: 0.5rem;
  font-weight: bold;
}

/* Point cards container */
.point-cards-container {
  display: flex;
  justify-content: center;
  gap: 1rem;
  padding: 0 1rem;
  margin-bottom: 3rem;
}

.point-card {
  flex: 1 1 300px;
  max-width: 33%;
  margin: 0;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s, box-shadow 0.3s;
  position: relative;
}

.point-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
}

.point-icon-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 80px;
  font-size: 2.5rem;
  color: white;
}

.xp-bg {
  background: linear-gradient(135deg, var(--xp-color), #4caf50);
}

.ap-bg {
  background: linear-gradient(135deg, var(--ap-color), #9c27b0);
}

.gp-bg {
  background: linear-gradient(135deg, var(--gp-color), #ff9800);
}

.point-card ion-card-title {
  font-size: 1.3rem;
  font-weight: bold;
  margin-top: 0.5rem;
}

.quick-guide {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1rem;
}

.guide-item {
  background-color: rgba(0, 0, 0, 0.05);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.9rem;
  font-weight: 500;
}

/* Flow chart section */
.flow-chart-container {
  padding: 0 1rem;
}

.section-title {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 2rem;
}

.section-title h2 {
  margin: 0 1rem;
  color: var(--ion-color-medium);
  font-size: 1.5rem;
  font-weight: 600;
}

.section-title .line {
  height: 1px;
  background-color: var(--ion-color-medium);
  flex-grow: 1;
  max-width: 100px;
}

.flow-chart {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.flow-item {
  width: 100%;
  max-width: 550px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.flow-card {
  width: 100%;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transition: transform 0.3s, box-shadow 0.3s;
  position: relative;
  overflow: hidden;
  z-index: 1;
}

.card-bg-icon {
  position: absolute;
  right: -15px;
  bottom: -15px;
  font-size: 6rem;
  opacity: 0.05;
  z-index: -1;
}

.flow-card:hover {
  transform: translateY(-3px) scale(1.02);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.12);
}

.connector {
  height: 40px;
  display: flex;
  justify-content: center;
  align-items: center;
  color: var(--ion-color-medium);
  font-size: 1.5rem;
}

.flow-split-items {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 1rem;
  width: 100%;
  max-width: 550px;
}

.flow-split-item {
  flex: 1 1 250px;
  max-width: 250px;
}

.connector.fork, .connector.merge {
  font-size: 2rem;
  height: 60px;
}

.get-started-container {
  margin: 3rem 0;
  display: flex;
  justify-content: center;
}

.get-started-btn {
  --border-radius: 50px;
  --padding-start: 2rem;
  --padding-end: 2rem;
  font-weight: bold;
  font-size: 1.1rem;
  height: 3.5rem;
}

.get-started-btn i {
  margin-right: 0.5rem;
}

/* Media queries for responsive design */
@media (max-width: 768px) {
  .point-cards-container {
    flex-direction: column;
    align-items: center;
  }
  
  .point-card {
    max-width: 100%;
  }
  
  .flow-split-item {
    max-width: 100%;
  }
}
</style>

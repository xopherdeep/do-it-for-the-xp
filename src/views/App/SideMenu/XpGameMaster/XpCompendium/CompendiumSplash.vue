<template>
  <ion-page class="compendium-splash">
    <ion-header>
      <ion-toolbar>
        <ion-title>Game Master Compendium</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div class="splash-container">
        <h1>Welcome to the Compendium</h1>
        <p>Your central hub for managing your game elements</p>
        
        
        <ion-card class="compendium-card">
          <ion-card-header>
            <ion-card-title>
              <i class="fad fa-book-spells icon-spacing"></i> Abilities (AP)
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            Define privileges and abilities that players can unlock and purchase with AP (Ability Points).
            These represent special permissions or skills players can earn.
          </ion-card-content>
        </ion-card>
        
        <ion-card class="compendium-card">
          <ion-card-header>
            <ion-card-title>
              <i class="fad fa-paw-claws icon-spacing"></i> Bestiary
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            Create and organize task-lists as "Beasts" in your game world. Beasts are essentially task-lists 
            that can be attached to quests. They provide a way to group related tasks together for more 
            complex challenges.
          </ion-card-content>
        </ion-card>
        
        
        <ion-card class="compendium-card">
          <ion-card-header>
            <ion-card-title>
              <i class="fad fa-staff quest icon-spacing"></i> Quests (XP)
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            Create and manage quests for players to complete and earn XP. Quests can be simple individual tasks, 
            can have beasts (task-lists) attached to them, or can be organized as quest chains that link to other quests.
            Set difficulty levels, requirements, and rewards to motivate your players.
          </ion-card-content>
        </ion-card>

        <ion-card class="compendium-card">
          <ion-card-header>
            <ion-card-title>
              <i class="fad fa-store icon-spacing"></i> Shops (GP)
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            Create material rewards and items that players can purchase with GP (Game Points).
            These can be physical rewards, special privileges, or other tangible benefits.
          </ion-card-content>
        </ion-card>
        
        <ion-card class="compendium-card">
          <ion-card-header>
            <ion-card-title>
              <i class="fad fa-place-of-worship icon-spacing"></i> Temples
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            Configure temples and sacred locations throughout the game world where players can undertake special quests and challenges.
          </ion-card-content>
        </ion-card>
        
        <div class="start-button">
          <ion-button router-link="/game-master/compendium/achievements">Get Started</ion-button>
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
});
</script>

<style scoped>
.splash-container {
  padding: 1rem;
  max-width: 800px;
  margin: 0 auto;
  text-align: center;
}

ion-card {
  margin-bottom: 1.5rem;
  text-align: left;
  @apply pt-6;
}

.compendium-card ion-card-header {
  padding-bottom: 0.5rem;
}

.compendium-card ion-card-title {
  font-size: 1.25rem;
  display: flex;
  align-items: center;
}

.icon-spacing {
  margin-right: 0.5rem;
  font-size: 1.3rem;
}

.compendium-card ion-card-content {
  padding-top: 0.5rem;
  line-height: 1.4;
}

.start-button {
  margin-top: 2rem;
}

@media (max-width: 480px) {
  .compendium-card ion-card-title {
    font-size: 1.1rem;
  }
  
  .icon-spacing {
    margin-right: 0.3rem;
  }
}
</style>

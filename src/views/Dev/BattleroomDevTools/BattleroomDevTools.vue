<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Battleroom Dev Tools</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="toggleControls">
            {{ showControls ? 'Hide Controls' : 'Show Controls' }}
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <!-- Battle Room Preview -->
      <div class="battleroom-container">
        <BattleGround ref="battleground" />
      </div>

      <!-- Dev Controls Overlay -->
      <ion-card v-if="showControls" class="dev-controls">
        <ion-card-header>
          <ion-card-title>Development Controls</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-list>
            <ion-item>
              <ion-label>Background Theme</ion-label>
              <ion-select v-model="selectedBackground" @ionChange="changeBackground">
                <ion-select-option v-for="(bg, index) in backgrounds" :key="index" :value="index">
                  {{ bg.name }}
                </ion-select-option>
              </ion-select>
            </ion-item>
            
            <ion-item>
              <ion-label>Enemy Type</ion-label>
              <ion-select v-model="selectedEnemyType" @ionChange="changeEnemyType">
                <ion-select-option value="basic">Basic</ion-select-option>
                <ion-select-option value="miniboss">Mini Boss</ion-select-option>
                <ion-select-option value="boss">Boss</ion-select-option>
              </ion-select>
            </ion-item>
            
            <ion-item>
              <ion-label>Battle State</ion-label>
              <ion-toggle v-model="battleActive" @ionChange="toggleBattleState"></ion-toggle>
            </ion-item>

            <ion-item>
              <ion-button expand="block" @click="triggerBattle">
                Trigger Battle
              </ion-button>
            </ion-item>
          </ion-list>
          
          <!-- Battle State Info -->
          <ion-card>
            <ion-card-header>
              <ion-card-subtitle>Battle State</ion-card-subtitle>
            </ion-card-header>
            <ion-card-content>
              <pre>{{ battleStateJson }}</pre>
            </ion-card-content>
          </ion-card>
        </ion-card-content>
      </ion-card>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted } from 'vue';
import { useStore } from 'vuex';
import BattleGround from '@/views/Console/MyPortal/HomeTown/BattleGround/BattleGround.vue';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, 
         IonButton, IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent,
         IonList, IonItem, IonLabel, IonSelect, IonSelectOption, IonToggle } from '@ionic/vue';

// Define interface for the BattleGround component
interface BattleGroundInstance {
  bg1: number;
  bg2: number;
  enterBattle: () => void;
}

export default defineComponent({
  name: 'BattleroomDevTools',
  components: {
    BattleGround,
    IonPage,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonButton,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonList,
    IonItem,
    IonLabel,
    IonSelect,
    IonSelectOption,
    IonToggle
  },
  setup() {
    const store = useStore();
    // Properly type the battleground ref
    const battleground = ref<BattleGroundInstance | null>(null);
    const showControls = ref(true);
    const selectedBackground = ref(0);
    const selectedEnemyType = ref('basic');
    const battleActive = ref(false);

    // Sample background options
    const backgrounds = [
      { name: 'Forest', bg1: 0, bg2: 0 },
      { name: 'Cave', bg1: 1, bg2: 1 },
      { name: 'Mountain', bg1: 2, bg2: 2 },
      { name: 'Desert', bg1: 3, bg2: 0 },
      { name: 'Castle', bg1: 4, bg2: 1 }
    ];

    const battleState = computed(() => store.getters.battleState);
    const battleStateJson = computed(() => JSON.stringify(battleState.value, null, 2));

    // Toggle dev controls panel
    const toggleControls = () => {
      showControls.value = !showControls.value;
    };

    // Change background of the battleroom
    const changeBackground = () => {
      const bg = backgrounds[selectedBackground.value];
      if (battleground.value) {
        battleground.value.bg1 = bg.bg1;
        battleground.value.bg2 = bg.bg2;
        battleground.value.enterBattle();
      }
    };

    // Change enemy type
    const changeEnemyType = () => {
      // In a real implementation, this would update the store or component state
      console.log(`Enemy type changed to: ${selectedEnemyType.value}`);
      
      // You could dispatch an action to update enemy type
      // store.dispatch('setEnemyType', selectedEnemyType.value);
    };

    // Toggle battle state
    const toggleBattleState = () => {
      if (battleActive.value) {
        store.dispatch('enterBattle');
      } else {
        store.dispatch('leaveBattle');
      }
    };

    // Trigger a battle
    const triggerBattle = () => {
      store.commit('ACTIVATE_BATTLE');
      store.dispatch('enterBattle');
      battleActive.value = true;
    };

    onMounted(() => {
      // Initialize battleroom with default settings
      setTimeout(() => {
        changeBackground();
      }, 500);
    });

    return {
      battleground,
      showControls,
      toggleControls,
      selectedBackground,
      selectedEnemyType,
      battleActive,
      backgrounds,
      battleStateJson,
      changeBackground,
      changeEnemyType,
      toggleBattleState,
      triggerBattle
    };
  }
});
</script>

<style scoped>
.battleroom-container {
  width: 100%;
  height: 60vh;
  position: relative;
  overflow: hidden;
}

.dev-controls {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  max-height: 40vh;
  overflow-y: auto;
  z-index: 1000;
  background: rgba(var(--ion-background-color-rgb), 0.9);
}

pre {
  white-space: pre-wrap;
  word-break: break-all;
  font-size: 12px;
  max-height: 150px;
  overflow-y: auto;
}
</style>
<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/dev"></ion-back-button>
        </ion-buttons>
        <ion-title>Sound FX Dev Tools</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <ion-card>
        <ion-card-header>
          <ion-card-title>Sound FX Testing Tool</ion-card-title>
          <ion-card-subtitle>Test all audio components in the game</ion-card-subtitle>
        </ion-card-header>
        <ion-card-content>
          This tool allows you to preview and test all sound effects and music in the game.
        </ion-card-content>
      </ion-card>

      <!-- Theme Selector -->
      <ion-card>
        <ion-card-header>
          <ion-card-title>Sound Theme Settings</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-item>
            <ion-label>UI Sound Theme</ion-label>
            <ion-select v-model="selectedUITheme" @ionChange="changeUITheme">
              <ion-select-option value="nintendo">Nintendo</ion-select-option>
              <ion-select-option value="sony">PlayStation</ion-select-option>
              <ion-select-option value="custom">Custom</ion-select-option>
            </ion-select>
          </ion-item>
          <ion-item>
            <ion-label>RPG Sound Theme</ion-label>
            <ion-select v-model="selectedRPGTheme" @ionChange="changeRPGTheme">
              <ion-select-option value="earthbound">Earthbound</ion-select-option>
              <ion-select-option value="chronoTrigger">Chrono Trigger</ion-select-option>
              <ion-select-option value="finalFantasy">Final Fantasy</ion-select-option>
            </ion-select>
          </ion-item>
        </ion-card-content>
      </ion-card>

      <!-- Global Volume Controls -->
      <ion-card>
        <ion-card-header>
          <ion-card-title>Volume Controls</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-item>
            <ion-label>Music Volume</ion-label>
            <ion-range
              :min="0"
              :max="100"
              :value="musicVolume"
              @ionChange="changeMusicVolume"
              color="primary"
            >
              <ion-icon slot="start" :icon="volumeLow"></ion-icon>
              <ion-icon slot="end" :icon="volumeHigh"></ion-icon>
            </ion-range>
          </ion-item>
          <ion-item>
            <ion-label>Sound FX Volume</ion-label>
            <ion-range
              :min="0"
              :max="100"
              :value="fxVolume"
              @ionChange="changeFXVolume"
              color="primary"
            >
              <ion-icon slot="start" :icon="volumeLow"></ion-icon>
              <ion-icon slot="end" :icon="volumeHigh"></ion-icon>
            </ion-range>
          </ion-item>
        </ion-card-content>
      </ion-card>

      <!-- UI Sound Effects -->
      <ion-card>
        <ion-card-header>
          <ion-card-title>UI Sound Effects</ion-card-title>
        </ion-card-header>
        <ion-list>
          <ion-item v-for="(sound, key) in uiSoundEffects" :key="key" button @click="playUISound(key)">
            <ion-icon :icon="playOutline" slot="start"></ion-icon>
            <ion-label>{{ formatSoundName(key) }}</ion-label>
          </ion-item>
        </ion-list>
      </ion-card>
      
      <!-- RPG Sound Effects -->
      <ion-card>
        <ion-card-header>
          <ion-card-title>RPG Sound Effects</ion-card-title>
        </ion-card-header>
        <ion-list>
          <ion-item v-for="(sound, key) in rpgSoundEffects" :key="key" button @click="playRPGSound(key)">
            <ion-icon :icon="playOutline" slot="start"></ion-icon>
            <ion-label>{{ formatSoundName(key) }}</ion-label>
          </ion-item>
        </ion-list>
      </ion-card>

      <!-- Music Player -->
      <ion-card>
        <ion-card-header>
          <ion-card-title>Music Tracks</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-accordion-group>
            <ion-accordion v-for="(tracks, category) in musicTracks" :key="category" :value="category">
              <ion-item slot="header">
                <ion-label>{{ formatSoundName(category) }}</ion-label>
              </ion-item>
              <ion-list slot="content">
                <ion-item v-for="(track, index) in tracks" :key="index" button @click="playMusicTrack(category, index)">
                  <ion-icon :icon="playCircleOutline" slot="start"></ion-icon>
                  <ion-label>
                    <h2>Track {{ index + 1 }}</h2>
                    <p>{{ getTrackName(track) }}</p>
                  </ion-label>
                  <ion-icon v-if="isCurrentTrack(track)" :icon="musicalNoteOutline" slot="end"></ion-icon>
                </ion-item>
              </ion-list>
            </ion-accordion>
          </ion-accordion-group>

          <!-- Currently Playing Display -->
          <div v-if="currentTrack" class="now-playing">
            <h3>Now Playing</h3>
            <p>{{ formatTrackName(currentTrack) }}</p>
            <ion-button fill="clear" @click="stopCurrentMusic()">
              <ion-icon slot="icon-only" :icon="stopCircleOutline"></ion-icon>
            </ion-button>
          </div>
        </ion-card-content>
      </ion-card>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, onUnmounted } from 'vue';
  import { useGameStore } from '@/lib/store/stores/game';
import { 
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, 
  IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent,
  IonItem, IonLabel, IonList, IonSelect, IonSelectOption,
  IonRange, IonAccordionGroup, IonAccordion, IonButton,
  IonBackButton, IonButtons, IonIcon
} from '@ionic/vue';
import { 
  volumeHighOutline, volumeLowOutline, playOutline, 
  musicalNoteOutline, playCircleOutline, stopCircleOutline 
} from 'ionicons/icons';
import { SoundEffect } from '@/types/fx';
import debug from '@/lib/utils/debug';

// Define types for our component's internal use without modifying global declarations
interface RPGSounds {
  [key: string]: any;
  BGM?: Record<string, string[]>;
}

type FXObject = {
  ui: Record<string, Record<string, SoundEffect>>;
  rpg: Record<string, RPGSounds>;
  theme: {
    ui: string;
    rpg: string;
  };
}

export default defineComponent({
  name: 'SoundFXDevTools',
  components: {
    IonPage, IonHeader, IonToolbar, IonTitle, IonContent, 
    IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent,
    IonItem, IonLabel, IonList, IonSelect, IonSelectOption,
    IonRange, IonAccordionGroup, IonAccordion, IonButton,
    IonBackButton, IonButtons, IonIcon
  },
  setup() {
    const gameStore = useGameStore();
    const selectedUITheme = ref('nintendo');
    const selectedRPGTheme = ref('earthbound');
    const musicVolume = ref(80);
    const fxVolume = ref(70);
    const currentTrack = ref<string | null>(null);
    const audioElement = ref<HTMLAudioElement | null>(null);

    // Get UI and RPG sound effects from the $fx object
    const uiSoundEffects = computed(() => {
      if (!window.$fx?.ui?.[selectedUITheme.value]) return {};
      return window.$fx.ui[selectedUITheme.value];
    });

    const rpgSoundEffects = computed(() => {
      if (!window.$fx?.rpg?.[selectedRPGTheme.value]) return {};
      return window.$fx.rpg[selectedRPGTheme.value];
    });

    // Get music tracks from the $fx object using type assertion
    const musicTracks = computed(() => {
      // Use type assertion to access BGM property
      const fx = window.$fx as unknown as FXObject;
      return fx?.rpg?.[selectedRPGTheme.value]?.BGM || {};
    });

    // Format sound names for display
    const formatSoundName = (name: string) => {
      return name
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .trim();
    };

    // Get track name from URL
    const getTrackName = (track: string) => {
      if (!track) return 'Unknown Track';
      
      // Extract filename from URL
      const urlParts = track.split('/');
      let filename = urlParts[urlParts.length - 1];
      
      // Remove file extension and decode URL encoding
      filename = filename.split('.')[0].replace(/%20/g, ' ');
      
      // Handle numbered tracks from Earthbound - fixed regex to avoid unnecessary escapes
      if (filename.match(/^\d+- *Earthbound *- */i)) {
        return filename.replace(/^\d+- *Earthbound *- */i, '');
      }
      
      return filename;
    };

    // Format track name for display in Now Playing
    const formatTrackName = (trackUrl: string) => {
      return getTrackName(trackUrl);
    };

    // Check if a track is currently playing
    const isCurrentTrack = (track: string) => {
      return currentTrack.value === track;
    };

    // Play UI sound
    const playUISound = (soundName: string) => {
      try {
        const sound = window.$fx?.ui?.[selectedUITheme.value]?.[soundName];
        if (sound) {
          // Reset the sound to start from beginning
          sound.currentTime = 0;
          sound.volume = fxVolume.value / 100;
          sound.play().catch(err => {
            debug.error('Error playing sound:', err);
          });
        }
      } catch (error) {
        debug.error('Error playing UI sound:', error);
      }
    };

    // Play RPG sound
    const playRPGSound = (soundName: string) => {
      try {
        const sound = window.$fx?.rpg?.[selectedRPGTheme.value]?.[soundName];
        if (sound && typeof sound === 'object' && 'play' in sound) {
          // Reset the sound to start from beginning
          sound.currentTime = 0;
          sound.volume = fxVolume.value / 100;
          sound.play().catch(err => {
            debug.error('Error playing sound:', err);
          });
        }
      } catch (error) {
        debug.error('Error playing RPG sound:', error);
      }
    };

    // Play music track using type assertion to access BGM
    const playMusicTrack = (category: string, index: number) => {
      try {
        stopCurrentMusic();
        
        const fx = window.$fx as unknown as FXObject;
        const tracks = fx?.rpg?.[selectedRPGTheme.value]?.BGM?.[category];
        
        if (tracks && tracks[index]) {
          const track = tracks[index];
          currentTrack.value = track;
          
          audioElement.value = new Audio(track);
          audioElement.value.volume = musicVolume.value / 100;
          audioElement.value.loop = true;
          audioElement.value.play().catch(err => {
            debug.error('Error playing music track:', err);
          });
        }
      } catch (error) {
        debug.error('Error playing music track:', error);
      }
    };

    // Stop current music
    const stopCurrentMusic = () => {
      if (audioElement.value) {
        audioElement.value.pause();
        audioElement.value = null;
        currentTrack.value = null;
      }
    };

    // Change UI theme
    const changeUITheme = () => {
      if (window.$fx && window.$fx.theme) {
        // Use type assertion to avoid type error
        const fx = window.$fx as unknown as FXObject;
        fx.theme.ui = selectedUITheme.value;
        
        gameStore.changeSoundFX({
          ui: selectedUITheme.value,
          rpg: selectedRPGTheme.value
        });
      }
    };

    // Change RPG theme
    const changeRPGTheme = () => {
      if (window.$fx && window.$fx.theme) {
        // Use type assertion to avoid type error
        const fx = window.$fx as unknown as FXObject;
        fx.theme.rpg = selectedRPGTheme.value;
        
        gameStore.changeSoundFX({
          ui: selectedUITheme.value,
          rpg: selectedRPGTheme.value
        });
      }
      
      // Stop any playing music when changing themes
      stopCurrentMusic();
    };

    // Change music volume
    const changeMusicVolume = (event: CustomEvent) => {
      musicVolume.value = event.detail.value;
      if (audioElement.value) {
        audioElement.value.volume = musicVolume.value / 100;
      }
    };

    // Change FX volume
    const changeFXVolume = (event: CustomEvent) => {
      fxVolume.value = event.detail.value;
    };

    // Initialize themes from store on mount
    onMounted(() => {
      if (window.$fx?.theme) {
        // Use type assertion and ensure string conversion
        const fx = window.$fx as unknown as FXObject;
        selectedUITheme.value = String(fx.theme.ui);
        selectedRPGTheme.value = String(fx.theme.rpg);
      }
      
      // Ensure the document is marked as having user interaction
      // This prevents browser autoplay restrictions
      document.documentElement.setAttribute('data-user-interacted', 'true');
    });

    // Cleanup on unmount
    onUnmounted(() => {
      stopCurrentMusic();
    });

    return {
      selectedUITheme,
      selectedRPGTheme,
      musicVolume,
      fxVolume,
      uiSoundEffects,
      rpgSoundEffects,
      musicTracks,
      currentTrack,
      formatSoundName,
      getTrackName,
      formatTrackName,
      isCurrentTrack,
      playUISound,
      playRPGSound,
      playMusicTrack,
      stopCurrentMusic,
      changeUITheme,
      changeRPGTheme,
      changeMusicVolume,
      changeFXVolume,
      volumeLow: volumeLowOutline,
      volumeHigh: volumeHighOutline,
      playOutline,
      musicalNoteOutline,
      playCircleOutline,
      stopCircleOutline
    };
  }
});
</script>

<style scoped>
.now-playing {
  margin-top: 16px;
  padding: 12px;
  background-color: rgba(var(--ion-color-primary-rgb), 0.1);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.now-playing h3 {
  margin: 0;
  font-size: 16px;
  font-weight: bold;
}

.now-playing p {
  margin: 0;
  flex-grow: 1;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
  padding: 0 12px;
}
</style>
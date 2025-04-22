<template>
  <ion-content class="audio-settings ion-padding">
    <ion-card>

      <ion-list>
        <ion-list-header>
          <ion-label>Audio Settings</ion-label>
        </ion-list-header>

        <!-- Master Volume -->
        <ion-item>
          <ion-label >Master </ion-label>
          <ion-range
            :value="masterVolume * 100"
            @ionChange="handleMasterVolumeChange($event)"
            :disabled="isMuted"
            min="0"
            max="100"
            color="primary"
          >
            <ion-icon
              slot="start"
              :icon="volumeLowOutline"
            ></ion-icon>
            <ion-icon
              slot="end"
              :icon="volumeHighOutline"
            ></ion-icon>
          </ion-range>
        </ion-item>

        <!-- Music Volume -->
        <ion-item>
          <ion-label>Music </ion-label>
          <ion-range
            :value="musicVolume * 100"
            @ionChange="handleMusicVolumeChange($event)"
            :disabled="isMuted"
            min="0"
            max="100"
            color="secondary"
          >
            <ion-icon
              slot="start"
              :icon="musicalNoteOutline"
            ></ion-icon>
            <ion-icon
              slot="end"
              :icon="musicalNotesOutline"
            ></ion-icon>
          </ion-range>
        </ion-item>

        <!-- SFX Volume -->
        <ion-item>
          <ion-label>Sound FX</ion-label>
          <ion-range
            :value="sfxVolume * 100"
            @ionChange="handleSfxVolumeChange($event)"
            :disabled="isMuted"
            min="0"
            max="100"
            color="tertiary"
          >
            <ion-icon
              slot="start"
              :icon="gameControllerOutline"
            ></ion-icon>
            <ion-icon
              slot="end"
              :icon="sparklesOutline"
            ></ion-icon>
          </ion-range>
        </ion-item>

        <!-- UI Volume -->
        <ion-item>
          <ion-label>UI Sounds</ion-label>
          <ion-range
            :value="uiVolume * 100"
            @ionChange="handleUiVolumeChange($event)"
            :disabled="isMuted"
            min="0"
            max="100"
            color="success"
          >
            <ion-icon
              slot="start"
              :icon="radioButtonOffOutline"
            ></ion-icon>
            <ion-icon
              slot="end"
              :icon="radioButtonOnOutline"
            ></ion-icon>
          </ion-range>
        </ion-item>

        <!-- Mute Toggle -->
        <ion-item>
          <ion-label>Mute All Sound</ion-label>
          <ion-toggle
            :checked="isMuted"
            @ionChange="handleMuteChange($event)"
          ></ion-toggle>
        </ion-item>

        <ion-item-divider>
          <ion-label>Sound Themes</ion-label>
        </ion-item-divider>

        <!-- UI Sound Theme -->
        <ion-item>
          <ion-label>UI Sound Theme</ion-label>
          <ion-select
            :value="currentUITheme"
            @ionChange="handleUIThemeChange($event)"
            interface="popover"
          >
            <ion-select-option value="nintendo">Nintendo</ion-select-option>
            <ion-select-option value="sony">Sony</ion-select-option>
          </ion-select>
        </ion-item>

        <!-- RPG Sound Theme -->
        <ion-item>
          <ion-label>Game Sound Theme</ion-label>
          <ion-select
            :value="currentRPGTheme"
            @ionChange="handleRPGThemeChange($event)"
            interface="popover"
          >
            <ion-select-option value="earthbound">Earthbound</ion-select-option>
            <ion-select-option value="chronoTrigger">Chrono Trigger</ion-select-option>
            <ion-select-option value="finalFantasy">Final Fantasy</ion-select-option>
          </ion-select>
        </ion-item>

        <ion-item-divider>
          <ion-label>Test Sounds</ion-label>
        </ion-item-divider>

        <!-- Test UI Sounds -->
        <ion-item>
          <ion-label>Test UI Sounds</ion-label>
          <ion-button
            size="small"
            fill="clear"
            @click="playUISound('select')"
          >
            <ion-icon
              slot="icon-only"
              :icon="radioButtonOnOutline"
            ></ion-icon>
          </ion-button>
          <ion-button
            size="small"
            fill="clear"
            @click="playUISound('confirm')"
          >
            <ion-icon
              slot="icon-only"
              :icon="checkmarkCircleOutline"
            ></ion-icon>
          </ion-button>
          <ion-button
            size="small"
            fill="clear"
            @click="playUISound('cancel')"
          >
            <ion-icon
              slot="icon-only"
              :icon="closeCircleOutline"
            ></ion-icon>
          </ion-button>
          <ion-button
            size="small"
            fill="clear"
            @click="playUISound('error')"
          >
            <ion-icon
              slot="icon-only"
              :icon="alertCircleOutline"
            ></ion-icon>
          </ion-button>
        </ion-item>

        <!-- Test Game Sounds -->
        <ion-item>
          <ion-label>Test Game Sounds</ion-label>
          <ion-button
            size="small"
            fill="clear"
            @click="playSound('attack')"
          >
            <ion-icon
              slot="icon-only"
              :icon="flashOutline"
            ></ion-icon>
          </ion-button>
          <ion-button
            size="small"
            fill="clear"
            @click="playSound('hit')"
          >
            <ion-icon
              slot="icon-only"
              :icon="handRightOutline"
            ></ion-icon>
          </ion-button>
          <ion-button
            size="small"
            fill="clear"
            @click="playSound('victory')"
          >
            <ion-icon
              slot="icon-only"
              :icon="trophyOutline"
            ></ion-icon>
          </ion-button>
          <ion-button
            size="small"
            fill="clear"
            @click="playSound('levelUp')"
          >
            <ion-icon
              slot="icon-only"
              :icon="arrowUpCircleOutline"
            ></ion-icon>
          </ion-button>
        </ion-item>

        <!-- Test Music -->
        <ion-item>
          <ion-label>Battle Music</ion-label>
          <ion-button
            size="small"
            @click="playMusicCategory('battle', 0)"
          >Play</ion-button>
          <ion-button
            size="small"
            fill="outline"
            @click="stopMusic()"
          >Stop</ion-button>
        </ion-item>

        <ion-item>
          <ion-label>Field Music</ion-label>
          <ion-button
            size="small"
            @click="playMusicCategory('field', 0)"
          >Play</ion-button>
          <ion-button
            size="small"
            fill="outline"
            @click="stopMusic()"
          >Stop</ion-button>
        </ion-item>
      </ion-list>
    </ion-card>
  </ion-content>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useAudio } from '@/hooks/useAudio';
import {
  volumeLowOutline,
  volumeHighOutline,
  musicalNoteOutline,
  musicalNotesOutline,
  gameControllerOutline,
  sparklesOutline,
  radioButtonOffOutline,
  radioButtonOnOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
  alertCircleOutline,
  flashOutline,
  handRightOutline,
  trophyOutline,
  arrowUpCircleOutline
} from 'ionicons/icons';

export default defineComponent({
  name: 'AudioSettings',
  setup() {
    const audio = useAudio();

    // Handle value changes
    const handleMasterVolumeChange = (event: CustomEvent) => {
      audio.setMasterVolume(event.detail.value / 100);
      // Play a UI sound to demonstrate the volume change
      audio.playUISound('select');
    };

    const handleMusicVolumeChange = (event: CustomEvent) => {
      audio.setMusicVolume(event.detail.value / 100);
    };

    const handleSfxVolumeChange = (event: CustomEvent) => {
      audio.setSfxVolume(event.detail.value / 100);
      // Play a game sound to demonstrate the volume change
      audio.playSound('hit');
    };

    const handleUiVolumeChange = (event: CustomEvent) => {
      audio.setUIVolume(event.detail.value / 100);
      // Play a UI sound to demonstrate the volume change
      audio.playUISound('select');
    };

    const handleMuteChange = (event: CustomEvent) => {
      if (event.detail.checked) {
        audio.mute();
      } else {
        audio.unmute();
        // Play a sound to confirm unmute
        audio.playUISound('confirm');
      }
    };

    const handleUIThemeChange = (event: CustomEvent) => {
      audio.setUITheme(event.detail.value);
      // Play a UI sound to demonstrate the theme change
      audio.playUISound('select');
    };

    const handleRPGThemeChange = (event: CustomEvent) => {
      audio.setRPGTheme(event.detail.value);
      // Play a game sound to demonstrate the theme change
      audio.playSound('attack');
    };

    return {
      // State
      masterVolume: audio.masterVolume,
      musicVolume: audio.musicVolume,
      sfxVolume: audio.sfxVolume,
      uiVolume: audio.uiVolume,
      isMuted: audio.isMuted,
      currentUITheme: audio.currentUITheme,
      currentRPGTheme: audio.currentRPGTheme,

      // Methods
      handleMasterVolumeChange,
      handleMusicVolumeChange,
      handleSfxVolumeChange,
      handleUiVolumeChange,
      handleMuteChange,
      handleUIThemeChange,
      handleRPGThemeChange,
      playSound: audio.playSound,
      playUISound: audio.playUISound,
      playMusicCategory: audio.playMusicCategory,
      stopMusic: audio.stopMusic,

      // Icons
      volumeLowOutline,
      volumeHighOutline,
      musicalNoteOutline,
      musicalNotesOutline,
      gameControllerOutline,
      sparklesOutline,
      radioButtonOffOutline,
      radioButtonOnOutline,
      checkmarkCircleOutline,
      closeCircleOutline,
      alertCircleOutline,
      flashOutline,
      handRightOutline,
      trophyOutline,
      arrowUpCircleOutline
    };
  }
});
</script>

<style scoped>
.audio-settings {
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
}
</style>
<template>
  <ion-card class="audio-settings max-w-2xl">
    <ion-list>
      <ion-item-group>
        <ion-item-divider>
          <ion-label>Volume</ion-label>
        </ion-item-divider>

        <ion-item>
          <ion-label>
            <h2>Master</h2>
          </ion-label>
          <ion-range
            :value="masterVolume * 100"
            @ionChange="handleMasterVolumeChange($event)"
            :disabled="isMuted"
            min="0"
            max="100"
            aria-label="Master volume"
          >
            <ion-icon slot="start" :icon="volumeLowOutline"></ion-icon>
            <ion-icon slot="end" :icon="volumeHighOutline"></ion-icon>
          </ion-range>
        </ion-item>

        <ion-item>
          <ion-label>
            <h2>Music</h2>
          </ion-label>
          <ion-range
            :value="musicVolume * 100"
            @ionChange="handleMusicVolumeChange($event)"
            :disabled="isMuted"
            min="0"
            max="100"
            aria-label="Music volume"
          >
            <ion-icon slot="start" :icon="musicalNoteOutline"></ion-icon>
            <ion-icon slot="end" :icon="musicalNotesOutline"></ion-icon>
          </ion-range>
        </ion-item>

        <ion-item>
          <ion-label>
            <h2>Sound FX</h2>
          </ion-label>
          <ion-range
            :value="sfxVolume * 100"
            @ionChange="handleSfxVolumeChange($event)"
            :disabled="isMuted"
            min="0"
            max="100"
            aria-label="Sound effects volume"
          >
            <ion-icon slot="start" :icon="gameControllerOutline"></ion-icon>
            <ion-icon slot="end" :icon="sparklesOutline"></ion-icon>
          </ion-range>
        </ion-item>

        <ion-item>
          <ion-label>
            <h2>Menus</h2>
          </ion-label>
          <ion-range
            :value="uiVolume * 100"
            @ionChange="handleUiVolumeChange($event)"
            :disabled="isMuted"
            min="0"
            max="100"
            aria-label="Menu sounds volume"
          >
            <ion-icon slot="start" :icon="radioButtonOffOutline"></ion-icon>
            <ion-icon slot="end" :icon="radioButtonOnOutline"></ion-icon>
          </ion-range>
        </ion-item>

        <ion-item lines="none">
          <ion-label>
            <h2>Mute everything</h2>
            <p>Silence music and sounds on this device</p>
          </ion-label>
          <ion-toggle
            :checked="isMuted"
            @ionChange="handleMuteChange($event)"
          ></ion-toggle>
        </ion-item>
      </ion-item-group>

      <ion-item-group>
        <ion-item-divider>
          <ion-label>Try a sound</ion-label>
        </ion-item-divider>
        <ion-item lines="none" class="audio-settings__try">
          <ion-label>
            <p>Menu and battle sounds follow the game style picked in Settings, Theme</p>
            <div class="audio-settings__buttons">
              <ion-button
                v-for="sample in samples"
                :key="sample.key"
                size="small"
                @click="playSample(sample.key)"
              >
                <i :class="['fad', sample.icon, 'mr-2']"></i>
                {{ sample.label }}
              </ion-button>
            </div>
          </ion-label>
        </ion-item>
      </ion-item-group>
    </ion-list>
  </ion-card>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useAudio } from '@/hooks/useAudio';
import { play$fx } from '@/assets/fx';
import {
  volumeLowOutline,
  volumeHighOutline,
  musicalNoteOutline,
  musicalNotesOutline,
  gameControllerOutline,
  sparklesOutline,
  radioButtonOffOutline,
  radioButtonOnOutline,
} from 'ionicons/icons';

/** The sounds the Try a sound row plays: the game's own themed sounds (src/assets/fx) */
const SAMPLES = [
  { key: 'select', label: 'Select', icon: 'fa-hand-pointer' },
  { key: 'no', label: 'Cancel', icon: 'fa-times-circle' },
  { key: 'attack', label: 'Attack', icon: 'fa-sword' },
  { key: 'levelUp', label: 'Level up', icon: 'fa-arrow-alt-circle-up' },
];

export default defineComponent({
  name: 'AudioSettings',
  setup() {
    const audio = useAudio();

    // Each slider plays a sound of its own kind so the new level is heard right away
    const handleMasterVolumeChange = (event: CustomEvent) => {
      audio.setMasterVolume(event.detail.value / 100);
      play$fx('select');
    };

    const handleMusicVolumeChange = (event: CustomEvent) => {
      audio.setMusicVolume(event.detail.value / 100);
    };

    const handleSfxVolumeChange = (event: CustomEvent) => {
      audio.setSfxVolume(event.detail.value / 100);
      play$fx('attack');
    };

    const handleUiVolumeChange = (event: CustomEvent) => {
      audio.setUIVolume(event.detail.value / 100);
      play$fx('select');
    };

    const handleMuteChange = (event: CustomEvent) => {
      if (event.detail.checked) {
        audio.mute();
      } else {
        audio.unmute();
        play$fx('yes');
      }
    };

    return {
      masterVolume: audio.masterVolume,
      musicVolume: audio.musicVolume,
      sfxVolume: audio.sfxVolume,
      uiVolume: audio.uiVolume,
      isMuted: audio.isMuted,

      handleMasterVolumeChange,
      handleMusicVolumeChange,
      handleSfxVolumeChange,
      handleUiVolumeChange,
      handleMuteChange,
      samples: SAMPLES,
      playSample: (key: string) => play$fx(key),

      volumeLowOutline,
      volumeHighOutline,
      musicalNoteOutline,
      musicalNotesOutline,
      gameControllerOutline,
      sparklesOutline,
      radioButtonOffOutline,
      radioButtonOnOutline,
    };
  }
});
</script>

<style scoped lang="scss">
.audio-settings__buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}
</style>

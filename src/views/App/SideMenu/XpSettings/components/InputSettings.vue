<template>
  <ion-card class=" max-w-2xl">


    <ion-list>
      <ion-card-title>
        Audio Settings
      </ion-card-title>

      <ion-item>
        <ion-label>
          <h2>
            Background Music</h2>
          <p>Enable music throughout the app</p>
        </ion-label>
        <ion-checkbox
          @ionChange="changeBGMToggle"
          :checked="bgm.is_on"
          color="rpg"
          slot="end"
        ></ion-checkbox>
        <i
          class="fad fa-music fa-2x"
          slot="end"
        ></i>
      </ion-item>

      <ion-item v-if="bgm.is_on">
        <ion-label>Music Volume</ion-label>
        <ion-range
          min="0"
          max="100"
          :value="musicVolume"
          @ionChange="changeMusicVolume"
          color="rpg"
        >
          <ion-icon
            slot="start"
            :icon="volumeLow"
          ></ion-icon>
          <ion-icon
            slot="end"
            :icon="volumeHigh"
          ></ion-icon>
        </ion-range>
      </ion-item>

      <ion-item>
        <i
          class="fad fa-volume fa-lg ion-float-left"
          slot="start"
        ></i>
        <ion-label>
          <h2>Sound Effects</h2>
          <p>Enable sound effects for actions</p>
        </ion-label>
        <ion-checkbox
          v-model="soundEffectsEnabled"
          @ionChange="toggleSoundEffects"
          color="rpg"
        ></ion-checkbox>
      </ion-item>

      <ion-item v-if="soundEffectsEnabled">
        <ion-label>Effects Volume</ion-label>
        <ion-range
          min="0"
          max="100"
          :value="effectsVolume"
          @ionChange="changeEffectsVolume"
          color="rpg"
        >
          <ion-icon
            slot="start"
            :icon="volumeLow"
          ></ion-icon>
          <ion-icon
            slot="end"
            :icon="volumeHigh"
          ></ion-icon>
        </ion-range>
      </ion-item>

      <ion-card-title>
        Theme Settings
      </ion-card-title>

      <ion-item>
        <ion-label>User Interface Sound Theme</ion-label>
        <i
          class="fad fa-tv fa-lg ion-float-left"
          slot="start"
        ></i>
        <ion-select
          @ionChange="changeUISound"
          @click="play$fx"
          :value="$fx.theme.ui"
          placeholder="Select One"
          interface="popover"
        >
          <ion-select-option value="nintendo">Nintendo</ion-select-option>
          <ion-select-option value="sony">Playstation</ion-select-option>
          <ion-select-option value="custom">Custom</ion-select-option>
        </ion-select>
      </ion-item>

      <ion-item @click="play$fx">
        <ion-label>Game Theme</ion-label>
        <i
          class="fad fa-brush fa-lg ion-float-left"
          slot="start"
        ></i>
        <ion-select
          @ionChange="changeRPGSound"
          :value="$fx.theme.rpg"
          ok-text="Okay"
          cancel-text="Dismiss"
          interface="popover"
        >
          <ion-select-option value="earthbound">Down to Earth</ion-select-option>
          <ion-select-option value="chronoTrigger">Timeless Contention</ion-select-option>
          <ion-select-option value="finalFantasy">Last of the Dreams</ion-select-option>
          <ion-select-option value="custom">Custom Theme</ion-select-option>
        </ion-select>
      </ion-item>

      <ion-item>
        <ion-label>
          <h2>Vibration</h2>
          <p>Enable haptic feedback</p>
        </ion-label>
        <ion-checkbox
          v-model="vibrationEnabled"
          @ionChange="toggleVibration"
          color="rpg"
        ></ion-checkbox>
      </ion-item>
    </ion-list>
  </ion-card>
</template>

<script lang="ts">
  import { defineComponent, ref } from "vue";

import {
  toastController,
} from "@ionic/vue";

import Ionic from "@/mixins/ionic";


import { volumeHigh, volumeLow } from "ionicons/icons";
  import { useAudioStore } from "@/lib/store/stores/audio";
  import { useGameStore } from "@/lib/store/stores/game";

export default defineComponent({
  name: "input-settings",
  mixins: [Ionic],

  computed: {
    theme() { return (this as any).gameStore.theme },
    bgm() { return (this as any).audioStore.bgm },
  },

  methods: {
    changeBGM(payload: any) { return (this as any).audioStore.changeBGM(payload) },
    turnMusicOnOff() { return (this as any).audioStore.turnMusicOnOff() },
    changeSoundFX(payload: any) { return (this as any).gameStore.changeSoundFX(payload) },
    changeBGMToggle($ev) {
      const is_on = $ev.detail.checked;
      const { play$fx, changeBGM, turnMusicOnOff } = this;
      play$fx();
      changeBGM({ is_on }).then(turnMusicOnOff);
    },
    update$fx({ rpg, ui }) {
      const { $fx, changeSoundFX, play$fx } = this;
      const newFx = { ...$fx.theme, rpg, ui };
      play$fx();
      changeSoundFX(newFx).then(() => ($fx.theme = newFx));
    },


    changeRPGSound(ev) {
      const { ui } = this.theme;
      this.update$fx({
        rpg: ev.detail.value,
        ui,
      });
    },

    changeMusicVolume(ev) {
      this.musicVolume = ev.detail.value;
      // In a real app, this would update the actual volume
      if (this.bgm.audio) {
        this.bgm.audio.volume = this.musicVolume / 100;
      }
      this.showVolumeToast("Music volume updated");
    },

    changeEffectsVolume(ev) {
      this.effectsVolume = ev.detail.value;
      // In a real app, this would update the actual effects volume
      this.showVolumeToast("Effects volume updated");
    },

    toggleSoundEffects() {
      // In a real app, this would enable/disable sound effects
      this.showToast(
        `Sound effects ${this.soundEffectsEnabled ? "enabled" : "disabled"}`
      );
    },

    toggleVibration() {
      // In a real app, this would enable/disable vibration
      this.showToast(
        `Vibration ${this.vibrationEnabled ? "enabled" : "disabled"}`
      );

      // Provide haptic feedback if enabled
      if (this.vibrationEnabled && navigator.vibrate) {
        navigator.vibrate(50);
      }
    },

    async showToast(message: string) {
      const toast = await toastController.create({
        message,
        duration: 2000,
        position: "bottom",
      });
      await toast.present();
    },

    async showVolumeToast(message: string) {
      // Only show volume toast when dragging ends
      if (this.volumeToastTimeout) {
        clearTimeout(this.volumeToastTimeout);
      }

      this.volumeToastTimeout = setTimeout(async () => {
        const toast = await toastController.create({
          message,
          duration: 1000,
          position: "bottom",
        });
        await toast.present();
      }, 500);
    },
  },

  setup() {
    const audioStore = useAudioStore();
    const gameStore = useGameStore();
    const musicVolume = ref(80);
    const effectsVolume = ref(70);
    const soundEffectsEnabled = ref(true);
    const vibrationEnabled = ref(true);
    const volumeToastTimeout = ref<ReturnType<typeof setTimeout> | null>(null);

    return {
      audioStore,
      gameStore,
      musicVolume,
      effectsVolume,
      soundEffectsEnabled,
      vibrationEnabled,
      volumeToastTimeout,
      volumeHigh,
      volumeLow,
    };
  },
});
</script>

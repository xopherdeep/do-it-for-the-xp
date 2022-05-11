<template>
  <ion-list>
    <!-- <ion-list-header>
      <i class="fad fa-music-alt fa-lg ion-float-right"></i>
      <ion-label> Sound FX Settings </ion-label>
    </ion-list-header> -->
    <ion-item>
      <i class="fad fa-music fa-lg ion-float-left" slot="start"></i>
      <ion-label> Music </ion-label>
      <ion-toggle
        @ionChange="changeBGMToggle"
        :checked="bgm.is_on"
      ></ion-toggle>
    </ion-item>

    <ion-item>
      <ion-label>User Interface (UI)</ion-label>
      <i class="fad fa-tv fa-lg ion-float-left" slot="start"></i>
      <ion-select
        @ionChange="changeUISound"
        @click="play$fx"
        :value="$fx.theme.ui"
        placeholder="Select One"
      >
        <ion-select-option value="nintendo">Nintendo</ion-select-option>
        <ion-select-option value="sony">Playstation</ion-select-option>
      </ion-select>
    </ion-item>

    <ion-item @click="play$fx">
      <ion-label>Role Playing Game (RPG)</ion-label>
      <i class="fad fa-terminal fa-lg ion-float-left" slot="start"></i>
      <ion-select
        @ionChange="changeRPGSound"
        :value="$fx.theme.rpg"
        ok-text="Okay"
        cancel-text="Dismiss"
      >
        <ion-select-option value="earthbound" @ionSelect="play$fx"
          >Children of Earth</ion-select-option
        >
        <ion-select-option value="chronoTrigger" @ionSelect="play$fx"
          >Timeless Contention</ion-select-option
        >
        <ion-select-option value="finalFantasy" @ionSelect="play$fx"
          >Last of the Dreams</ion-select-option
        >
      </ion-select>
    </ion-item>
  </ion-list>
</template>

<script lang="javascript">
import { computed, defineComponent } from "vue";

import {
  IonSelect,
  IonSelectOption,
  IonList,
  IonListHeader,
  IonItem,
  IonToggle,
  IonLabel,
} from "@ionic/vue";

import { mapActions, mapState, useStore } from "vuex";

export default defineComponent({
  name: "input-settings",
  components: {
    IonSelect,
    IonToggle,
    IonSelectOption,
    IonList,
    // IonListHeader,
    IonItem,
    IonLabel,
  },

  computed: {
    ...mapState(["theme", "bgm"]),
  },

  methods: {
    ...mapActions(["changeBGM", "turnMusicOnOff", "changeSoundFX"]),
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

    changeUISound(ev) {
      const { rpg } = this.theme;
      this.update$fx({
        ui: ev.detail.value,
        rpg,
      });
    },

    changeRPGSound(ev) {
      const { ui } = this.theme;
      this.update$fx({
        rpg: ev.detail.value,
        ui,
      });
    },
  },

  setup() {
    const store = useStore();
    return {
      bgm: computed(() => store.state.bgm),
      theme: computed(() => store.state.theme),
    };
  },
});
</script>

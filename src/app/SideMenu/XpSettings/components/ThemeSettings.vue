<template>
  <ion-page :class="[$options.name, 'xp-settings-page']">
    <ion-header :translucent="true">
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <xp-back-button></xp-back-button>
        </ion-buttons>
        <ion-title>Theme</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="rpg-box bg-slide ion-padding">
      <ion-card class="max-w-2xl">
        <ion-list>
          <ion-item-group>
            <ion-item-divider>
              <ion-label>Look</ion-label>
            </ion-item-divider>

            <ion-item>
              <ion-label>
                <h2>Game style</h2>
                <p>The look of every window and menu. Styles marked Pro come with XP Pro.</p>
              </ion-label>
              <ion-select
                :value="theme.rpg"
                interface="action-sheet"
                aria-label="Game style"
                @ionChange="changeRPGSound"
              >
                <ion-select-option
                  v-for="style in gameStyles"
                  :key="style"
                  :value="style"
                  >{{ gameStyleLabel(style) }}</ion-select-option
                >
              </ion-select>
            </ion-item>
          </ion-item-group>

          <ion-item-group>
            <ion-item-divider>
              <ion-label>Sound</ion-label>
            </ion-item-divider>

            <ion-item lines="none">
              <ion-label>
                <h2>Menu sounds</h2>
                <p>The clicks and chimes as you move through menus</p>
              </ion-label>
              <ion-select
                :value="theme.ui"
                interface="action-sheet"
                aria-label="Menu sounds"
                @ionChange="changeUISound"
              >
                <ion-select-option value="nintendo">Nintendo</ion-select-option>
                <ion-select-option value="sony">PlayStation</ion-select-option>
              </ion-select>
            </ion-item>
          </ion-item-group>
        </ion-list>
      </ion-card>

      <xp-coming-soon-card title="Display" :items="comingSoon" />
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
  import { defineComponent } from "vue";
  import { useGameStore } from "@/lib/store/stores/game";
  import {
    IonPage,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonCard,
    IonButtons,
    IonSelect,
    IonSelectOption,
    IonItemGroup,
    IonItemDivider,
  } from "@ionic/vue";
  import ionic from "@/lib/mixins/ionic";
  import { useProStore } from "@/lib/store/stores/pro";
  import XpComingSoonCard from "./XpComingSoonCard.vue";
  import { THEME_COMING_SOON } from "./comingSoon";
  import {
    GAME_STYLES,
    GAME_STYLE_NAMES,
    GameStyle,
    isProGameStyle,
  } from "@/lib/utils/gameStyle";

  export default defineComponent({
    name: "ThemeSettings",
    components: {
      IonPage,
      IonHeader,
      IonToolbar,
      IonTitle,
      IonContent,
      IonList,
      IonItem,
      IonLabel,
      IonCard,
      IonButtons,
      IonSelect,
      IonSelectOption,
      IonItemGroup,
      IonItemDivider,
      XpComingSoonCard,
    },
    mixins: [ionic],
    computed: {
      theme() {
        return this.gameStore.theme;
      },
    },
    setup() {
      const gameStore = useGameStore();
      const pro = useProStore();
      pro.init().catch(() => undefined);

      return {
        gameStore,
        pro,
        gameStyles: GAME_STYLES,
        comingSoon: THEME_COMING_SOON,
      };
    },
    methods: {
      changeSoundFX(payload: { ui: string; rpg: string }) {
        return Promise.resolve(this.gameStore.changeSoundFX(payload));
      },

      update$fx({ rpg, ui }) {
        const { $fx, changeSoundFX } = this;
        const newFx = { ...$fx.theme, rpg, ui };
        this.play$fx();
        changeSoundFX(newFx).then(() => ($fx.theme = newFx));
      },

      changeUISound(ev) {
        const { rpg } = this.theme;
        this.update$fx({
          ui: ev.detail.value,
          rpg,
        });
      },

      gameStyleLabel(style: GameStyle) {
        const isLocked = isProGameStyle(style) && !this.pro.isPro;
        return `${GAME_STYLE_NAMES[style]}${isLocked ? " (Pro)" : ""}`;
      },

      async changeRPGSound(ev) {
        const { ui, rpg } = this.theme;
        if (ev.detail.value === rpg) return;
        // A Pro style without Pro opens the upsell and the picker goes back to the current style
        const isLocked = isProGameStyle(ev.detail.value) && !(await this.pro.requirePro("gameStyles"));
        if (isLocked) {
          ev.target.value = rpg;
          return;
        }
        this.update$fx({
          rpg: ev.detail.value,
          ui,
        });
      },
    },
  });
</script>

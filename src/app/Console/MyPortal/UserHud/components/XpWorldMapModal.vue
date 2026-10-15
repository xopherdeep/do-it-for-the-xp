<template>
  <!-- BACKDROP TO CLOSE ON CLICK OUTSIDE -->
  <div
    v-if="isOpen"
    class="menu-backdrop-overlay"
    @click.stop="close"
  ></div>

  <!-- CENTERED MODAL -->
  <div
    v-if="isOpen"
    class="centered-modal-wrapper"
  >
    <xp-close-button
      size="lg"
      color="light"
      class="close-modal-btn"
      @click="close"
    />

    <ion-card class="world-map-card rpg-box bg-slide bg-slide-modal icon-colors">
      <div class="card-header">
        <i class="fad fa-pegasus mr-2"></i>
        <span>Sacred Pegasi</span>
      </div>

      <ion-card-content class="content">
        <div class="main-layout">
          <!-- TOP: STATUS TEXT -->
          <div class="status-summary">
            <span class="label">RESCUED:</span>
            <span class="count">{{ rescuedCount }} / {{ pegasiList.length }}</span>
          </div>

          <!-- CENTER: CIRCLE -->
          <div class="crystals-circle-container">
            <div class="crystals-circle">
              <!-- Outer Circle (8 items) -->
              <div
                v-for="(pegasus, index) in pegasiList.slice(0, 8)"
                :key="`outer-${index}`"
                class="crystal-item outer-crystal"
                :class="{ 'obtained': pegasus.obtained, 'locked': !pegasus.obtained, 'selected': selectedPegasus === index }"
                @click="selectPegasus(index)"
                @mouseenter="hoverPegasus(index)"
                :style="{ '--hover-color': pegasus.color }"
              >
                <!-- IF OBTAINED: SHOW PEGASUS -->
                <i
                  v-if="pegasus.obtained"
                  class="fad fa-lg fa-pegasus"
                  :class="pegasus.id"
                ></i>

                <!-- IF LOCKED: SHOW EGG NORMALLY, PEGASUS ON HOVER -->
                <div
                  v-else
                  class="locked-icon-wrapper"
                >
                  <i
                    class="fad fa-lg fa-egg egg-icon"
                    :class="pegasus.id"
                  ></i>
                  <i
                    class="fad fa-lg fa-pegasus ghost-icon"
                    :class="pegasus.id"
                  ></i>
                </div>

                <div
                  v-if="pegasus.obtained"
                  class="glow-effect"
                  :style="{ background: pegasus.color }"
                ></div>
              </div>

              <!-- Center Crystal (9th item) -->
              <div
                v-if="pegasiList.length > 8"
                class="crystal-item center-crystal"
                :class="{ 'obtained': pegasiList[8].obtained, 'locked': !pegasiList[8].obtained, 'selected': selectedPegasus === 8 }"
                :style="{ '--hover-color': pegasiList[8].color }"
                @click="selectPegasus(8)"
                @mouseenter="hoverPegasus(8)"
              >
                <!-- IF OBTAINED: SHOW PEGASUS -->
                <i
                  v-if="pegasiList[8].obtained"
                  class="fad fa-lg fa-pegasus"
                  :class="pegasiList[8].id"
                ></i>

                <!-- IF LOCKED: SHOW EGG NORMALLY, PEGASUS ON HOVER -->
                <div
                  v-else
                  class="locked-icon-wrapper"
                >
                  <i
                    class="fad fa-lg fa-egg egg-icon"
                    :class="pegasiList[8].id"
                  ></i>
                  <i
                    class="fad fa-lg fa-pegasus ghost-icon"
                    :class="pegasiList[8].id"
                  ></i>
                </div>

                <div
                  v-if="pegasiList[8].obtained"
                  class="glow-effect"
                  :style="{ background: pegasiList[8].color === '#130f40' ? 'white' : pegasiList[8].color, opacity: pegasiList[8].color === '#130f40' ? '0.3' : '0.4' }"
                ></div>
              </div>
            </div>
          </div>

          <!-- BOTTOM: INFO BOX -->
          <!-- BOTTOM: INFO BOX -->
          <div
            class="info-box rpg-box-inner"
            v-if="activePegasusData"
          >
            <!-- Large Icon on Left -->
            <div class="large-icon-wrapper">
              <i
                v-if="activePegasusData.obtained"
                class="fad fa-pegasus"
                :class="activePegasusData.id"
              ></i>
              <i
                v-else
                class="fad fa-egg"
                :class="activePegasusData.id"
                style="opacity: 0.5;"
              ></i>
            </div>

            <!-- Text Content on Right -->
            <div class="text-content">
              <h3 :style="{ color: activePegasusData.obtained ? activePegasusData.color : '#888' }">
                {{ activePegasusData.obtained ? activePegasusData.name : '???' }}
              </h3>
              <p class="lore-text">{{ activePegasusData.obtained ? activePegasusData.desc : activePegasusData.egg }}</p>
              <div
                class="temple-tag"
                v-if="activePegasusData.obtained"
              >
                <i class="fad fa-dungeon"></i> {{ activePegasusData.temple }}
              </div>
            </div>
          </div>

          <!-- BOTTOM: FLY (within thumb reach; only a freed Pegasus can carry the hero) -->
          <button
            type="button"
            class="fly-btn"
            :disabled="!activePegasusData || !activePegasusData.obtained"
            @click="fly"
          >
            <i class="fad fa-pegasus"></i> Fly
          </button>
        </div>
      </ion-card-content>
    </ion-card>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { useUserStore } from "@/lib/store/stores/user";
import { IonCard, IonCardContent } from "@ionic/vue";
import XpCloseButton from "@/components/atoms/CloseButton/XpCloseButton.vue";
import { play$fx } from "@/assets/fx";
import { PEGASI } from "@/lib/services/temples/TemplePegasus";
import { eggLine, routeOfWorld } from "@/lib/services/travel/flight";

/** With no Pegasus free yet the modal opens on the one the first flight needs: Aura, in the Wind Temple. */
const FIRST_PEGASUS = 3;

export default defineComponent({
  name: "xp-world-map-modal",
  components: { XpCloseButton, IonCard, IonCardContent },
  props: {
    isOpen: {
      type: Boolean,
      default: false
    }
  },
  emits: ["close"],
  data() {
    const pegasusLore = [
      { id: 'ventus', color: '#f1f2f6', secondaryColor: '#2f3542', name: 'Ventus', temple: 'Cloud Temple', desc: 'The swift winds of change. Soaring high above the troubles.' },
      { id: 'ignis', color: '#ff4757', secondaryColor: '#f1c40f', name: 'Ignis', temple: 'Fire Temple', desc: 'The burning spirit of passion. Rescued from the ashes of the Red Dragon.' },
      { id: 'sol', color: '#ffa502', secondaryColor: '#ff6b81', name: 'Sol', temple: 'Sun Temple', desc: 'The radiant light of hope. Its warmth melts even the coldest despair.' },
      { id: 'aura', color: '#badc58', secondaryColor: '#ffffff', name: 'Aura', temple: 'Plains', desc: 'The spirit of new beginnings, wandering the grassy fields.' },
      { id: 'terra', color: '#2ed573', secondaryColor: '#2f3542', name: 'Terra', temple: 'Forest Temple', desc: 'The unshakeable foundation. Grounded and strong against all odds.' },
      { id: 'glacie', color: '#00d2d3', secondaryColor: '#5352ed', name: 'Glacie', temple: 'Frozen Temple', desc: 'The calm clarity of mind. Found deep within the cryo-chambers.' },
      { id: 'aqua', color: '#3742fa', secondaryColor: '#7bed9f', name: 'Aqua', temple: 'Water Temple', desc: 'The healing flow. Cleanses the spirit with pure waters.' },
      { id: 'venenum', color: '#8e44ad', secondaryColor: '#badc58', name: 'Venenum', temple: 'Swamp Temple', desc: 'The shadow that protects. Lurking in the mist to guard the weak.' },
      { id: 'umbra', color: '#130f40', secondaryColor: '#ffffff', name: 'Umbra', temple: 'Moon Temple', desc: 'The mysterious guide of dreams. Sees what is hidden in the dark.' } // Center
    ];

    return {
      selectedPegasus: 0,
      pegasiLore: pegasusLore
    };
  },
  computed: {
    rescuedCount() {
      return this.pegasiList.filter((p: any) => p.obtained).length;
    },
      activePegasusData() {
      return this.pegasiList[this.selectedPegasus];
    },
    // The hero this modal flies: the one on the route, else whoever is signed in
    heroId(): string {
      const raw = this.$route?.params?.userId;
      const id = Array.isArray(raw) ? raw[0] : raw;
      return String(id || useUserStore().currentUser.id || "");
    },
    // Reactive Pegasi list from store
    pegasiList() {
      const userStore = useUserStore();
      const userPegasi = userStore.currentUser.stats?.pegasi || [];
      
      return this.pegasiLore.map((lore, index) => ({
        ...lore,
        obtained: !!userPegasi[index],
        // What an egg says when it is picked: where the Pegasus sleeps
        egg: PEGASI[index] ? eggLine(PEGASI[index]) : 'Locked',
      }));
    }
  },
  watch: {
    // Opening the modal lands on a Pegasus that is free (it can be flown to), else on the first one to find
    isOpen(open: boolean) {
      if (!open) return;
      const freed = this.pegasiList.findIndex((p: any) => p.obtained);
      this.selectedPegasus = freed >= 0 ? freed : FIRST_PEGASUS;
    }
  },
  methods: {
    close() {
      this.$emit("close");
    },
    // A freed Pegasus flies the hero straight to its region; an egg only shows where it sleeps
    selectPegasus(index: number) {
      this.selectedPegasus = index;
      const isFreed = Boolean(this.pegasiList[index]?.obtained);
      if (isFreed) {
        this.flyTo(index);
      } else {
        play$fx("no");
      }
    },
    // The Fly button: the Pegasus on show carries the hero (the button is off for an egg)
    fly() {
      const isFreed = Boolean(this.activePegasusData?.obtained);
      if (isFreed) this.flyTo(this.selectedPegasus);
    },
    flyTo(index: number) {
      const route = PEGASI[index] ? routeOfWorld(PEGASI[index].world) : null;
      if (!route) {
        play$fx("no");
        return;
      }
      play$fx("select");
      this.close();
      this.$router.push({ name: route, params: { userId: this.heroId } }).catch(() => undefined);
    },
    hoverPegasus(index: number) {
      this.selectedPegasus = index;
    }
  }
});
</script>

<style lang="scss" scoped>

  /* Modal Overlay */
  .menu-backdrop-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.75);
    z-index: 5000;
    animation: fadeIn 0.3s ease-out;
  }

  .centered-modal-wrapper {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 95vw;
    max-width: 600px;
    z-index: 5500;
    display: flex;
    flex-direction: column;
    align-items: center;
    animation: popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);

    .close-modal-btn {
      position: absolute;
      top: -20px;
      right: -10px;
      background: transparent;
      border: none;
      color: var(--ion-color-light);
      font-size: 2rem;
      z-index: 5501;
      filter: drop-shadow(0 0 5px rgba(0, 0, 0, 0.8));
      cursor: pointer;
      transition: transform 0.2s;

      &:hover {
        transform: scale(1.1);
        color: var(--ion-color-danger);
      }
    }
  }

  /* Card Styling - RPG Box Theme */
  .world-map-card {
    width: 100%;
    display: flex;
    flex-direction: column;
    border-radius: 8px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.8);
    /* Removed inset shadow to let pattern show */
    overflow: visible;
    /* Allow glow to spill */

    .card-header {
      background: linear-gradient(180deg, rgba(50, 50, 50, 0.8) 0%, rgba(20, 20, 20, 0.9) 100%);
      padding: 1rem;
      font-size: 2.2rem;
      font-family: 'Apple Kid', sans-serif;
      /* Earthbound Font */
      letter-spacing: 5px;
      border-bottom: 2px solid #555;
      text-transform: uppercase;
      color: #ffd700;
      text-shadow: 2px 2px 0px #000;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .content {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
  }

  /* Status Text */
  .status-summary {
    width: 100%;
    display: flex;
    justify-content: space-between;
    padding: 0 10px 10px;
    border-bottom: 1px dashed rgba(255, 255, 255, 0.2);
    margin-bottom: 1rem;
    font-family: 'Twoson', sans-serif;
    color: #ccc;

    .label {
      font-size: 0.9rem;
      letter-spacing: 1px;
    }

    .count {
      color: #ffd700;
      font-weight: bold;
      font-size: 1rem;
    }
  }

  /* Circle Layout */
  .crystals-circle-container {
    display: flex;
    justify-content: center;
    align-items: center;
    position: relative;
    width: 360px;
    height: 360px;
    margin: 0 auto 1.5rem;
    /* Centered horizontally */
  }

  .crystals-circle {
    position: relative;
    width: 100%;
    height: 100%;
  }

  .crystal-item {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 80px;
    height: 80px;
    margin: -40px;
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.3s ease;
    z-index: 5;
    background: rgba(0, 0, 0, 0.4);

    /* Outline for selected */
    &.selected {
      box-shadow: 0 0 0 2px var(--hover-color, #ffd700);
      z-index: 20;
      transform: scale(1.15);
    }

    &:hover {
      transform: scale(1.25);
      background: rgba(255, 255, 255, 0.1);
    }

    &.outer-crystal {
      @for $i from 0 through 7 {
        &:nth-child(#{$i + 1}) {
          /* Start at -90deg (Top) */
          $angle: calc(360deg / 8) * $i - 90deg;
          transform: rotate($angle) translate(145px) rotate(-$angle);

          &.selected {
            transform: rotate($angle) translate(145px) rotate(-$angle) scale(1.25) !important;
          }

          &:hover {
            transform: rotate($angle) translate(145px) rotate(-$angle) scale(1.25);
          }
        }
      }
    }

    /* Center Crystal Specifics */
    &.center-crystal {
      width: 130px;
      height: 130px;
      margin: -65px;

      i {
        font-size: 4rem;
      }
    }

    /* Icons */
    i {
      filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.8));
      transition: all 0.5s ease;
      font-size: 2.2rem;
      /* Increase icon size */
    }

    .locked-icon-wrapper {
      position: relative;
      width: 100%;
      height: 100%;
      display: flex;
      justify-content: center;
      align-items: center;

      .egg-icon {
        position: absolute;
        opacity: 1;
        filter: brightness(0.8);
        transition: opacity 0.3s;
      }

      .ghost-icon {
        position: absolute;
        opacity: 0;
        filter: blur(0.5px);
        transition: opacity 0.3s;
      }
    }

    &:hover .locked-icon-wrapper {
      .egg-icon {
        opacity: 0.3;
      }

      .ghost-icon {
        opacity: 0.6;
      }
    }

    /* Glow Effect behind unlocked items */
    .glow-effect {
      position: absolute;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      filter: blur(12px);
      opacity: 0.4;
      z-index: -1;
      transition: opacity 0.5s;
    }

    &.obtained:hover .glow-effect {
      opacity: 0.8;
    }
  }

  /* Info Box */
  .info-box {
    width: 100%;
    background: rgba(0, 0, 0, 0.6);
    border: 2px solid #555;
    border-radius: 4px;
    padding: 15px;
    min-height: 110px;
    animation: slideUp 0.3s ease-out;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    text-align: left;

    .large-icon-wrapper {
      flex: 0 0 70px;
      display: flex;
      justify-content: center;
      align-items: center;
      margin-right: 15px;

      i {
        font-size: 3rem;
        filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.6));
      }
    }

    .text-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
    }

    h3 {
      margin: 0 0 5px;
      font-family: 'Apple Kid', sans-serif;
      text-transform: uppercase;
      font-size: 1.2rem;
      letter-spacing: 1px;
      text-shadow: 1px 1px 0 #000;
    }

    .lore-text {
      font-family: 'Apple Kid', sans-serif;
      font-size: 1.1rem;
      color: #ddd;
      line-height: 1.2;
      margin: 4px 0 10px;
      letter-spacing: 0.5px;
    }

    .temple-tag {
      display: inline-block;
      padding: 2px 10px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 10px;
      font-size: 0.8rem;
      font-family: 'Twoson', sans-serif;
      color: #ffd700;
      border: 1px solid rgba(255, 255, 255, 0.2);
      text-transform: uppercase;
      letter-spacing: 1px;

      i {
        margin-right: 6px;
        color: #aaa;
      }
    }
  }

  /* Fly: full width under the lore, 52 px tall so a thumb finds it; dim until a freed Pegasus is shown */
  .fly-btn {
    width: 100%;
    min-height: 52px;
    margin-top: 12px;
    padding: 8px 16px;
    background: rgba(0, 0, 0, 0.6);
    border: 2px solid #ffd700;
    border-radius: 4px;
    color: #ffd700;
    font-family: 'Apple Kid', sans-serif;
    font-size: 1.5rem;
    letter-spacing: 4px;
    text-transform: uppercase;
    text-shadow: 2px 2px 0 #000;
    cursor: pointer;
    transition: background 0.2s, transform 0.1s;

    i {
      margin-right: 8px;
    }

    &:hover:not(:disabled) {
      background: rgba(255, 215, 0, 0.18);
    }

    &:active:not(:disabled) {
      transform: scale(0.98);
    }

    &:disabled {
      border-color: #555;
      color: #777;
      opacity: 0.6;
      cursor: not-allowed;
    }
  }

  /* Animations */
  @keyframes fadeIn {
    from {
      opacity: 0;
    }

    to {
      opacity: 1;
    }
  }

  @keyframes popIn {
    0% {
      transform: translate(-50%, -50%) scale(0.8);
      opacity: 0;
    }

    100% {
      transform: translate(-50%, -50%) scale(1);
      opacity: 1;
    }
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(10px);
    }

    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>

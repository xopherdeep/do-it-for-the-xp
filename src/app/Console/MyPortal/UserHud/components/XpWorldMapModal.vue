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
    // Reactive Pegasi list of the hero being viewed (the one on the route), not whoever is signed in
    pegasiList() {
      const userStore = useUserStore();
      const viewedHero = userStore.getUserById(this.heroId) ?? userStore.currentUser;
      const userPegasi = viewedHero.stats?.pegasi || [];

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

<style lang="scss" scoped src="./_XpWorldMapModal.scss" />

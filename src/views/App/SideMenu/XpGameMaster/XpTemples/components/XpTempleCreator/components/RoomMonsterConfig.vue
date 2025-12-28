<template>
  <div class="monster-settings config-box">
    <div class="header-with-action">
      <div class="config-label">Encounter Settings</div>
      <ion-button fill="clear" size="small" @click="$emit('open-beast-selector')">
        <i class="fas fa-plus mr-1"></i> Add Beast
      </ion-button>
    </div>

    <!-- Selected Beasts Visual List -->
    <div v-if="selectedBeasts.length" class="selected-beasts-visual mt-10">
      <ion-grid class="ion-no-padding">
        <ion-row>
          <ion-col size="4" v-for="beast in selectedBeasts" :key="beast.id">
            <div class="beast-card-wrapper">
              <XpBeastSelectorItem 
                :name="beast.name"
                :avatar="beast.avatar"
                :bg1="beast.bg1"
                :bg2="beast.bg2"
                @select="$emit('remove-beast', beast.id)"
              />
              <div class="remove-beast-overlay" @click.stop="$emit('remove-beast', beast.id)">
                <i class="fas fa-times-circle"></i>
              </div>
            </div>
          </ion-col>
          <!-- Add Placeholder if space -->
          <ion-col size="4" v-if="selectedBeasts.length < 6">
            <div class="beast-card-wrapper" @click="$emit('open-beast-selector')">
              <div class="beast-placeholder-card">
                <i class="fas fa-plus fa-lg"></i>
                <span>Add</span>
              </div>
              <div class="placeholder-footer">&nbsp;</div>
            </div>
          </ion-col>
        </ion-row>
      </ion-grid>
    </div>

    <div v-else class="beast-selection-trigger large mt-10" @click="$emit('open-beast-selector')">
      <div class="trigger-left">
        <div class="beast-icon-box">
          <i class="fad fa-paw-claws"></i>
        </div>
        <div class="beast-count">
          <span class="placeholder">Assign Encounter Beasts</span>
        </div>
      </div>
      <i class="fas fa-chevron-right op-30"></i>
    </div>

    <!-- Trap Toggle - Regular monster rooms -->
    <div v-if="!isBoss" class="trap-config mt-20">
      <div 
        class="trap-row" 
        :class="{ active: lockOnEnter }" 
        @click="$emit('toggle-auto-lock')"
      >
        <div class="trap-info">
          <i class="fad fa-dungeon trap-icon" :class="{ neutral: !lockOnEnter }"></i>
          <span class="trap-label">It's a trap!</span>
        </div>
        <ion-toggle 
          :checked="lockOnEnter" 
          color="danger"
          mode="ios"
          @ionChange.stop="$emit('toggle-auto-lock')"
        ></ion-toggle>
      </div>
      <p class="config-hint">If enabled, doors will lock upon entry until all enemies are defeated.</p>
    </div>

    <!-- Boss/Miniboss - Always trapped -->
    <div v-else class="trap-config mt-20 boss-trap">
      <div class="trap-row active permanent">
        <div class="trap-info">
          <i class="fad fa-eye-evil boss-icon"></i>
          <span class="trap-label boss-label"><em><strong>LET'S GO!!</strong></em></span>
        </div>
        <ion-toggle 
          :checked="true" 
          :disabled="true"
          color="danger"
          mode="ios"
        ></ion-toggle>
      </div>
      <p class="config-hint">Boss encounters always lock doors upon entry. Prepare for battle!</p>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import { IonGrid, IonRow, IonCol, IonButton } from '@ionic/vue';
import XpBeastSelectorItem from '@/views/App/SideMenu/XpGameMaster/XpBestiary/components/XpBeastSelectorItem.vue';
import { Beast } from '@/lib/databases/BestiaryDb';

export default defineComponent({
  name: 'RoomMonsterConfig',
  components: { IonGrid, IonRow, IonCol, IonButton, XpBeastSelectorItem },
  props: {
    selectedBeasts: {
      type: Array as PropType<Beast[]>,
      default: () => []
    },
    lockOnEnter: {
      type: Boolean,
      default: false
    },
    isBoss: {
      type: Boolean,
      default: false
    }
  },
  emits: ['open-beast-selector', 'remove-beast', 'toggle-auto-lock']
});
</script>

<style lang="scss" scoped>
.config-box {
  .config-label {
    font-family: "Press Start 2P";
    font-size: 0.65rem;
    color: #fff;
    opacity: 0.7;
    margin-bottom: 12px;
    letter-spacing: 0.5px;
  }
}

.header-with-action {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  
  .config-label { margin-bottom: 0; }
  ion-button { 
    --padding-start: 8px; 
    --padding-end: 8px; 
    font-family: "Press Start 2P"; 
    font-size: 0.5rem; 
  }
}

.selected-beasts-visual {
  margin: 0 -4px;
  
  ion-col {
    padding: 6px 4px;
  }
}

.beast-card-wrapper {
  position: relative;
  
  &:hover {
    .remove-beast-overlay { opacity: 1; transform: scale(1.1); }
  }
}

.remove-beast-overlay {
  position: absolute;
  top: -8px;
  right: -8px;
  z-index: 5;
  color: var(--ion-color-danger);
  font-size: 1.2rem;
  background: #000;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transition: all 0.2s;
}

.beast-placeholder-card {
  width: 100%;
  aspect-ratio: 1/1;
  background: rgba(255, 255, 255, 0.03);
  border: 4px solid rgba(255, 255, 255, 0.1);
  border-style: dashed;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  cursor: pointer;
  transition: all 0.2s;
  
  i { color: rgba(255, 255, 255, 0.3); transition: color 0.2s; }
  span { 
    font-family: "Press Start 2P"; 
    font-size: 0.5rem; 
    color: rgba(255, 255, 255, 0.3); 
    text-transform: uppercase; 
  }
  
  &:hover {
    background: rgba(var(--ion-color-primary-rgb), 0.05);
    border-color: rgba(var(--ion-color-primary-rgb), 0.4);
    i, span { color: var(--ion-color-primary); }
  }
}

.placeholder-footer {
  font-size: 0.6rem;
  height: 1.2rem;
  margin-top: 8px;
}

.beast-selection-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 18px;
  margin-bottom: 16px;
  cursor: pointer;
  transition: all 0.2s;

  &.large {
    padding: 24px;
    background: rgba(var(--ion-color-primary-rgb), 0.05);
    border-color: rgba(var(--ion-color-primary-rgb), 0.2);
    .beast-icon-box { background: rgba(var(--ion-color-primary-rgb), 0.15); }
  }

  &:hover { 
    background: rgba(255, 255, 255, 0.05);
    border-color: var(--ion-color-primary);
  }

  .trigger-left {
    display: flex;
    align-items: center;
    gap: 20px;

    .beast-icon-box {
      width: 44px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(var(--ion-color-primary-rgb), 0.1);
      border-radius: 12px;
      i { font-size: 1.5rem; color: var(--ion-color-primary); }
    }

    .beast-count {
      display: flex;
      flex-direction: column;
      span { font-family: "StatusPlz"; font-size: 1.1rem; color: #fff; }
      .placeholder { color: rgba(255, 255, 255, 0.3); }
    }
  }
}

.mt-20 { margin-top: 20px; }
.mt-10 { margin-top: 10px; }
.mr-1 { margin-right: 0.25rem; }
.op-30 { opacity: 0.3; }

.trap-config {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 16px;
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, 0.05);

  .trap-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 8px;
    cursor: pointer;

    .trap-info {
      display: flex;
      align-items: center;
      gap: 12px;

      .trap-icon {
        font-size: 1.2rem;
        color: var(--ion-color-danger);
        transition: all 0.3s;
        &.neutral { color: rgba(255, 255, 255, 0.2); }
      }

      .trap-label {
        font-family: "Press Start 2P";
        font-size: 0.6rem;
        color: rgba(255, 255, 255, 0.9);
        letter-spacing: 0.5px;
      }
    }

    &.permanent {
      cursor: not-allowed;
    }
  }

  .config-hint {
    font-size: 0.55rem;
    color: rgba(255, 255, 255, 0.4);
    margin: 8px 0 0 0;
    line-height: 1.4;
  }

  &.boss-trap {
    border-color: rgba(255, 215, 64, 0.3);
    background: linear-gradient(135deg, rgba(118, 75, 162, 0.15), rgba(255, 215, 64, 0.1));
    box-shadow: 0 0 20px rgba(255, 215, 64, 0.1);

    .trap-row {
      .boss-icon {
        font-size: 1.5rem;
        color: #ffd740;
        animation: pulse-boss 2s ease-in-out infinite;
      }

      .boss-label {
        color: #ffd740;
        font-size: 0.7rem;
      }
    }

    ion-toggle {
      opacity: 0.6;
    }
  }
}

@keyframes pulse-boss {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.1); opacity: 0.8; }
}
</style>

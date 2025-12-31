<template>
  <div class="achievement-schedule-tab">
    <div class="schedule-section">
      <div class="section-header">
        <i class="fad fa-hourglass-start mr-2"></i>
        <span>Time Oracle</span>
      </div>

      <div class="date-grid ion-padding-bottom">
        <!-- Starts On -->
        <div
          class="date-input-group"
          @click="startsModalOpen = true"
        >
          <div class="date-label">STARTS ON</div>
          <xp-glass-card :interactive="true">
            <div class="date-value-btn">
              <i
                class="fad fa-flag-alt frequency-card__icon"
                style="font-size: 1.5rem; margin-bottom: 0.5rem;"
              ></i>
              <span class="frequency-card__name">{{ formatDate(achievement.startsOn) }}</span>
            </div>
          </xp-glass-card>
        </div>

        <!-- Ends On -->
        <div
          class="date-input-group"
          @click="endsModalOpen = true"
        >
          <div class="date-label">ENDS ON</div>
          <xp-glass-card :interactive="true">
            <div
              class="date-value-btn"
              :class="{ 'text-muted': !achievement.endsOn }"
            >
              <i
                class="fad fa-flag-checkered frequency-card__icon"
                style="font-size: 1.5rem; margin-bottom: 0.5rem;"
              ></i>
              <span class="frequency-card__name">{{ achievement.endsOn ? formatDate(achievement.endsOn) : 'Never'
                }}</span>
            </div>
          </xp-glass-card>
        </div>

        <!-- Due By -->
        <div
          class="date-input-group"
          @click="dueModalOpen = true"
        >
          <div class="date-label">DUE TIME</div>
          <xp-glass-card :interactive="true">
            <div
              class="date-value-btn"
              :class="{ 'text-muted': !achievement.dueByTime }"
            >
              <i
                class="fad fa-alarm-clock frequency-card__icon"
                style="font-size: 1.5rem; margin-bottom: 0.5rem;"
              ></i>
              <span class="frequency-card__name">{{ formatTime(achievement.dueByTime) || 'Anytime' }}</span>
            </div>
          </xp-glass-card>
        </div>
      </div>
    </div>

    <div class="schedule-section">
      <div class="section-header">
        <i class="fad fa-sync-alt mr-2"></i>
        <span>Adventure Refresh</span>
      </div>

      <div class="frequency-grid">
        <xp-glass-card
          v-for="(icon, type) in BASIC_SCHEDULE_ICONS"
          :key="type"
          :selected="achievement.basicSchedule === type"
          @click="updateSchedule(type)"
        >
          <i :class="['fad', icon, 'frequency-card__icon']"></i>
          <span class="frequency-card__name">{{ type.charAt(0).toUpperCase() + type.slice(1) }}</span>
        </xp-glass-card>
      </div>

      <!-- Detail Configurators -->
      <div class="config-details mt-4">
        <!-- Once Details -->
        <div
          v-if="achievement.basicSchedule === 'once'"
          class="config-card"
        >
          <div class="config-card__content">
            <div
              class="rpg-toggle-row"
              @click="updateField('showDailyUntilComplete', !achievement.showDailyUntilComplete)"
            >
              <div class="rpg-toggle-info">
                <div class="rpg-toggle-title">Persistence</div>
                <div class="rpg-toggle-desc">Show daily on the board until marked complete.</div>
              </div>
              <ion-checkbox
                :checked="achievement.showDailyUntilComplete"
                @ionChange="updateField('showDailyUntilComplete', $event.detail.checked)"
                @click.stop
              ></ion-checkbox>
            </div>
          </div>
        </div>

        <!-- Weekly Details -->
        <div
          v-if="achievement.basicSchedule === 'weekly'"
          class="config-card"
        >
          <div class="config-card__content">
            <div class="sub-label mb-2">WHICH DAYS?</div>
            <div class="day-selector">
              <div
                v-for="day in daysOfWeek"
                :key="day.value"
                class="day-unit"
                :class="day.color"
              >
                <div
                  class="day-btn"
                  :class="{ 'day-btn--selected': (achievement.repeatOnDays || []).includes(day.value) }"
                  @click="toggleDay(day.value)"
                >
                  {{ day.label }}
                </div>
                <div class="day-symbol">
                  {{ day.symbol }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Custom Details -->
        <div
          v-if="achievement.basicSchedule === 'custom'"
          class="config-card"
        >
          <div class="config-card__content">
            <div class="custom-layout">
              <div class="custom-field">
                <span class="custom-label">Repeat</span>
                <div class="custom-input-group">
                  <input
                    type="number"
                    :value="achievement.customFrequency"
                    @input="updateField('customFrequency', parseInt(($event.target as HTMLInputElement).value))"
                    min="1"
                  />
                  <span class="unit">Time(s)</span>
                </div>
              </div>

              <div class="custom-separator">EVERY</div>

              <div class="custom-field">
                <span class="custom-label">Interval</span>
                <div class="custom-input-group">
                  <input
                    type="number"
                    :value="achievement.customPeriodNumber"
                    @input="updateField('customPeriodNumber', parseInt(($event.target as HTMLInputElement).value))"
                    min="1"
                  />
                  <ion-select
                    :value="achievement.customPeriodType"
                    @ionChange="updateField('customPeriodType', $event.detail.value)"
                    mode="ios"
                    class="interval-select"
                  >
                    <ion-select-option value="day">Day(s)</ion-select-option>
                    <ion-select-option value="week">Week(s)</ion-select-option>
                    <ion-select-option value="month">Month(s)</ion-select-option>
                    <ion-select-option value="year">Year(s)</ion-select-option>
                  </ion-select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { inject } from 'vue';
import {
  IonCheckbox,
  IonSelect,
  IonSelectOption,
} from '@ionic/vue';
import { BASIC_SCHEDULE_ICONS } from "@/constants";
import XpGlassCard from "@/components/atoms/XpGlassCard.vue";
import { AchievementFormInjectionKey } from "../hooks/useAchievementForm";

const {
  achievement,
  startsModalOpen,
  endsModalOpen,
  dueModalOpen
} = inject(AchievementFormInjectionKey) as any;

const formatDate = (dateStr?: string) => {
  if (!dateStr) return 'Not Set';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return date.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  } catch {
    return 'Error';
  }
};

const formatTime = (timeStr?: string) => {
  if (!timeStr) return null;
  try {
    if (timeStr.includes('T') || timeStr.includes('-')) {
      const date = new Date(timeStr);
      if (isNaN(date.getTime())) return timeStr;
      return date.toLocaleTimeString(undefined, { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
      });
    }
  } catch {
    return timeStr;
  }
  return timeStr;
};

const getLocalDayName = (dayIndex: number) => {
  // Jan 5, 2025 is a Sunday
  const date = new Date(2025, 0, 5 + dayIndex);
  return date.toLocaleDateString(undefined, { weekday: 'short' });
};

const daysOfWeek = [
  { label: getLocalDayName(0), value: 'sun', color: 'indigo', symbol: '☉' }, 
  { label: getLocalDayName(1), value: 'mon', color: 'violet', symbol: '☾' },
  { label: getLocalDayName(2), value: 'tue', color: 'red', symbol: '♂' },
  { label: getLocalDayName(3), value: 'wed', color: 'orange', symbol: '☿' },
  { label: getLocalDayName(4), value: 'thu', color: 'yellow', symbol: '♃' },
  { label: getLocalDayName(5), value: 'fri', color: 'green', symbol: '♀' },
  { label: getLocalDayName(6), value: 'sat', color: 'blue', symbol: '♄' },
];

const updateSchedule = (value: string) => {
  achievement.value.basicSchedule = value;
  achievement.value.scheduleType = value === 'custom' ? 'custom' : 'basic';
};

const updateField = (field: string, value: unknown) => {
  achievement.value[field] = value;
};

const toggleDay = (day: string) => {
  const current = achievement.value.repeatOnDays || [];
  const index = current.indexOf(day);
  let next;
  if (index > -1) {
    next = current.filter((d: string) => d !== day);
  } else {
    next = [...current, day];
  }
  achievement.value.repeatOnDays = next;
};
</script>

<style lang="scss" scoped>
  .achievement-schedule-tab {
    width: 95%;
    margin: 0 auto;
    padding: 1rem 0;
  }

  .schedule-section {
    margin-bottom: 2rem;
  }

  .section-header {
    font-family: "Press Start 2P";
    font-size: 0.7rem;
    color: var(--ion-color-medium);
    margin-bottom: 1rem;
    display: flex;
    align-items: center;
    text-transform: uppercase;
    letter-spacing: 1px;

    i {
      color: var(--ion-color-rpg);
    }
  }

  .date-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    justify-items: center;
  }

  .date-input-group {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .date-label {
    font-size: 0.6rem;
    font-weight: 700;
    color: var(--ion-color-medium);
    letter-spacing: 0.5px;
  }

  .date-value-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    text-align: center;
  }

  .text-muted {
    opacity: 0.5;
  }



  .frequency-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
  }

  .frequency-card__icon {
    font-size: 2rem;
    color: var(--ion-color-light);
    margin-bottom: 0.75rem;
    transition: all 0.3s ease;
    opacity: 0.8;
  }

  .frequency-card__name {
    font-size: 0.8rem;
    color: var(--ion-color-medium);
    font-weight: 500;
  }


  .config-card {
    background: rgba(var(--ion-color-rpg-rgb), 0.05);
    border: 1px solid rgba(var(--ion-color-rpg-rgb), 0.2);
    border-radius: 20px;
    padding: 1.25rem;
    margin-top: 1rem;
    backdrop-filter: blur(10px);
  }

  .rpg-toggle-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .rpg-toggle-title {
    font-weight: 700;
    color: #fff;
    font-size: 1rem;
  }

  .rpg-toggle-desc {
    font-size: 0.8rem;
    color: var(--ion-color-medium);
    margin-top: 2px;
  }

  .day-selector {
    display: flex;
    justify-content: space-between;
    gap: 15px;
  }

  .day-unit {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }

  .day-btn {
    width: 100%;
    aspect-ratio: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    font-weight: 700;
    color: var(--ion-color-medium);
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    font-size: 0.9rem;

    &:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.3);
    }

    &.day-btn--selected {
      color: #fff;
      transform: scale(1.1);
      z-index: 1;
      border-width: 2px;
    }
  }

  .day-symbol {
    font-size: 1.42rem;
    opacity: 0.3;
    transition: all 0.3s ease;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: serif;
  }

  // ROYGBIV Spectrum Logic
  .day-unit {
    &.red {

      .day-btn:hover,
      .day-btn--selected {
        background: linear-gradient(90deg, #b30000 0%, #ff4c4c 100%);
        border-color: #ff8080;
        box-shadow: 0 0 15px rgba(255, 0, 0, 0.4);
      }

      .day-btn--selected~.day-symbol,
      .day-btn:hover~.day-symbol {
        color: #ff4c4c;
        opacity: 1;
        text-shadow: 0 0 8px rgba(255, 76, 76, 0.6);
      }
    }

    &.orange {

      .day-btn:hover,
      .day-btn--selected {
        background: linear-gradient(90deg, #cc5200 0%, #ff944d 100%);
        border-color: #ffb380;
        box-shadow: 0 0 15px rgba(255, 127, 0, 0.4);
      }

      .day-btn--selected~.day-symbol,
      .day-btn:hover~.day-symbol {
        color: #ff944d;
        opacity: 1;
        text-shadow: 0 0 8px rgba(255, 148, 77, 0.6);
      }
    }

    &.yellow {

      .day-btn:hover,
      .day-btn--selected {
        background: linear-gradient(90deg, #e6e600 0%, #ffff80 100%);
        border-color: #ffffb3;
        color: #000;
        box-shadow: 0 0 15px rgba(255, 255, 0, 0.4);
      }

      .day-btn--selected~.day-symbol,
      .day-btn:hover~.day-symbol {
        color: #ffff80;
        opacity: 1;
        text-shadow: 0 0 8px rgba(255, 255, 128, 0.6);
      }
    }

    &.green {

      .day-btn:hover,
      .day-btn--selected {
        background: linear-gradient(90deg, #009900 0%, #4dff4d 100%);
        border-color: #b3ffb3;
        color: #000;
        box-shadow: 0 0 15px rgba(0, 255, 0, 0.4);
      }

      .day-btn--selected~.day-symbol,
      .day-btn:hover~.day-symbol {
        color: #4dff4d;
        opacity: 1;
        text-shadow: 0 0 8px rgba(77, 255, 77, 0.6);
      }
    }

    &.blue {

      .day-btn:hover,
      .day-btn--selected {
        background: linear-gradient(90deg, #0047b3 0%, #4d94ff 100%);
        border-color: #80b3ff;
        box-shadow: 0 0 15px rgba(0, 71, 179, 0.4);
      }

      .day-btn--selected~.day-symbol,
      .day-btn:hover~.day-symbol {
        color: #4d94ff;
        opacity: 1;
        text-shadow: 0 0 8px rgba(77, 148, 255, 0.6);
      }
    }

    &.indigo {

      .day-btn:hover,
      .day-btn--selected {
        background: linear-gradient(90deg, #30064e 0%, #6a0dad 100%);
        border-color: #9d4edd;
        box-shadow: 0 0 15px rgba(106, 13, 173, 0.4);
      }

      .day-btn--selected~.day-symbol,
      .day-btn:hover~.day-symbol {
        color: #9d4edd;
        opacity: 1;
        text-shadow: 0 0 8px rgba(157, 78, 221, 0.6);
      }
    }

    &.violet {

      .day-btn:hover,
      .day-btn--selected {
        background: linear-gradient(90deg, #660080 0%, #bf00ff 100%);
        border-color: #d633ff;
        box-shadow: 0 0 15px rgba(191, 0, 255, 0.4);
      }

      .day-btn--selected~.day-symbol,
      .day-btn:hover~.day-symbol {
        color: #bf00ff;
        opacity: 1;
        text-shadow: 0 0 8px rgba(191, 0, 255, 0.6);
      }
    }
  }

  .custom-layout {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    justify-content: center;
  }

  .custom-field {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .custom-label {
    font-size: 0.6rem;
    font-weight: 700;
    color: var(--ion-color-medium);
    text-transform: uppercase;
    margin-bottom: 0.5rem;
  }

  .custom-input-group {
    display: flex;
    align-items: center;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 12px;
    padding: 4px 12px;
    border: 1px solid rgba(255, 255, 255, 0.1);

    input {
      background: transparent;
      border: none;
      color: #fff;
      font-size: 1.2rem;
      font-weight: 700;
      width: 40px;
      text-align: center;
      outline: none;
      padding: 8px 0;
    }

    .unit {
      font-size: 0.8rem;
      color: var(--ion-color-medium);
      margin-left: 8px;
    }
  }

  .interval-select {
    --placeholder-color: var(--ion-color-medium);
    --color: #fff;
    font-weight: 700;
    font-size: 0.9rem;
    margin-left: 8px;
  }

  .custom-separator {
    font-family: "Press Start 2P";
    font-size: 0.6rem;
    color: var(--ion-color-rpg);
    opacity: 0.5;
    margin-top: 1rem;
  }

  .sub-label {
    font-size: 0.65rem;
    font-weight: 700;
    color: var(--ion-color-medium);
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .mt-4 {
    margin-top: 1.5rem;
  }

  .mb-2 {
    margin-bottom: 0.75rem;
  }

  .mr-2 {
    margin-right: 0.5rem;
  }
</style>

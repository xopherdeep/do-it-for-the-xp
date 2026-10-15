<template>
  <div class="achievement-schedule-tab">
    <div class="schedule-section">
      <div class="section-header">
        <div class="header-start">
          <i class="fad fa-hourglass-start mr-2"></i>
          <span>Time Oracle</span>
        </div>
        <ion-button
          class="ai-oracle-btn"
          fill="clear"
          size="small"
          @click="askOracle"
          :disabled="isGeneratingSchedule"
        >
          <i
            v-if="isGeneratingSchedule"
            class="fad fa-spinner-third fa-spin mr-1"
          ></i>
          <i
            v-else-if="!pro.isPro"
            class="fad fa-lock mr-1"
            data-cy="oracle-lock"
          ></i>
          <i
            v-else
            class="fad fa-sparkles mr-1"
          ></i>
          {{ isGeneratingSchedule ? 'Consulting...' : 'Ask Oracle' }}
        </ion-button>
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

      <!-- Times of day: which calendar tabs list this chore. Several means it is done that many times a day. -->
      <div class="times-of-day">
        <div class="date-label">TIMES OF DAY</div>
        <div
          class="times-row"
          role="group"
          aria-label="Times of day"
        >
          <button
            v-for="time in TIMES_OF_DAY"
            :key="time"
            type="button"
            class="time-chip"
            :class="{ 'is-on': hasTime(time) }"
            :aria-pressed="hasTime(time)"
            @click="toggleTime(time)"
          >
            <i
              v-if="!pro.isPro"
              class="fad fa-lock time-chip__icon"
              data-cy="time-lock"
            ></i>
            <i
              v-else
              :class="['fad', hasTime(time) ? 'fa-check' : TIME_OF_DAY_ICONS[time], 'time-chip__icon']"
            ></i>
            <span class="time-chip__name">{{ TIME_OF_DAY_LABELS[time] }}</span>
          </button>
        </div>
        <p class="times-note">Picks which calendar tabs list this chore. Two or more mean it is done that many times a day.</p>
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
          <span class="frequency-card__name">
            <i
              v-if="type === 'custom' && !pro.isPro"
              class="fad fa-lock mr-1"
              data-cy="custom-lock"
            ></i>{{ type.charAt(0).toUpperCase() + type.slice(1) }}
          </span>
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

        <!-- Daily Details -->
        <div
          v-if="achievement.basicSchedule === 'daily'"
          class="config-card"
        >
          <div class="config-card__content">
            <div class="custom-layout">
              <div class="custom-field">
                <span class="custom-label">Times Per Day</span>
                <div class="custom-input-group">
                  <input
                    type="number"
                    :value="achievement.customFrequency"
                    @input="updateTimesPerDay($event.target as HTMLInputElement)"
                    min="1"
                    data-cy="times-per-day"
                  />
                  <i
                    v-if="!pro.isPro"
                    class="fad fa-lock ml-1"
                  ></i>
                  <span class="unit">Time(s)</span>
                </div>
              </div>
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
                    data-cy="custom-repeat"
                    :value="achievement.customFrequency"
                    :readonly="!pro.isPro"
                    @click="lockedTap"
                    @input="updateCustomField('customFrequency', $event.target as HTMLInputElement)"
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
                    data-cy="custom-interval"
                    :value="achievement.customPeriodNumber"
                    :readonly="!pro.isPro"
                    @click="lockedTap"
                    @input="updateCustomField('customPeriodNumber', $event.target as HTMLInputElement)"
                    min="1"
                  />
                  <div
                    class="interval-select-wrap"
                    data-cy="custom-period"
                    @click.capture="lockedTap"
                  >
                    <ion-select
                      :value="achievement.customPeriodType"
                      @ionChange="pro.isPro && updateField('customPeriodType', $event.detail.value)"
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

            <div
              class="schedule-summary mt-4"
              v-if="scheduleSummary"
            >
              <i class="fad fa-info-circle mr-2"></i>
              {{ scheduleSummary }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { inject, computed } from 'vue';
import {
  IonCheckbox,
  IonSelect,
  IonSelectOption,
  IonButton,
} from '@ionic/vue';
import { BASIC_SCHEDULE_ICONS } from "@/constants";
import XpGlassCard from "@/components/atoms/XpGlassCard.vue";
import { play$fx } from "@/assets/fx";
import { TIMES_OF_DAY, type TimeOfDay } from "@/lib/engine/quests/QuestSchedule";
import { AchievementFormInjectionKey } from "../hooks/useAchievementForm";
import { useProStore } from "@/lib/store/stores/pro";
import { TIME_OF_DAY_ICONS, TIME_OF_DAY_LABELS, toggleTimeOfDay } from "../hooks/timesOfDayEditor";

const {
  achievement,
  startsModalOpen,
  endsModalOpen,
  dueModalOpen,
  createScheduleWithAI: generateScheduleWithAI,
  isGeneratingSchedule
} = inject(AchievementFormInjectionKey) as any;

const pro = useProStore();

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
    const isDateTimeString = timeStr.includes('T') || timeStr.includes('-');
    if (isDateTimeString) {
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

// XP Pro: custom repeats, the times-of-day chips and "times per day" above 1 are Pro. A free family can still
// see (and keep) what a saved quest already has; only changing it opens the upsell.
const updateSchedule = async (value: string) => {
  const isSwitchingToCustom = value === 'custom' && achievement.value.basicSchedule !== 'custom';
  if (isSwitchingToCustom) {
    const hasPro = await pro.requirePro('advancedSchedule');
    if (!hasPro) return;
  }
  achievement.value.basicSchedule = value;
  achievement.value.scheduleType = value === 'custom' ? 'custom' : 'basic';
};

const updateField = (field: string, value: unknown) => {
  achievement.value[field] = value;
};

// A free family sees the saved custom schedule but cannot change it: the inputs are read-only and a tap asks for Pro.
const lockedTap = (event: Event) => {
  if (pro.isPro) return;
  event.preventDefault();
  event.stopPropagation();
  void pro.requirePro('advancedSchedule');
};

const updateCustomField = (field: string, input: HTMLInputElement) => {
  if (!pro.isPro) {
    input.value = String(achievement.value[field] ?? '');
    void pro.requirePro('advancedSchedule');
    return;
  }
  updateField(field, parseInt(input.value));
};

const toggleDay = (day: string) => {
  const current = achievement.value.repeatOnDays || [];
  const index = current.indexOf(day);
  let next;
  const isSelected = index > -1;
  if (isSelected) {
    next = current.filter((d: string) => d !== day);
  } else {
    next = [...current, day];
  }
  achievement.value.repeatOnDays = next;
};

const hasTime = (time: TimeOfDay) => Boolean(achievement.value.timesOfDay?.includes(time));

const toggleTime = async (time: TimeOfDay) => {
  const hasPro = await pro.requirePro('advancedSchedule');
  if (!hasPro) return;
  achievement.value.timesOfDay = toggleTimeOfDay(achievement.value.timesOfDay, time);
  play$fx('select');
};

const updateTimesPerDay = async (input: HTMLInputElement) => {
  const value = parseInt(input.value);
  const isLockedByPro = value > 1 && !pro.isPro;
  if (isLockedByPro) {
    input.value = String(achievement.value.customFrequency || 1);
    await pro.requirePro('advancedSchedule');
    return;
  }
  updateField('customFrequency', value);
};

const askOracle = async () => {
  const hasPro = await pro.requirePro('aiHelpers');
  if (!hasPro) return;
  generateScheduleWithAI();
};

const scheduleSummary = computed(() => {
  const { customFrequency, customPeriodNumber, customPeriodType, basicSchedule } = achievement.value;
  
  const isCustom = basicSchedule === 'custom';
  if (!isCustom) return '';

  const freq = customFrequency || 1;
  const period = customPeriodNumber || 1;
  const type = customPeriodType || 'day';
  
  const typeStr = period === 1 ? type : type + 's';
  
  return `Repeat ${freq} time${freq > 1 ? 's' : ''} every ${period} ${typeStr}.`;
});
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
    font-family: var(--xp-app-font-title);
    font-size: 0.8rem;
    color: var(--xp-app-text-dim);
    margin-bottom: 1rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    text-transform: uppercase;
    letter-spacing: 1px;

    .header-start {
      display: flex;
      align-items: center;
    }

    i {
      color: var(--ion-color-rpg);
    }
  }

  .ai-oracle-btn {
    --color: var(--ion-color-tertiary);
    font-family: "Press Start 2P";
    font-size: 0.6rem;
    height: 24px;
    margin: 0;
  }

  .date-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    justify-items: stretch;

    :deep(.xp-glass-card) {
      min-height: 90px;
    }
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

  .times-of-day {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .times-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
  }

  // Toggle chip: muted until picked, then AP blue with a check
  .time-chip {
    min-height: 56px;
    padding: 6px 4px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    cursor: pointer;
    font-family: inherit;
    color: var(--ion-color-medium);
    background: rgba(255, 255, 255, 0.05);
    border: 2px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    opacity: 0.75;
    transition: all 0.2s ease;

    &.is-on {
      color: #10101c;
      background: var(--xp-color-ap);
      border-color: var(--xp-color-ap);
      box-shadow: 0 0 8px var(--xp-color-ap);
      opacity: 1;

      .time-chip__icon {
        color: #10101c;
      }
    }
  }

  .time-chip__icon {
    font-size: 1.25rem;
  }

  .time-chip__name {
    font-size: 0.8rem;
    font-weight: 700;
  }

  .times-note {
    margin: 0;
    font-size: 0.75rem;
    line-height: 1.3;
    color: var(--ion-color-medium);
  }



  .frequency-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;

    :deep(.xp-glass-card) {
      min-height: 90px;
    }

    // Selected state styling for icons and labels inside frequency cards
    :deep(.xp-glass-card--selected) {
      .frequency-card__icon {
        color: var(--ion-color-rpg);
        opacity: 1;
        filter: drop-shadow(0 0 6px rgba(var(--ion-color-rpg-rgb), 0.5));
      }

      .frequency-card__name {
        color: var(--ion-color-light);
      }
    }
  }

  .frequency-card__icon {
    font-size: 2rem;
    color: var(--ion-color-light);
    margin-bottom: 0.75rem;
    transition: all 0.3s ease;
    opacity: 0.5;
  }

  .frequency-card__name {
    font-size: 0.8rem;
    color: var(--ion-color-medium);
    font-weight: 500;
    transition: color 0.3s ease;
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

  .schedule-summary {
    background: rgba(var(--ion-color-primary-rgb), 0.1);
    border: 1px solid rgba(var(--ion-color-primary-rgb), 0.2);
    border-radius: 12px;
    padding: 1rem;
    text-align: center;
    font-size: 0.9rem;
    color: var(--ion-color-light);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 500;

    i {
      color: var(--ion-color-primary);
    }
  }
</style>

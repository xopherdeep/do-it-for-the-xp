<template>
  <ion-modal
    :is-open="isOpen"
    @didDismiss="$emit('close')"
    class="job-class-selector"
  >
    <ion-header>
      <ion-toolbar class="rpg-box">
        <ion-title>Choose Your Class</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="$emit('close')">
            <ion-icon :icon="closeOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content
      class="rpg-box class-selector-content bg-slide bg-slide-modal"
      :scrollY="true"
    >
      <div class="selection-container">
        <!-- 1. Class Selection Grid (Top) -->
        <div class="class-selection">
          <div class="classes-grid">
            <div
              v-for="job in jobClassOptions"
              :key="job.name"
              class="class-option"
              :class="{ selected: job.name === modelValue }"
              @click="selectClass(job.name)"
            >
              <div class="class-icon-container" :class="job.name.toLowerCase()">
                <i :class="`fad ${job.icon} fa-2x`"></i>
              </div>
              <div class="class-name">{{ job.name }}</div>

              <!-- <div class="class-stats-peek">
                <div class="stat-peek">
                  <i :class="getAreaFaIcon(job.primaryPillar)"></i>
                  <span>{{ getAreaLabel(job.primaryPillar) }}</span>
                </div>
              </div> -->
            </div>
          </div>
        </div>

        <!-- 2. Selected Class Detail View (Bottom) -->
        <div class="character-preview" v-if="selectedJob">
          <div class="class-details">
            <div class="class-description">
              {{ selectedJob.description }}
            </div>

            <div class="pillar-boosts-container">
              <div class="pillars-grid">
                <div
                  class="pillar-item primary"
                  :style="{
                    borderLeftColor: `var(--ion-color-${getAreaColor(
                      selectedJob.primaryPillar
                    )})`,
                  }"
                >
                  <div class="pillar-icon">
                    <i
                      :class="getAreaFaIcon(selectedJob.primaryPillar)"
                      :style="{
                        color: `var(--ion-color-${getAreaColor(
                          selectedJob.primaryPillar
                        )})`,
                      }"
                    ></i>
                  </div>
                  <div class="pillar-info">
                    <span class="pillar-rank">Primary</span>
                    <span class="pillar-name">{{
                      getAreaLabel(selectedJob.primaryPillar)
                    }}</span>
                  </div>
                </div>
                <div
                  class="pillar-item secondary"
                  :style="{
                    borderLeftColor: `var(--ion-color-${getAreaColor(
                      selectedJob.secondaryPillar
                    )})`,
                  }"
                >
                  <div class="pillar-icon">
                    <i
                      :class="getAreaFaIcon(selectedJob.secondaryPillar)"
                      :style="{
                        color: `var(--ion-color-${getAreaColor(
                          selectedJob.secondaryPillar
                        )})`,
                      }"
                    ></i>
                  </div>
                  <div class="pillar-info">
                    <span class="pillar-rank">Secondary</span>
                    <span class="pillar-name">{{
                      getAreaLabel(selectedJob.secondaryPillar)
                    }}</span>
                  </div>
                </div>
                <div
                  class="pillar-item tertiary"
                  :style="{
                    borderLeftColor: `var(--ion-color-${getAreaColor(
                      selectedJob.tertiaryPillar
                    )})`,
                  }"
                >
                  <div class="pillar-icon">
                    <i
                      :class="getAreaFaIcon(selectedJob.tertiaryPillar)"
                      :style="{
                        color: `var(--ion-color-${getAreaColor(
                          selectedJob.tertiaryPillar
                        )})`,
                      }"
                    ></i>
                  </div>
                  <div class="pillar-info">
                    <span class="pillar-rank">Tertiary</span>
                    <span class="pillar-name">{{
                      getAreaLabel(selectedJob.tertiaryPillar)
                    }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ion-content>

    <ion-footer>
      <ion-toolbar class="rpg-box">
        <ion-button
          expand="block"
          color="primary"
          class="confirm-button"
          @click="$emit('close')"
        >
          <i class="fad fa-check-circle mr-2"></i>
          Confirm Selection
        </ion-button>
      </ion-toolbar>
    </ion-footer>
  </ion-modal>
</template>

<script lang="ts">
  import { defineComponent, ref, computed } from "vue";
  import { JOB_CLASS_OPTIONS } from "@/constants";
  import { closeOutline } from "ionicons/icons";
  import Ionic from "@/lib/mixins/ionic";

  export default defineComponent({
    name: "JobClassSelector",
    mixins: [Ionic],
    props: {
      isOpen: {
        type: Boolean,
        required: true,
      },
      modelValue: {
        type: String,
        required: true,
      },
    },
    emits: ["update:modelValue", "close"],
    setup(props, { emit }) {
      // A new hero starts as a base class (Warrior, Mage, Thief or Monk); the rest are reached through the Class Codex
      const jobClassOptions = ref(JOB_CLASS_OPTIONS.filter((job) => !job.tier || job.tier === 1));

      // The preview still knows every class, so a hero who already plays an advanced one sees their own card
      const selectedJob = computed(() =>
        JOB_CLASS_OPTIONS.find((job) => job.name === props.modelValue)
      );

      // Pillar helpers matching UserProfileModal
      const getAreaLabel = (pillar: string) => {
        const labels: Record<string, string> = {
          physical: "Body",
          mental: "Mind",
          vibrational: "Spirit",
          relational: "Heart",
          eternal: "Legend",
        };
        return labels[pillar] || pillar;
      };

      const getAreaFaIcon = (pillar: string) => {
        const iconMap: Record<string, string> = {
          physical: "fad fa-heartbeat",
          mental: "fad fa-brain",
          vibrational: "fad fa-waveform",
          eternal: "fad fa-atom",
          relational: "fad fa-handshake-alt",
        };
        return iconMap[pillar] || "fad fa-chart-bar";
      };

      const getAreaColor = (pillar: string) => {
        const colorMap: Record<string, string> = {
          physical: "danger",
          mental: "tertiary",
          vibrational: "secondary",
          relational: "warning",
          eternal: "success",
        };
        return colorMap[pillar] || "primary";
      };

      // Get the icon for the selected class
      const getSelectedClassIcon = () => {
        if (!props.modelValue) return "";
        const selectedClass = JOB_CLASS_OPTIONS.find(
          (job) => job.name === props.modelValue
        );
        return selectedClass ? selectedClass.icon : "";
      };

      // Select a class
      const selectClass = (className: string) => {
        emit("update:modelValue", className);
      };

      return {
        jobClassOptions,
        selectedJob,
        getAreaLabel,
        getAreaFaIcon,
        getAreaColor,
        closeOutline,
        getSelectedClassIcon,
        selectClass,
      };
    },
  });
</script>

<style lang="scss" scoped src="./_JobClassSelector.scss" />

<template>
  <ion-page :class="$options.name">
    <ion-header>
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <xp-back-button :icon="arrowBack"></xp-back-button>
        </ion-buttons>
        <ion-title>My Look</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content
      :fullscreen="true"
      class="ion-padding rpg-box bg-slide"
    >
      <div
        v-if="user"
        class="look-layout"
      >
        <!-- The hero, the animation chips and the pickers (tab strip at the bottom) -->
        <xp-look-editor
          ref="editor"
          v-model="draft"
          :equipment="equipment"
          :preview="preview"
        >
          <template #stage>
            <span
              v-if="dirty"
              class="unsaved-tag"
            >Unsaved</span>
          </template>

          <!-- Animation preview chips -->
          <div
            class="chip-row"
            role="group"
            aria-label="Preview animation"
          >
            <button
              v-for="anim in ANIMATIONS"
              :key="anim.id"
              type="button"
              class="look-chip"
              :class="{ active: preview === anim.id }"
              :aria-pressed="preview === anim.id"
              @click="preview = anim.id"
            >
              {{ anim.label }}
            </button>
          </div>
        </xp-look-editor>

        <div class="action-row">
          <button
            type="button"
            class="look-button reset"
            @click="reset"
          >
            <i class="fad fa-undo mr-1"></i> Reset
          </button>
          <button
            type="button"
            class="look-button save"
            :disabled="saving"
            @click="save"
          >
            <i class="fad fa-save mr-1"></i> Save look
          </button>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script lang="ts" src="./MyLook.ts" />
<style lang="scss" src="./_MyLook.scss" scoped />

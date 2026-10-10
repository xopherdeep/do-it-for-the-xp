<template>
  <ion-page :class="$options.name">
    <ion-header>
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <ion-back-button
            :default-href="`/my-portal/${userId}/my-profile`"
            :icon="arrowBack"
          ></ion-back-button>
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
        <!-- The hero, on the sky-blue checkerboard -->
        <section class="look-stage eb-box">
          <XpHeroModel
            ref="model"
            class="look-model"
            :look="previewLook"
            :animation="preview"
            interactive
          />
          <span
            v-if="dirty"
            class="unsaved-tag"
          >Unsaved</span>
        </section>

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

        <!-- Pickers -->
        <section class="look-panel eb-box">
          <div
            class="tab-strip"
            role="tablist"
          >
            <button
              v-for="t in TABS"
              :key="t.id"
              type="button"
              role="tab"
              class="tab"
              :class="{ active: tab === t.id }"
              :aria-selected="tab === t.id"
              @click="tab = t.id"
            >
              {{ t.label }}
            </button>
          </div>

          <div class="tab-body">
            <div
              v-if="current.styles"
              class="picker"
            >
              <h4 class="picker-title">Style</h4>
              <div class="style-grid">
                <button
                  v-for="style in current.styles.options"
                  :key="style"
                  type="button"
                  class="style-button"
                  :class="{ active: draft[current.styles.key] === style }"
                  :aria-pressed="draft[current.styles.key] === style"
                  @click="pick(current.styles.key, style)"
                >
                  {{ styleLabel(style) }}
                </button>
              </div>
            </div>

            <div
              v-for="group in current.colors"
              :key="group.key"
              class="picker"
            >
              <h4 class="picker-title">{{ group.label }}</h4>
              <div class="color-grid">
                <button
                  v-for="swatch in group.swatches"
                  :key="swatch.value"
                  type="button"
                  class="swatch"
                  :class="{ active: draft[group.key] === swatch.value }"
                  :style="{ backgroundColor: swatch.color }"
                  :aria-label="swatch.name"
                  :aria-pressed="draft[group.key] === swatch.value"
                  @click="pick(group.key, swatch.value)"
                ></button>
              </div>
            </div>
          </div>
        </section>

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

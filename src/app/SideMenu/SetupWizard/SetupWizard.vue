<template>
  <xp-wizard-shell
    v-model:index="index"
    :steps="SETUP_STEPS"
    :draft="draft"
    title="Set Up"
    icon="flag"
    accent="quests"
    verb="Begin"
    verb-icon="play"
    :busy="isBusy"
    class="setup-wizard"
    @close="close"
    @submit="begin"
  >
    <!-- 1. FAMILY: one row per hero; the parent of a new game names themselves and picks a PIN -->
    <template #family>
      <section class="sw-section" data-test="step-family">
        <ul class="sw-heroes">
          <li v-for="hero in draft.heroes" :key="hero.id" class="sw-hero" data-test="hero-row">
            <template v-if="hero.existing">
              <span class="sw-hero__name">{{ hero.name || "Hero" }}</span>
              <span v-if="hero.isParent" class="sw-hero__tag"><i class="fad fa-crown" aria-hidden="true"></i> Game Master</span>
            </template>
            <template v-else-if="hero.isParent && draft.gameMaster">
              <ion-input
                v-model="draft.gameMaster.name"
                class="sw-input"
                aria-label="Your name"
                placeholder="Parent: your name"
                :maxlength="nameLength"
                autocapitalize="words"
                data-test="gm-name"
              />
              <ion-input
                v-model="draft.gameMaster.passcode"
                class="sw-input sw-input--pin"
                aria-label="Your 4-digit PIN"
                placeholder="PIN"
                type="password"
                inputmode="numeric"
                :maxlength="4"
                data-test="gm-pin"
              />
            </template>
            <ion-input
              v-else
              v-model="hero.name"
              class="sw-input"
              :aria-label="`Hero ${hero.name || 'name'}`"
              placeholder="Hero's name"
              :maxlength="nameLength"
              autocapitalize="words"
              data-test="hero-name"
            />

            <div v-if="!hero.isParent" class="sw-age" role="group" :aria-label="`${hero.name || 'Hero'}'s age`">
              <button type="button" class="sw-age__btn" aria-label="Younger" data-test="age-down" @click="stepAge(hero, -1)">
                <i class="fad fa-minus" aria-hidden="true"></i>
              </button>
              <span class="sw-age__n" data-test="age">{{ hero.age ?? "?" }}</span>
              <button type="button" class="sw-age__btn" aria-label="Older" data-test="age-up" @click="stepAge(hero, 1)">
                <i class="fad fa-plus" aria-hidden="true"></i>
              </button>
            </div>
            <button
              v-if="!hero.existing && !(hero.isParent && draft.gameMaster)"
              type="button"
              class="sw-hero__x"
              :aria-label="`Remove ${hero.name || 'hero'}`"
              @click="removeHero(hero)"
            >
              <i class="fad fa-times-circle" aria-hidden="true"></i>
            </button>
          </li>
        </ul>
        <p v-if="hasNewParent" class="sw-note">
          The Game Master approves finished quests and changes the rules. The PIN keeps the kids out of those controls.
        </p>
        <button v-if="canAddHero" type="button" class="sw-add" data-test="add-hero" @click="addHero">
          <i class="fad fa-plus" aria-hidden="true"></i> Add hero
        </button>
      </section>
    </template>

    <!-- 2. HOUSE: the rooms that have monsters -->
    <template #house>
      <section class="sw-section" data-test="step-house">
        <div class="sw-chips">
          <button
            v-for="room in rooms"
            :key="room"
            type="button"
            class="sw-chip"
            :class="{ 'is-picked': draft.rooms.includes(room) }"
            :aria-pressed="draft.rooms.includes(room)"
            data-test="room-chip"
            @click="toggleRoom(room)"
          >
            {{ room }}
          </button>
        </div>
      </section>
    </template>

    <!-- 3. REVIEW: each hero's beasts, ticked from their age and the rooms; untick or add more -->
    <template #review>
      <section class="sw-section" data-test="step-review">
        <div v-for="hero in draft.heroes" :key="hero.id" class="sw-review" data-test="review-hero">
          <h2 class="sw-sub">{{ hero.name || "Hero" }}</h2>
          <ul class="sw-beasts">
            <li v-for="beast in tickedFor(hero)" :key="String(beast.id)">
              <button type="button" class="sw-beast is-picked" aria-pressed="true" data-test="beast-card" @click="toggleChore(hero, String(beast.id))">
                <img v-if="portrait(beast)" :src="portrait(beast) ?? ''" alt="" loading="lazy" class="sw-beast__art" />
                <i v-else class="fad fa-dragon sw-beast__art" aria-hidden="true"></i>
                <span class="sw-beast__text">
                  <span class="sw-beast__name">{{ beast.name }}</span>
                  <span class="sw-beast__chore">{{ beast.chore }}</span>
                </span>
                <i class="fad fa-check-square sw-beast__tick" aria-hidden="true"></i>
              </button>
            </li>
          </ul>
          <p v-if="!tickedFor(hero).length" class="sw-note" data-test="review-empty">Nothing common here, add your own</p>

          <ul v-if="suggestionsFor(hero).length" class="sw-beasts sw-beasts--found">
            <li v-for="beast in suggestionsFor(hero)" :key="String(beast.id)">
              <button type="button" class="sw-beast" data-test="suggestion" @click="addSuggested(hero, beast)">
                <img v-if="portrait(beast)" :src="portrait(beast) ?? ''" alt="" loading="lazy" class="sw-beast__art" />
                <i v-else class="fad fa-dragon sw-beast__art" aria-hidden="true"></i>
                <span class="sw-beast__text">
                  <span class="sw-beast__name">{{ beast.name }}</span>
                  <span class="sw-beast__chore">{{ beast.chore }}</span>
                </span>
                <i class="fad fa-plus-square sw-beast__tick" aria-hidden="true"></i>
              </button>
            </li>
          </ul>
          <ion-input
            v-model="searches[hero.id]"
            class="sw-input sw-input--search"
            :aria-label="`Add a chore for ${hero.name || 'this hero'}`"
            placeholder="Add a chore (dishes, laundry...)"
            data-test="chore-search"
          />
        </div>
      </section>
    </template>

    <!-- 4. EXTRAS: one switch -->
    <template #extras>
      <section class="sw-section" data-test="step-extras">
        <label class="sw-extras">
          <span class="sw-extras__text">
            <span class="sw-extras__title">Stock the world</span>
            <span class="sw-extras__what">Adds starter shops, accessories, abilities and house rules.</span>
          </span>
          <ion-toggle v-model="draft.extras" aria-label="Stock the world" data-test="extras-toggle" />
        </label>
      </section>
    </template>

    <!-- 5. SUMMARY: counts and lists; tap a line to change it -->
    <template #summary>
      <section class="sw-section" data-test="step-summary">
        <button type="button" class="sw-line" data-test="line-family" @click="goTo(0)">
          <i class="fad fa-users" aria-hidden="true"></i>
          <span>{{ draft.heroes.length }} {{ draft.heroes.length === 1 ? "hero" : "heroes" }}</span>
        </button>
        <button type="button" class="sw-line" data-test="line-house" @click="goTo(1)">
          <i class="fad fa-house" aria-hidden="true"></i>
          <span>{{ draft.rooms.length }} {{ draft.rooms.length === 1 ? "room" : "rooms" }}: {{ draft.rooms.join(", ") }}</span>
        </button>
        <button v-for="hero in draft.heroes" :key="hero.id" type="button" class="sw-line sw-line--hero" data-test="line-hero" @click="goTo(2)">
          <i class="fad fa-paw-claws" aria-hidden="true"></i>
          <span>
            <strong>{{ hero.name || "Hero" }}</strong>: {{ tickedFor(hero).length }} chores
            <span class="sw-line__list">{{ tickedFor(hero).map((beast) => beast.chore).join(", ") }}</span>
          </span>
        </button>
        <button type="button" class="sw-line" data-test="line-extras" @click="goTo(3)">
          <i class="fad fa-sparkles" aria-hidden="true"></i>
          <span>{{ draft.extras ? "Starter world on" : "Starter world off" }}</span>
        </button>
        <p v-if="error" class="sw-error" role="alert" data-test="setup-error">{{ error }}</p>
      </section>
    </template>
  </xp-wizard-shell>
</template>

<script setup lang="ts">
import { IonInput, IonToggle } from "@ionic/vue";
import XpWizardShell from "@/components/organisms/WizardShell/XpWizardShell.vue";
import { beastPortraitUrl } from "@/app/Admin/XpCompendium/views/XpTemples/components/XpTempleCreator/components/beastPortrait";
import { libraryRooms } from "@/lib/services/bestiary/librarySuggest";
import { SETUP_STEPS } from "@/lib/services/setup/setupSteps";
import { useSetupWizard } from "./useSetupWizard";

const rooms = libraryRooms();
const portrait = (beast: { avatar?: number | null }): string | null => beastPortraitUrl(beast.avatar);
const {
  draft, index, isBusy, error, searches, hasNewParent, canAddHero, nameLength,
  addHero, removeHero, stepAge, toggleRoom, tickedFor, toggleChore, suggestionsFor, addSuggested, goTo, close, begin,
} = useSetupWizard();
</script>

<style scoped lang="scss" src="./_SetupWizard.scss" />

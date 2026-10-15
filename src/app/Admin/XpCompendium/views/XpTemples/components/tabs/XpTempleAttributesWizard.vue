<template>
  <!-- Config > General as the shared wizard: Name and theme > Check and open (Save). The Creator and the room editor are not wizards. -->
  <ion-page class="temple-attributes-wizard" :class="rootClass" :style="rootStyle">
    <xp-wizard-shell
      v-if="isOpened"
      v-model:index="position"
      :steps="steps"
      :draft="draft"
      :title="isStored ? 'Edit Temple' : 'New Temple'"
      icon="dungeon"
      verb="Save"
      verb-icon="save"
      :busy="isSaving"
      @close="dismiss"
      @submit="save"
    >
      <!-- 1. NAME AND THEME: what it is called and what it guards; the name and the sign sit at the bottom, in thumb reach -->
      <template #name>
        <section class="tw-section" data-test="step-name">
          <div class="tw-hero">
            <span class="tw-hero__tile"><i :class="iconClassOf(draft.icon)" aria-hidden="true"></i></span>
            <span class="tw-hero__name" :class="{ 'is-empty': !draft.name.trim() }" data-test="nameplate">
              {{ draft.name.trim() || "Name it below" }}
            </span>
          </div>

          <h2 class="tw-sub">Say what it is</h2>
          <textarea
            v-model="draft.description"
            class="tw-text"
            rows="3"
            maxlength="240"
            placeholder="A tower lashed to the top of the world"
            aria-label="Description"
            data-test="description"
          ></textarea>

          <h2 class="tw-sub">Domains it guards</h2>
          <div v-if="categories.length" class="tw-chips" role="group" aria-label="Domains it guards">
            <button
              v-for="category in categories"
              :key="category.id"
              type="button"
              class="tw-chip"
              :class="{ 'is-picked': draft.categoryIds.includes(category.id) }"
              :aria-pressed="draft.categoryIds.includes(category.id)"
              :data-test="`domain-${category.id}`"
              @click="toggleDomain(category.id)"
            >
              <i :class="['fad', draft.categoryIds.includes(category.id) ? 'fa-check-circle' : 'fa-circle']" aria-hidden="true"></i>
              {{ category.name }}
            </button>
          </div>
          <p v-else class="tw-note" data-test="no-domains">No quest categories yet. Make one in a quest and it will be here.</p>
        </section>
      </template>

      <!-- 2. CHECK AND OPEN: the audit says what the temple still lacks; it never blocks the Save -->
      <template #check>
        <section class="tw-section" data-test="step-check">
          <button type="button" class="tw-hero tw-hero--button" aria-label="Change the name" data-test="back-to-name" @click="goToName">
            <span class="tw-hero__tile"><i :class="iconClassOf(draft.icon)" aria-hidden="true"></i></span>
            <span class="tw-hero__text">
              <span class="tw-hero__name" data-test="summary-title">{{ draft.name.trim() || "Nameless temple" }}</span>
              <span class="tw-hero__hint" data-test="summary-domains">{{ domainsText }}</span>
            </span>
            <i class="fad fa-pencil tw-hero__edit" aria-hidden="true"></i>
          </button>

          <p class="tw-verdict" :class="{ 'is-ready': audit.passed }" role="status" data-test="verdict">
            <i :class="['fad', audit.passed ? 'fa-check-circle' : 'fa-exclamation-circle']" aria-hidden="true"></i>
            <span>
              {{ audit.summary }}
              <template v-if="audit.passed"> · Ready to play</template>
            </span>
          </p>

          <ul class="tw-checks">
            <li
              v-for="check in audit.checks"
              :key="check.id"
              class="tw-check"
              :class="{ 'is-ok': check.ok }"
              :data-check="check.id"
            >
              <span class="tw-check__tile"><i :class="['fad', AUDIT_ICONS[check.id]]" aria-hidden="true"></i></span>
              <span class="tw-check__text">
                <span class="tw-check__label">{{ check.label }}</span>
                <span class="tw-check__detail">{{ check.detail }}</span>
              </span>
              <i :class="['fad', check.ok ? 'fa-check-circle' : 'fa-times-circle', 'tw-check__mark']" aria-hidden="true"></i>
            </li>
          </ul>

          <p class="tw-keys" :class="audit.keyBalance < 0 ? 'is-short' : 'is-enough'" data-test="key-balance">
            <i class="fad fa-key" aria-hidden="true"></i>
            <span>{{ audit.totalKeys }} keys for {{ audit.totalLockedDoors }} locks</span>
            <span class="tw-keys__verdict">
              {{ audit.keyBalance >= 0 ? "Every door can be opened" : "Not enough keys to open every door" }}
            </span>
          </p>
        </section>
      </template>

      <!-- The name and the sign sit at the bottom, above Back / Next, in thumb reach -->
      <template #above-nav="{ step: asked }">
        <template v-if="asked.id === 'name'">
          <div class="tw-signs" role="radiogroup" aria-label="Its sign" data-test="signs">
            <button
              v-for="choice in TEMPLE_ICON_CHOICES"
              :key="choice.id"
              type="button"
              role="radio"
              class="tw-sign"
              :class="{ 'is-picked': draft.icon === choice.id }"
              :aria-checked="draft.icon === choice.id"
              :aria-label="choice.label"
              :data-test="`sign-${choice.id}`"
              @click="pickSign(choice.id)"
            >
              <i :class="iconClassOf(choice.id)" aria-hidden="true"></i>
            </button>
          </div>
          <label class="xp-app-search" data-test="name-field">
            <i class="fad fa-signature" aria-hidden="true"></i>
            <input
              v-model="draft.name"
              type="text"
              placeholder="Name the temple"
              aria-label="Temple name"
              maxlength="60"
              autocomplete="off"
              enterkeyhint="done"
              data-test="name-input"
              @keyup.enter="closeKeyboard"
            />
          </label>
        </template>
      </template>
    </xp-wizard-shell>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, inject, onMounted, ref } from "vue";
import { IonPage, toastController } from "@ionic/vue";
import { useRouter } from "vue-router";
import { play$fx } from "@/assets/fx";
import XpWizardShell from "@/components/organisms/WizardShell/XpWizardShell.vue";
import { useAppSkin } from "@/components/organisms/XpApp/useAppSkin";
import { TempleDb, templeStorage } from "@/lib/databases/TempleDb";
import { ensureBuiltInTemples } from "@/lib/engine/core/dungeons/importAllTemples";
import debug from "@/lib/utils/debug";
import { TempleDataInjectionKey } from "../../hooks/useTempleData";
import { getTempleIconClass } from "../../hooks/useTempleIcon";
import {
  AUDIT_ICONS,
  attributesOpeningIndex,
  attributesWizardSteps,
  draftFromTemple,
  iconClassOf,
  TEMPLE_ICON_CHOICES,
  templePatch,
  toggleCategory,
} from "../../templeWizard";
import type { AttributesDraft, AttributesTemple } from "../../templeWizard";

/**
 * The Game Master's temple card (Config > General) on the shared wizard shell (docs: compendium-wizards-design, W6):
 * Name and theme, then Check and open, whose verb is Save. A temple that is not stored yet opens on its name; a stored
 * one opens on the check, with the dots to go back by. The audit never blocks the Save: a draft temple saves, as the
 * Temple Creator's own Save does. The save goes through the temple hook (templeDb.setTemple, with the layout the
 * creator holds), so the Audit and Navigator tabs next to this one see it at once.
 */

const props = defineProps<{ templeId: string; tab?: string }>();

const router = useRouter();
const templeDb = new TempleDb(templeStorage);
// Temples keep the Beast Log's purple (owner: the accent the Beast wizard chose, cream text on it)
const { rootClass, rootStyle } = useAppSkin("quests");

const { temple, categories, saveTemple, dungeonAudit: audit } = inject(TempleDataInjectionKey)!;

// What the temple wears when the Game Master has not picked a sign: the one its id has in the registry
const fallbackIcon = getTempleIconClass(props.templeId);

// ---- The draft ---------------------------------------------------------------------------------------------------

const steps = attributesWizardSteps();
const baseline = ref<AttributesTemple>({ id: props.templeId, categoryIds: [] });
const draft = ref<AttributesDraft>(draftFromTemple(baseline.value, fallbackIcon));
const position = ref(0);
// The shell waits for the stored temple, so a stored one never flashes empty on its first step
const isOpened = ref(false);
const isStored = ref(false);
const isSaving = ref(false);

onMounted(async () => {
  try {
    await ensureBuiltInTemples();
    const stored = await templeDb.getTempleById(props.templeId);
    // An id that holds nothing is a new temple: its first save writes it
    if (stored) {
      baseline.value = stored;
      draft.value = draftFromTemple(stored, fallbackIcon);
      isStored.value = true;
    }
  } catch (error) {
    debug.error("[TempleWizard] the temple could not be read", error);
  } finally {
    position.value = attributesOpeningIndex(steps, draft.value, isStored.value);
    isOpened.value = true;
  }
});

const domainsText = computed(() => {
  const names = categories.value.filter((category) => draft.value.categoryIds.includes(category.id)).map((category) => category.name);
  return names.length ? names.join(", ") : "No domains picked";
});

// ---- 1. Name and theme -------------------------------------------------------------------------------------------

const toggleDomain = (id: string) => {
  play$fx("cursor");
  draft.value.categoryIds = toggleCategory(draft.value.categoryIds, id);
};

const pickSign = (id: string) => {
  play$fx("cursor");
  draft.value.icon = id;
};

const closeKeyboard = (event: Event) => {
  (event.target as HTMLElement | null)?.blur();
};

// ---- 2. Check and open -------------------------------------------------------------------------------------------

// The hero card goes back to the step that owns the name (always allowed)
const goToName = () => {
  const at = steps.findIndex((step) => step.id === "name");
  if (at < 0) return;
  play$fx("cursor");
  position.value = at;
};

const say = async (message: string) => {
  try {
    const toast = await toastController.create({
      message,
      duration: 2600,
      position: "middle",
      buttons: [{ text: "Close", role: "cancel" }],
      cssClass: "rpg-toast",
    });
    await toast.present();
  } catch (error) {
    debug.warn("[TempleWizard] the toast could not be shown", error);
  }
};

// Close leaves the temple for the Temples list, where its card is
const dismiss = () => {
  void router.push({ name: "xp-compendium-temples" });
};

const save = async () => {
  if (isSaving.value) return;
  isSaving.value = true;
  try {
    // Save once, at the end: the answers join the hook's temple, whose own save writes it (and says so in its toast)
    const patch = templePatch(baseline.value, draft.value, fallbackIcon);
    Object.assign(temple.value, patch);
    await saveTemple();
    baseline.value = { ...baseline.value, ...patch };
    isStored.value = true;
  } catch (error) {
    debug.error("[TempleWizard] the temple could not be saved", error);
    play$fx("no");
    await say("There was a problem saving the temple");
  } finally {
    isSaving.value = false;
  }
};
</script>

<style lang="scss" scoped src="./_XpTempleAttributesWizard.scss" />

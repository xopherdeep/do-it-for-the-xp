<template>
  <ion-page class="xp-create-update-accessory" :class="rootClass" :style="rootStyle">
    <!-- The Game Master's shop item as steps (docs: compendium-wizards-design, W3). The header, dots, guide, Back / Next
         and the verb are the shared XpWizardShell; the rules and the words of each step live in ../itemWizard.ts. -->
    <xp-wizard-shell
      v-if="isOpen"
      v-model:index="position"
      :steps="steps"
      :draft="draft"
      icon="store"
      verb="Stock it"
      verb-icon="store"
      :busy="saving"
      @close="goBack"
      @submit="stockIt"
    >
      <!-- 1. WHAT IS IT: the kind, a few words, the look. The name is typed at the bottom, in thumb reach -->
      <template #what>
        <section class="iw-section" data-test="step-what">
          <div class="iw-grid iw-grid--2" role="group" aria-label="Kind of item">
            <button
              v-for="choice in TYPE_CHOICES"
              :key="choice.value"
              type="button"
              class="iw-tile"
              :class="{ 'is-picked': draft.type === choice.value }"
              :aria-pressed="draft.type === choice.value"
              :data-test="`type-${choice.value}`"
              @click="pickType(choice.value)"
            >
              <i :class="['fad', `fa-${choice.icon}`]" aria-hidden="true"></i>
              <span class="iw-tile__label">{{ choice.label }}</span>
              <span class="iw-tile__hint">{{ choice.hint }}</span>
            </button>
          </div>

          <div class="iw-chosen" :class="{ 'is-empty': !draft.name.trim() }" data-test="chosen">
            <img v-if="pictureUrl" :src="pictureUrl" alt="" class="iw-chosen__art" @error="brokenPicture = true" />
            <i v-else :class="['fad', fallbackIcon, 'iw-chosen__art']" aria-hidden="true"></i>
            <span class="iw-chosen__name">{{ draft.name.trim() || "Name it below" }}</span>
            <i v-if="draft.name.trim()" class="fad fa-check-circle iw-chosen__check" aria-hidden="true"></i>
          </div>

          <h3 class="iw-sub">How rare is it?</h3>
          <div class="xp-app-segments iw-rarity" role="group" aria-label="Rarity">
            <button
              v-for="choice in RARITY_CHOICES"
              :key="choice.value"
              type="button"
              class="xp-app-segment"
              :class="{ 'is-active': draft.rarity === choice.value }"
              :aria-pressed="draft.rarity === choice.value"
              :data-test="`rarity-${choice.value}`"
              @click="pickRarity(choice.value)"
            >
              {{ choice.label }}
            </button>
          </div>

          <label class="iw-input iw-input--area">
            <span class="iw-input__label">A few words about it</span>
            <textarea v-model="draft.description" rows="2" maxlength="200" data-test="description"></textarea>
          </label>

          <label class="iw-input">
            <span class="iw-input__label">Picture link (optional)</span>
            <input v-model="draft.imageUrl" type="url" inputmode="url" autocomplete="off" placeholder="https://" data-test="image-url" />
          </label>

          <label class="iw-input">
            <span class="iw-input__label">Web link (optional)</span>
            <input v-model="draft.url" type="url" inputmode="url" autocomplete="off" placeholder="https://" data-test="url" />
          </label>

          <h3 class="iw-sub">Tags</h3>
          <div v-if="draft.tags.length" class="iw-tags">
            <button
              v-for="tag in draft.tags"
              :key="tag"
              type="button"
              class="iw-tag"
              :aria-label="`Remove ${tag}`"
              data-test="tag"
              @click="dropTag(tag)"
            >
              {{ tag }}
              <i class="fad fa-times-circle" aria-hidden="true"></i>
            </button>
          </div>
          <div class="iw-input iw-input--row">
            <input
              v-model="tagText"
              type="text"
              autocomplete="off"
              enterkeyhint="done"
              placeholder="clothing, book, digital"
              aria-label="Add tags, separated by commas"
              data-test="tag-input"
              @keyup.enter="commitTags"
              @blur="commitTags"
            />
            <button type="button" class="xp-app-btn iw-add" :disabled="!tagText.trim()" data-test="tag-add" @click="commitTags">
              + tag
            </button>
          </div>
        </section>
      </template>

      <!-- 2. WHAT DOES IT COST: the price is typed at the bottom; layaway and approval are two switches -->
      <template #cost>
        <section class="iw-section" data-test="step-cost">
          <div class="iw-plate" :class="{ 'is-empty': !draft.basePrice }" data-test="price-plate">
            <i class="fad fa-coins" aria-hidden="true"></i>
            <span class="iw-plate__amount">{{ draft.basePrice || "?" }}</span>
            <span class="iw-plate__unit">GP</span>
          </div>

          <button
            type="button"
            class="iw-toggle"
            :class="{ 'is-on': draft.isLayaway }"
            role="switch"
            :aria-checked="draft.isLayaway"
            data-test="layaway-toggle"
            @click="toggleLayaway"
          >
            <i :class="['fad', draft.isLayaway ? 'fa-check-square' : 'fa-square']" aria-hidden="true"></i>
            <span class="iw-toggle__text">
              <span>Layaway</span>
              <small>A hero may pay for it a little at a time</small>
            </span>
          </button>

          <button
            type="button"
            class="iw-toggle"
            :class="{ 'is-on': draft.requiresApproval }"
            role="switch"
            :aria-checked="draft.requiresApproval"
            data-test="approval-toggle"
            @click="toggleApproval"
          >
            <i :class="['fad', draft.requiresApproval ? 'fa-check-square' : 'fa-square']" aria-hidden="true"></i>
            <span class="iw-toggle__text">
              <span>I approve each purchase</span>
              <small>You check it before it is handed over</small>
            </span>
          </button>
        </section>
      </template>

      <!-- 3. WHO CAN BUY IT: no hero picked means every hero, so this step never blocks -->
      <template #who>
        <section class="iw-section" data-test="step-who">
          <p class="iw-note" data-test="who-note">
            <i :class="['fad', draft.availableToMembers.length ? 'fa-users' : 'fa-globe']" aria-hidden="true"></i>
            <span>{{ whoNote }}</span>
          </p>
          <xp-hero-picker
            v-model="draft.availableToMembers"
            class="iw-heroes"
            :users="heroes"
            :show-header="false"
            :show-summary="false"
            :is-open-to-all="!draft.availableToMembers.length"
          />
        </section>
      </template>

      <!-- 4. GEAR STATS: what a virtual item adds. Real Life items never come here (isSkipped) -->
      <template #gear>
        <section class="iw-section" data-test="step-gear">
          <ul class="iw-stats">
            <li v-for="stat in GEAR_STATS" :key="stat.key" class="iw-stat" :data-test="`stat-${stat.key}`">
              <i :class="['fad', `fa-${stat.icon}`, 'iw-stat__icon']" aria-hidden="true"></i>
              <span class="iw-stat__label">{{ stat.label }}</span>
              <button
                type="button"
                class="iw-step"
                :aria-label="`Less ${stat.label}`"
                :data-test="`stat-${stat.key}-less`"
                @click="changeStat(stat.key, -stat.step)"
              >
                <i class="fad fa-minus" aria-hidden="true"></i>
              </button>
              <span class="iw-stat__value" :class="{ 'is-zero': !draft.bonusStats[stat.key] }">{{ statText(draft.bonusStats[stat.key]) }}</span>
              <button
                type="button"
                class="iw-step"
                :aria-label="`More ${stat.label}`"
                :data-test="`stat-${stat.key}-more`"
                @click="changeStat(stat.key, stat.step)"
              >
                <i class="fad fa-plus" aria-hidden="true"></i>
              </button>
            </li>
          </ul>
        </section>
      </template>

      <!-- 5. STOCK IT: the item as the family will see it, and a row per answer that jumps back to its step -->
      <template #stock>
        <section class="iw-section" data-test="step-stock">
          <div class="iw-card" data-test="card">
            <div class="iw-card__art">
              <img v-if="pictureUrl" :src="pictureUrl" alt="" @error="brokenPicture = true" />
              <i v-else :class="['fad', fallbackIcon]" aria-hidden="true"></i>
            </div>
            <h2 class="iw-card__name">{{ draft.name.trim() || "Nameless item" }}</h2>
            <p v-if="draft.description.trim()" class="iw-card__sub">{{ draft.description.trim() }}</p>
            <div v-if="draft.tags.length" class="iw-card__tags">
              <xp-app-chip v-for="tag in draft.tags" :key="tag" kind="tag" :value="tag" />
            </div>
          </div>

          <xp-app-section label="Tap an answer to change it">
            <xp-app-row
              v-for="row in summary"
              :key="row.step"
              :title="row.label"
              :subtitle="row.value"
              :icon="STEP_ICONS[row.step]"
              :data-test="`row-${row.step}`"
              @click="goToStep(row.step)"
            />
          </xp-app-section>
        </section>
      </template>

      <!-- The step's field sits at the bottom, above Back / Next, in thumb reach -->
      <template #above-nav="{ step: asked }">
        <label v-if="asked.id === 'what'" class="xp-app-search">
          <i class="fad fa-tag" aria-hidden="true"></i>
          <input
            v-model="draft.name"
            type="text"
            autocomplete="off"
            enterkeyhint="done"
            maxlength="60"
            placeholder="Name of the item"
            aria-label="Name of the item"
            data-test="name"
            @keyup.enter="closeKeyboard"
          />
        </label>
        <template v-else-if="asked.id === 'cost'">
          <div class="xp-app-segments" role="group" aria-label="Quick prices">
            <button
              v-for="price in PRICE_CHOICES"
              :key="price"
              type="button"
              class="xp-app-segment"
              :class="{ 'is-active': draft.basePrice === price }"
              :aria-pressed="draft.basePrice === price"
              :data-test="`price-${price}`"
              @click="pickPrice(price)"
            >
              {{ price }}
            </button>
          </div>
          <label class="xp-app-search">
            <i class="fad fa-coins" aria-hidden="true"></i>
            <input
              :value="draft.basePrice || ''"
              type="text"
              inputmode="numeric"
              pattern="[0-9]*"
              maxlength="6"
              autocomplete="off"
              enterkeyhint="done"
              placeholder="Price in GP"
              aria-label="Price in gold pieces"
              data-test="price"
              @input="typePrice"
              @keyup.enter="closeKeyboard"
            />
          </label>
        </template>
        <button
          v-else-if="asked.id === 'who'"
          type="button"
          class="iw-toggle iw-toggle--bar"
          :class="{ 'is-on': !draft.availableToMembers.length }"
          role="switch"
          :aria-checked="!draft.availableToMembers.length"
          data-test="every-hero"
          @click="everyHero"
        >
          <i :class="['fad', draft.availableToMembers.length ? 'fa-square' : 'fa-check-square']" aria-hidden="true"></i>
          <span class="iw-toggle__text"><span>Every hero</span></span>
        </button>
      </template>
    </xp-wizard-shell>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { IonPage, toastController } from "@ionic/vue";
import { play$fx } from "@/assets/fx";
import XpHeroPicker from "@/components/molecules/HeroPicker/XpHeroPicker.vue";
import XpWizardShell from "@/components/organisms/WizardShell/XpWizardShell.vue";
import XpAppChip from "@/components/organisms/XpApp/XpAppChip.vue";
import XpAppRow from "@/components/organisms/XpApp/XpAppRow.vue";
import XpAppSection from "@/components/organisms/XpApp/XpAppSection.vue";
import { appIconClass, useAppSkin } from "@/components/organisms/XpApp/useAppSkin";
import { useBack } from "@/hooks/useBack";
import AccessoriesDb, { accessoriesStorage } from "@/lib/databases/AccessoriesDb";
import type { Accessory, AccessoryType, Rarity } from "@/lib/databases/AccessoriesDb";
import { useUserStore } from "@/lib/store/stores/user";
import { firstIndex, lastIndex } from "@/lib/services/wizard/wizardSteps";
import debug from "@/lib/utils/debug";
import {
  GEAR_STATS,
  PRICE_CHOICES,
  RARITY_CHOICES,
  TYPE_CHOICES,
  addTags,
  adjustStat,
  blankItem,
  itemFromRecord,
  itemSummary,
  itemToRecord,
  itemWizardSteps,
  parsePrice,
  removeTag,
} from "../itemWizard";
import type { GearStatKey, ItemStepId } from "../itemWizard";

defineOptions({ name: "xp-create-update-accessory" });

/**
 * The Game Master's shop item, one question at a time: What is it? -> What does it cost? -> Who can buy it? -> Gear stats
 * (a virtual item only) -> Stock it. New starts on step one; an edit (route `economy/create-update/:id`, which now passes
 * `id` as a prop) opens on the summary, with the dots and the summary's rows leading back to any answer. Nothing is
 * saved until the summary's verb, and then once, through AccessoriesDb.setAccessory.
 *
 * The old Inventory (total / available / reserved, expiry) and Purchase History blocks are gone: no segment ever led to
 * them, the shelf never reads the counts or the expiry, and nothing writes the history. An edit still keeps whatever a
 * record holds for them (itemToRecord starts from the saved record).
 */
const props = defineProps<{ id?: string }>();

// Items are goods: the form wears the goods accent of the phone apps, with cream text
const { rootClass, rootStyle } = useAppSkin("goods");
const { back: goBack } = useBack();
const userStore = useUserStore();
const accessoryDb = new AccessoriesDb(accessoriesStorage);

const steps = itemWizardSteps();
const draft = ref(blankItem());
// The record as it was stored, so an edit keeps the fields the wizard does not ask
const original = ref<Accessory | null>(null);
const position = ref(0);
const isOpen = ref(false);
const saving = ref(false);
const isEdit = computed(() => original.value !== null);

const tagText = ref("");
const brokenPicture = ref(false);
watch(
  () => draft.value.imageUrl,
  () => (brokenPicture.value = false)
);

const heroes = computed(() => userStore.usersAz);

const heroName = (id: string): string => {
  const hero = userStore.users[id];
  return hero?.name?.nick || hero?.name?.first || hero?.displayName || "A hero";
};

// ---- Opening ------------------------------------------------------------------------------------------------------

const say = async (header: string, message?: string) => {
  try {
    const toast = await toastController.create({
      header,
      message,
      duration: 2600,
      position: "middle",
      buttons: [{ text: "Close", role: "cancel" }],
      cssClass: "rpg-toast",
    });
    await toast.present();
  } catch (error) {
    debug.warn("[ItemWizard] the toast could not be shown", error);
  }
};

const openSaved = async (id: string) => {
  try {
    const record = await accessoryDb.getAccessoryById(id);
    // getAccessoryById hands back a blank record with a fresh id for an item it cannot find
    if (String(record.id) === String(id)) {
      original.value = record;
      draft.value = itemFromRecord(record);
      position.value = lastIndex(steps, draft.value);
      return;
    }
    void say("That item is gone", "Starting a new one instead.");
  } catch (error) {
    debug.warn("[ItemWizard] the item could not be opened", error);
    void say("That item could not be opened", "Starting a new one instead.");
  }
};

onMounted(async () => {
  if (props.id) await openSaved(props.id);
  if (!original.value) position.value = firstIndex(steps, draft.value);
  isOpen.value = true;
});

// ---- Step 1: what is it -------------------------------------------------------------------------------------------

const pictureUrl = computed(() => (brokenPicture.value ? "" : draft.value.imageUrl.trim()));
const fallbackIcon = computed(() => {
  const icon = original.value?.icon || TYPE_CHOICES.find((choice) => choice.value === draft.value.type)?.icon || "gift";
  return appIconClass(icon);
});

const pickType = (type: AccessoryType) => {
  play$fx("cursor");
  draft.value.type = type;
};

const pickRarity = (rarity: Rarity) => {
  play$fx("cursor");
  draft.value.rarity = rarity;
};

// Tags are typed with commas; they are taken on Enter, on the button and when the field loses focus (Next does that)
const commitTags = () => {
  draft.value.tags = addTags(draft.value.tags, tagText.value);
  tagText.value = "";
};

const dropTag = (tag: string) => {
  play$fx("cursor");
  draft.value.tags = removeTag(draft.value.tags, tag);
};

const closeKeyboard = (event: Event) => (event.target as HTMLElement | null)?.blur?.();

// ---- Step 2: what does it cost ------------------------------------------------------------------------------------

const pickPrice = (price: number) => {
  play$fx("cursor");
  draft.value.basePrice = price;
};

// Only digits: anything else typed is dropped from the field as well as from the price
const typePrice = (event: Event) => {
  const field = event.target as HTMLInputElement;
  draft.value.basePrice = parsePrice(field.value.replace(/\D/g, ""));
  field.value = draft.value.basePrice ? String(draft.value.basePrice) : "";
};

const toggleLayaway = () => {
  play$fx("cursor");
  draft.value.isLayaway = !draft.value.isLayaway;
};

const toggleApproval = () => {
  play$fx("cursor");
  draft.value.requiresApproval = !draft.value.requiresApproval;
};

// ---- Step 3: who can buy it ---------------------------------------------------------------------------------------

const everyHero = () => {
  play$fx("cursor");
  draft.value.availableToMembers = [];
};

const whoNote = computed(() => {
  const picked = draft.value.availableToMembers;
  if (!picked.length) return "Every hero can buy it. Tap a hero to limit it to some.";
  return picked.length === 1 ? `Only ${heroName(picked[0])} can buy it.` : `Only ${picked.map(heroName).join(", ")} can buy it.`;
});

// ---- Step 4: gear stats -------------------------------------------------------------------------------------------

const changeStat = (key: GearStatKey, delta: number) => {
  play$fx("cursor");
  draft.value.bonusStats[key] = adjustStat(draft.value.bonusStats[key], delta);
};

const statText = (value: number): string => (value > 0 ? `+${value}` : `${value}`);

// ---- Step 5: stock it ---------------------------------------------------------------------------------------------

const summary = computed(() => itemSummary(draft.value, heroName));

const STEP_ICONS: Record<ItemStepId, string> = { what: "tag", cost: "coins", who: "users", gear: "shield", stock: "store" };

// A tap on a row goes straight back to the step that owns the answer
const goToStep = (id: ItemStepId) => {
  const target = steps.findIndex((step) => step.id === id);
  if (target >= 0) position.value = target;
};

const stockIt = async () => {
  if (saving.value) return;
  saving.value = true;
  try {
    await accessoryDb.setAccessory(itemToRecord(draft.value, original.value));
    play$fx("yes");
    void say(isEdit.value ? "Item updated" : "Item stocked", `${draft.value.name.trim()} is saved. Put it on a shop's shelf so heroes can buy it.`);
    goBack();
  } catch (error) {
    debug.warn("[ItemWizard] the item could not be saved", error);
    play$fx("no");
    void say("It could not be saved", "Try Stock it once more.");
  } finally {
    saving.value = false;
  }
};
</script>

<style lang="scss" scoped>
// The shell lays out the header, body and footer; this file only paints what each step holds

.iw-section {
  padding: 4px 12px 12px;
}

.iw-sub {
  margin: 16px 2px 8px;
  color: var(--xp-app-text-dim);
  font-family: var(--xp-app-font-title);
  font-size: 0.9rem;
  font-weight: normal;
  text-transform: var(--xp-app-title-transform);
}

.iw-note {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 4px 8px 10px;
  color: var(--xp-app-text);
  font-size: 0.9rem;
  text-align: center;

  i {
    color: var(--xp-app-tile-fg);
    font-size: 1.3rem;
  }
}

// ---- Step 1 --------------------------------------------------------------------------------------------------------

.iw-grid {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.iw-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-height: 104px;
  padding: 10px 8px;
  background: var(--xp-app-surface);
  border: var(--xp-app-section-border);
  border-radius: var(--xp-app-radius-tile);
  color: var(--xp-app-text);
  cursor: pointer;
  text-align: center;
  -webkit-tap-highlight-color: transparent;

  i {
    color: var(--xp-app-tile-fg);
    font-size: 2rem;
  }

  &__label {
    font-family: var(--xp-app-font-title);
    font-size: 1rem;
    text-transform: var(--xp-app-title-transform);
  }

  &__hint {
    color: var(--xp-app-text-dim);
    font-size: 0.78rem;
    line-height: 1.2;
  }

  &:active {
    background: var(--xp-app-press);
  }

  &.is-picked {
    background: var(--xp-app-surface-2);
    border-color: var(--xp-app-accent);
    box-shadow: 0 0 0 2px var(--xp-app-accent);
  }
}

.iw-chosen {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 12px 0 0;
  padding: 6px 10px;
  background: var(--xp-app-surface);
  border: 2px solid var(--xp-app-accent);
  border-radius: var(--xp-app-radius-tile);

  &.is-empty {
    border-color: var(--xp-app-line);
  }

  &__art {
    flex: 0 0 auto;
    width: 44px;
    height: 44px;
    object-fit: contain;
    color: var(--xp-app-tile-fg);
    font-size: 1.8rem;
    line-height: 44px;
    text-align: center;
  }

  &__name {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    font-family: var(--xp-app-font-title);
    font-size: 1rem;
    text-overflow: ellipsis;
    text-transform: var(--xp-app-title-transform);
    white-space: nowrap;
  }

  &.is-empty &__name {
    color: var(--xp-app-text-dim);
  }

  &__check {
    color: var(--xp-app-tile-fg);
    font-size: 1.4rem;
  }
}

.iw-rarity {
  flex-wrap: wrap;

  .xp-app-segment {
    min-height: 40px;
  }
}

.iw-input {
  display: block;
  margin-top: 12px;

  &__label {
    display: block;
    margin: 0 0 4px 2px;
    color: var(--xp-app-text-dim);
    font-family: var(--xp-app-font-title);
    font-size: 0.78rem;
    text-transform: var(--xp-app-title-transform);
  }

  input,
  textarea {
    display: block;
    width: 100%;
    min-height: 44px;
    padding: 0 12px;
    background: var(--xp-app-surface);
    border: var(--xp-app-section-border);
    border-radius: var(--xp-app-radius-control);
    box-sizing: border-box;
    color: var(--xp-app-text);
    font-family: var(--xp-app-font-body);
    font-size: 1rem;
    outline: none;

    &::placeholder {
      color: var(--xp-app-text-dim);
    }

    &:focus {
      border-color: var(--xp-app-accent);
    }
  }

  textarea {
    min-height: 64px;
    padding: 10px 12px;
    resize: none;
  }

  &--row {
    display: flex;
    gap: 8px;
    margin-top: 0;

    input {
      flex: 1 1 auto;
      min-width: 0;
    }
  }
}

.iw-add {
  flex: 0 0 auto;
  min-height: 44px;
}

.iw-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}

.iw-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 36px;
  padding: 0 12px;
  background: var(--xp-app-surface);
  border: 1px solid var(--xp-app-accent);
  border-radius: var(--xp-app-radius-chip);
  color: var(--xp-app-text);
  cursor: pointer;
  font-size: 0.9rem;
  -webkit-tap-highlight-color: transparent;

  i {
    color: var(--xp-app-tile-fg);
  }
}

// ---- Step 2 --------------------------------------------------------------------------------------------------------

.iw-plate {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 10px;
  margin: 8px 0 14px;
  padding: 18px 12px;
  background: var(--xp-app-surface);
  border: 2px solid var(--xp-app-accent);
  border-radius: var(--xp-app-radius-section);
  color: var(--xp-app-text);

  &.is-empty {
    border-color: var(--xp-app-line);
    color: var(--xp-app-text-dim);
  }

  i {
    align-self: center;
    color: var(--xp-app-tile-fg);
    font-size: 2rem;
  }

  &__amount {
    font-family: var(--xp-app-font-title);
    font-size: 2.6rem;
    line-height: 1;
  }

  &__unit {
    font-family: var(--xp-app-font-title);
    font-size: 1.2rem;
  }
}

.iw-toggle {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 60px;
  margin-top: 10px;
  padding: 6px 14px;
  background: var(--xp-app-surface);
  border: var(--xp-app-section-border);
  border-radius: var(--xp-app-radius-tile);
  color: var(--xp-app-text);
  cursor: pointer;
  text-align: left;
  -webkit-tap-highlight-color: transparent;

  i {
    flex: 0 0 auto;
    color: var(--xp-app-tile-fg);
    font-size: 1.6rem;
  }

  &__text {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;

    > span {
      font-family: var(--xp-app-font-title);
      font-size: 0.95rem;
      text-transform: var(--xp-app-title-transform);
    }

    small {
      color: var(--xp-app-text-dim);
      font-size: 0.78rem;
      line-height: 1.2;
    }
  }

  &:active {
    background: var(--xp-app-press);
  }

  &.is-on {
    border-color: var(--xp-app-accent);
  }

  // In the bottom bar, above Back / Next
  &--bar {
    min-height: 52px;
    margin-top: 0;
  }
}

// ---- Step 3 --------------------------------------------------------------------------------------------------------

// The picker is a shared field with its own look; here it takes the app's colours
.iw-heroes {
  :deep(.hero-card) {
    background: var(--xp-app-surface);
    border: var(--xp-app-section-border);
    border-radius: var(--xp-app-radius-tile);
    transform: none;
  }

  :deep(.hero-card__name) {
    color: var(--xp-app-text);
    font-family: var(--xp-app-font-title);
    font-size: 0.8rem;
    text-transform: var(--xp-app-title-transform);
  }

  :deep(.hero-card--active) {
    background: var(--xp-app-surface-2);
    border-color: var(--xp-app-accent);
    box-shadow: 0 0 0 2px var(--xp-app-accent);
  }

  :deep(.hero-card__badge) {
    color: var(--xp-app-tile-fg);
  }
}

// ---- Step 4 --------------------------------------------------------------------------------------------------------

.iw-stats {
  margin: 0;
  padding: 0;
  list-style: none;
}

.iw-stat {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 64px;
  margin-bottom: 8px;
  padding: 6px 10px;
  background: var(--xp-app-surface);
  border: var(--xp-app-section-border);
  border-radius: var(--xp-app-radius-tile);

  &__icon {
    flex: 0 0 auto;
    width: 28px;
    color: var(--xp-app-tile-fg);
    font-size: 1.4rem;
    text-align: center;
  }

  &__label {
    flex: 1 1 auto;
    font-family: var(--xp-app-font-title);
    font-size: 1rem;
    text-transform: var(--xp-app-title-transform);
  }

  &__value {
    min-width: 52px;
    font-family: var(--xp-app-font-title);
    font-size: 1.3rem;
    text-align: center;

    &.is-zero {
      color: var(--xp-app-text-dim);
    }
  }
}

.iw-step {
  flex: 0 0 auto;
  width: 48px;
  height: 48px;
  background: transparent;
  border: 1px solid var(--xp-app-accent);
  border-radius: var(--xp-app-radius-control);
  color: var(--xp-app-text);
  cursor: pointer;
  font-size: 1.1rem;
  -webkit-tap-highlight-color: transparent;

  i {
    color: var(--xp-app-tile-fg);
  }

  &:active {
    background: var(--xp-app-press);
  }
}

// ---- Step 5 --------------------------------------------------------------------------------------------------------

.iw-card {
  margin-bottom: 14px;
  overflow: hidden;
  background: var(--xp-app-surface);
  border: var(--xp-app-section-border);
  border-radius: var(--xp-app-radius-section);

  &__art {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 108px;
    background: radial-gradient(circle at 50% 60%, var(--xp-app-surface-2), #000);

    img {
      max-width: 100%;
      height: 100%;
      object-fit: contain;
    }

    i {
      color: var(--xp-app-tile-fg);
      font-size: 4rem;
    }
  }

  &__name {
    margin: 12px 14px 0;
    font-family: var(--xp-app-font-title);
    font-size: 1.25rem;
    font-weight: normal;
    line-height: 1.2;
    text-align: center;
    text-transform: var(--xp-app-title-transform);
  }

  &__sub {
    margin: 4px 14px 0;
    color: var(--xp-app-text-dim);
    font-size: 0.85rem;
    text-align: center;
  }

  &__tags {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 6px;
    padding: 10px 12px 0;
  }

  // The last block of the card: room under the name when there is nothing after it
  > :last-child {
    margin-bottom: 14px;
  }
}
</style>

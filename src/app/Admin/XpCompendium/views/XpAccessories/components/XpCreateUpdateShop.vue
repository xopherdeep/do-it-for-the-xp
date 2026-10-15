<template>
  <ion-page class="xp-create-update-shop" :class="rootClass" :style="rootStyle">
    <!-- The Game Master's shop as steps (docs: compendium-wizards-design, W5). The header, dots, guide, Back / Next and the
         verb are the shared XpWizardShell; the rules and the words of each step live in ../shopWizard.ts. -->
    <xp-wizard-shell
      v-if="isOpen"
      v-model:index="position"
      :steps="steps"
      :draft="draft"
      icon="store"
      verb="Open"
      verb-icon="door-open"
      :busy="saving"
      @close="goBack"
      @submit="openShop"
    >
      <!-- 1. NAME THE SHOP AND CLERK: the name is typed at the bottom, in thumb reach -->
      <template #name>
        <section class="sw-section" data-test="step-name">
          <div class="sw-chosen" :class="{ 'is-empty': !draft.name.trim() }" data-test="chosen">
            <i :class="[draft.icon, 'sw-chosen__art']" aria-hidden="true"></i>
            <span class="sw-chosen__name">{{ draft.name.trim() || "Name it below" }}</span>
            <i v-if="draft.name.trim()" class="fad fa-check-circle sw-chosen__check" aria-hidden="true"></i>
          </div>

          <label class="sw-input sw-input--area">
            <span class="sw-input__label">A few words about the shop (optional)</span>
            <textarea v-model="draft.description" rows="2" maxlength="200" data-test="description"></textarea>
          </label>

          <h3 class="sw-sub">The clerk</h3>
          <label class="sw-input">
            <span class="sw-input__label">Clerk's name</span>
            <input
              v-model="draft.clerkName"
              type="text"
              maxlength="40"
              autocomplete="off"
              enterkeyhint="done"
              :placeholder="usualClerk.shopkeep"
              data-test="clerk-name"
              @keyup.enter="closeKeyboard"
            />
          </label>
          <label class="sw-input sw-input--area">
            <span class="sw-input__label">What the clerk says when a hero walks in</span>
            <textarea v-model="draft.greeting" rows="2" maxlength="200" :placeholder="usualClerk.greeting" data-test="greeting"></textarea>
          </label>

          <div class="sw-speech" data-test="speech">
            <span class="sw-speech__name">{{ clerkPreviewName }}</span>
            <p class="sw-speech__line">{{ clerkPreviewLine }}</p>
          </div>
          <p class="sw-note">
            <i class="fad fa-info-circle" aria-hidden="true"></i>
            <span>Leave the clerk empty and heroes meet the portal's own clerk and line.</span>
          </p>
        </section>
      </template>

      <!-- 2. DRESS THE SHOP: the sign is picked here, the picture behind the shop from the rail at the bottom -->
      <template #dress>
        <section class="sw-section" data-test="step-dress">
          <div class="sw-preview" :style="{ '--preview-bg': `url(${previewBg})` }" data-test="preview">
            <div class="sw-preview__shade">
              <i :class="[draft.icon, 'sw-preview__icon']" aria-hidden="true"></i>
              <span class="sw-preview__name">{{ draft.name.trim() || "Your shop" }}</span>
            </div>
          </div>

          <h3 class="sw-sub">The sign over the door</h3>
          <div class="sw-icons" role="group" aria-label="Shop sign">
            <button
              v-for="choice in icons"
              :key="choice.value"
              type="button"
              class="sw-icon"
              :class="{ 'is-picked': draft.icon === choice.value }"
              :aria-pressed="draft.icon === choice.value"
              :aria-label="choice.label"
              :title="choice.label"
              :data-test="`icon-${iconKey(choice.value)}`"
              @click="pickIcon(choice.value)"
            >
              <i :class="choice.value" aria-hidden="true"></i>
            </button>
          </div>
          <p class="sw-note">
            <i class="fad fa-image" aria-hidden="true"></i>
            <span>Heroes see the picture behind the shop. Pick it from the strip below.</span>
          </p>
        </section>
      </template>

      <!-- 3. OPEN HOURS: always open, or two times; the switch and the times sit at the bottom -->
      <template #hours>
        <section class="sw-section" data-test="step-hours">
          <div class="sw-hours" :class="{ 'is-warning': hoursUnset }">
            <i :class="['fad', draft.alwaysOpen ? 'fa-door-open' : 'fa-clock']" aria-hidden="true"></i>
            <span class="sw-hours__line" data-test="hours-line">{{ hoursText }}</span>
          </div>
          <p v-if="hoursReminder" class="sw-note" data-test="hours-note">
            <i class="fad fa-moon" aria-hidden="true"></i>
            <span>{{ hoursReminder }}</span>
          </p>
          <p class="sw-note">
            <i class="fad fa-info-circle" aria-hidden="true"></i>
            <span>Outside these hours the clerk turns heroes away and nothing can be bought.</span>
          </p>
        </section>
      </template>

      <!-- 4. STOCK IT: the goods on the shelf, a tap on one opens its own price and days -->
      <template #stock>
        <section class="sw-section" data-test="step-stock">
          <p v-if="!goods.length" class="sw-empty" data-test="empty">
            <i class="fad fa-boxes" aria-hidden="true"></i>
            <span>The shelves are bare. Pick goods below, or open the shop now and stock it later from its Items tab.</span>
          </p>
          <ul v-else class="sw-goods">
            <li v-for="good in goods" :key="good.itemId" class="sw-good" :class="{ 'is-open': openGood === good.itemId }" :data-test="`good-${good.itemId}`">
              <button type="button" class="sw-good__row" :aria-expanded="openGood === good.itemId" @click="toggleGood(good.itemId)">
                <i class="fad fa-sack-dollar sw-good__icon" aria-hidden="true"></i>
                <span class="sw-good__text">
                  <span class="sw-good__name">{{ good.name }}</span>
                  <small>{{ good.priceText }}, {{ good.daysText }}</small>
                </span>
                <i :class="['fad', openGood === good.itemId ? 'fa-chevron-up' : 'fa-chevron-down']" aria-hidden="true"></i>
              </button>

              <div v-if="openGood === good.itemId" class="sw-good__panel">
                <label class="sw-input">
                  <span class="sw-input__label">Your price in GP (empty = the usual {{ good.usual }} GP)</span>
                  <input
                    :value="good.price || ''"
                    type="text"
                    inputmode="numeric"
                    pattern="[0-9]*"
                    maxlength="6"
                    autocomplete="off"
                    enterkeyhint="done"
                    placeholder="Usual price"
                    :data-test="`price-${good.itemId}`"
                    @input="typeGoodPrice(good.itemId, $event)"
                    @keyup.enter="closeKeyboard"
                  />
                </label>
                <h3 class="sw-sub">Days it is stocked (none = every day)</h3>
                <xp-day-selector :model-value="good.availableDays" @update:model-value="setDays(good.itemId, $event)" />
                <button type="button" class="xp-app-btn xp-app-btn--ghost sw-good__drop" :data-test="`drop-${good.itemId}`" @click="takeOff(good.itemId)">
                  <i class="fad fa-trash" aria-hidden="true"></i>
                  Take it off the shelf
                </button>
              </div>
            </li>
          </ul>
        </section>
      </template>

      <!-- 5. OPEN THE SHOP: the shop as the family will see it, and a row per answer that jumps back to its step -->
      <template #open>
        <section class="sw-section" data-test="step-open">
          <div class="sw-card" data-test="card">
            <div class="sw-card__art" :style="{ '--preview-bg': `url(${previewBg})` }">
              <div class="sw-card__shade">
                <i :class="draft.icon" aria-hidden="true"></i>
              </div>
            </div>
            <h2 class="sw-card__name">{{ draft.name.trim() || "Nameless shop" }}</h2>
            <p v-if="draft.description.trim()" class="sw-card__sub">{{ draft.description.trim() }}</p>
          </div>

          <xp-app-section label="Tap an answer to change it">
            <xp-app-row
              v-for="row in summary"
              :key="row.id"
              :title="row.label"
              :subtitle="row.value"
              :icon="ROW_ICONS[row.id]"
              :data-test="`row-${row.id}`"
              @click="goToStep(row.step)"
            />
          </xp-app-section>
        </section>
      </template>

      <!-- The step's field sits at the bottom, above Back / Next, in thumb reach -->
      <template #above-nav="{ step: asked }">
        <label v-if="asked.id === 'name'" class="xp-app-search">
          <i class="fad fa-store" aria-hidden="true"></i>
          <input
            v-model="draft.name"
            type="text"
            autocomplete="off"
            enterkeyhint="done"
            maxlength="60"
            placeholder="Name of the shop"
            aria-label="Name of the shop"
            data-test="name"
            @keyup.enter="closeKeyboard"
          />
        </label>

        <div v-else-if="asked.id === 'dress'" class="sw-rail" role="group" aria-label="Picture behind the shop">
          <button
            v-for="world in worlds"
            :key="world.id"
            type="button"
            class="sw-world"
            :class="{ 'is-picked': draft.world === world.id }"
            :aria-pressed="draft.world === world.id"
            :data-test="`world-${world.id}`"
            @click="pickWorld(world.id)"
          >
            <img :src="world.image" alt="" loading="lazy" />
            <span>{{ world.label }}</span>
          </button>
        </div>

        <template v-else-if="asked.id === 'hours'">
          <div class="xp-app-segments" role="group" aria-label="Open hours">
            <button
              type="button"
              class="xp-app-segment"
              :class="{ 'is-active': draft.alwaysOpen }"
              :aria-pressed="draft.alwaysOpen"
              data-test="hours-always"
              @click="setAlwaysOpen(true)"
            >
              Always open
            </button>
            <button
              type="button"
              class="xp-app-segment"
              :class="{ 'is-active': !draft.alwaysOpen }"
              :aria-pressed="!draft.alwaysOpen"
              data-test="hours-set"
              @click="setAlwaysOpen(false)"
            >
              Set hours
            </button>
          </div>
          <div v-if="!draft.alwaysOpen" class="sw-times">
            <label class="sw-time">
              <span>Opens</span>
              <input v-model="draft.opensAt" type="time" required data-test="opens-at" />
            </label>
            <label class="sw-time">
              <span>Closes</span>
              <input v-model="draft.closesAt" type="time" required data-test="closes-at" />
            </label>
          </div>
        </template>

        <button v-else-if="asked.id === 'stock'" type="button" class="xp-app-btn sw-pick" data-test="pick-goods" @click="pickFromList">
          <i class="fad fa-plus-circle" aria-hidden="true"></i>
          {{ goods.length ? "Pick more goods" : "Pick goods" }}
        </button>
      </template>
    </xp-wizard-shell>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { IonPage, onIonViewWillEnter, toastController, useIonRouter } from "@ionic/vue";
import { play$fx } from "@/assets/fx";
import XpDaySelector from "@/components/molecules/Inputs/XpDaySelector.vue";
import XpWizardShell from "@/components/organisms/WizardShell/XpWizardShell.vue";
import XpAppRow from "@/components/organisms/XpApp/XpAppRow.vue";
import XpAppSection from "@/components/organisms/XpApp/XpAppSection.vue";
import { useAppSkin } from "@/components/organisms/XpApp/useAppSkin";
import { useBack } from "@/hooks/useBack";
import AccessoriesDb, { accessoriesStorage } from "@/lib/databases/AccessoriesDb";
import type { Accessory } from "@/lib/databases/AccessoriesDb";
import shopsDb, { clerkDefaultFor } from "@/lib/databases/ShopsDb";
import type { ShopInterface } from "@/lib/databases/ShopsDb";
import { getItemMetadata } from "@/lib/engine/core/items/itemRegistry";
import { hoursSummary } from "@/lib/services/shops/shopHours";
import { firstIndex, lastIndex } from "@/lib/services/wizard/wizardSteps";
import { useItemSelectionStore } from "@/lib/store/stores/item-selection";
import debug from "@/lib/utils/debug";
import { shopWorldBackground } from "../hooks/useShopData";
import {
  SHOP_WORLD_CHOICES,
  blankShop,
  daysLine,
  dropGood,
  hoursNote,
  hoursOf,
  pickGoods,
  setGoodDays,
  setGoodPrice,
  shopFromRecord,
  shopIconChoices,
  shopSummary,
  shopToRecord,
  shopWizardSteps,
} from "../shopWizard";
import type { ShopStepId, ShopSummaryRow } from "../shopWizard";

defineOptions({ name: "xp-create-update-shop" });

/**
 * The Game Master's shop, one question at a time: Name the shop and clerk -> Dress the shop -> Open hours -> Stock it ->
 * Open. New starts on step one; an edit (route `economy/create-shop/:id`) opens on the summary, with the dots and the
 * summary's rows leading back to any answer. Nothing is saved until the summary's verb, and then once, through
 * shopsDb.setShop: the record carries the hours and the shelves, so the shop's own tabs (Items, Hours, Shop, Clerk) read
 * the very same shop afterwards and keep their own saves for later changes.
 */
const props = defineProps<{ id?: string }>();

// Shops sell goods: the form wears the goods accent of the phone apps, with cream text
const { rootClass, rootStyle } = useAppSkin("goods");
const { back: goBack } = useBack();
const ionRouter = useIonRouter();
const itemSelection = useItemSelectionStore();
const accessoriesDb = new AccessoriesDb(accessoriesStorage);

const steps = shopWizardSteps();
const draft = ref(blankShop());
// The record as it was stored, so an edit keeps the fields the wizard does not ask
const original = ref<ShopInterface | null>(null);
const position = ref(0);
const isOpen = ref(false);
const saving = ref(false);
const isEdit = computed(() => original.value !== null);

const accessories = ref<Accessory[]>([]);

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
    debug.warn("[ShopWizard] the toast could not be shown", error);
  }
};

const loadAccessories = async () => {
  try {
    accessories.value = await accessoriesDb.getAccessories();
  } catch (error) {
    debug.warn("[ShopWizard] the goods could not be read", error);
  }
};

const openSaved = async (id: string) => {
  try {
    const record = await shopsDb.getShopById(id);
    if (record) {
      original.value = record;
      draft.value = shopFromRecord(record);
      position.value = lastIndex(steps, draft.value);
      return;
    }
    void say("That shop is gone", "Starting a new one instead.");
  } catch (error) {
    debug.warn("[ShopWizard] the shop could not be opened", error);
    void say("That shop could not be opened", "Starting a new one instead.");
  }
};

onMounted(async () => {
  await loadAccessories();
  if (props.id) await openSaved(props.id);
  if (!original.value) position.value = firstIndex(steps, draft.value);
  isOpen.value = true;
});

// Back from the item picker: a good just made there has its name now
onIonViewWillEnter(() => {
  void loadAccessories();
});

const closeKeyboard = (event: Event) => (event.target as HTMLElement | null)?.blur?.();

// ---- Step 1: name the shop and clerk ------------------------------------------------------------------------------

const usualClerk = computed(() => clerkDefaultFor(draft.value.id));
const clerkPreviewName = computed(() => draft.value.clerkName.trim() || usualClerk.value.shopkeep);
const clerkPreviewLine = computed(() => draft.value.greeting.trim() || usualClerk.value.greeting);

// ---- Step 2: dress the shop ---------------------------------------------------------------------------------------

// The world tiles never change, so their pictures are looked up once
const worlds = SHOP_WORLD_CHOICES.map((world) => ({ ...world, image: shopWorldBackground(world.id) }));
const previewBg = computed(() => shopWorldBackground(draft.value.world));
// The sign grid also offers the sign the shop came with, so an edit can go back to it
const icons = computed(() => shopIconChoices([original.value?.icon, draft.value.icon]));
const iconKey = (value: string): string => value.replace(/^fa[dsrlb]? fa-/, "");

const pickIcon = (value: string) => {
  play$fx("cursor");
  draft.value.icon = value;
};

const pickWorld = (id: string) => {
  play$fx("cursor");
  draft.value.world = id;
};

// ---- Step 3: open hours -------------------------------------------------------------------------------------------

const hoursUnset = computed(() => !draft.value.alwaysOpen && !hoursOf(draft.value));
const hoursText = computed(() => (hoursUnset.value ? "Pick both times" : hoursSummary(hoursOf(draft.value))));
const hoursReminder = computed(() => hoursNote(draft.value));

const setAlwaysOpen = (always: boolean) => {
  play$fx("cursor");
  draft.value.alwaysOpen = always;
};

// ---- Step 4: stock it ---------------------------------------------------------------------------------------------

const openGood = ref<string | null>(null);

const itemName = (itemId: string): string =>
  accessories.value.find((accessory) => accessory.id === itemId)?.name ?? getItemMetadata(itemId)?.name ?? "Unknown item";

const usualPrice = (itemId: string): number =>
  accessories.value.find((accessory) => accessory.id === itemId)?.basePrice ?? getItemMetadata(itemId)?.gpCost ?? 0;

const goods = computed(() =>
  draft.value.items.map((item) => {
    const usual = usualPrice(item.itemId);
    return {
      itemId: item.itemId,
      name: itemName(item.itemId),
      price: item.price,
      usual,
      availableDays: item.availableDays ?? [],
      priceText: item.price ? `${item.price} GP (your price)` : `${usual} GP`,
      daysText: daysLine(item.availableDays),
    };
  })
);

const toggleGood = (itemId: string) => {
  play$fx("cursor");
  openGood.value = openGood.value === itemId ? null : itemId;
};

// Only digits: anything else typed is dropped from the field as well as from the price
const typeGoodPrice = (itemId: string, event: Event) => {
  const field = event.target as HTMLInputElement;
  draft.value.items = setGoodPrice(draft.value.items, itemId, field.value.replace(/\D/g, ""));
  const price = draft.value.items.find((item) => item.itemId === itemId)?.price;
  field.value = price ? String(price) : "";
};

const setDays = (itemId: string, days: number[]) => {
  draft.value.items = setGoodDays(draft.value.items, itemId, days);
};

const takeOff = (itemId: string) => {
  play$fx("cursor");
  draft.value.items = dropGood(draft.value.items, itemId);
  if (openGood.value === itemId) openGood.value = null;
};

// The same picker the shop's Items tab uses: the list of goods in selection mode. This page stays under it, so the
// wizard (and everything typed) is here when the picker goes back.
const pickFromList = () => {
  play$fx("select");
  itemSelection.startSelection(
    draft.value.items.map((item) => item.itemId),
    "shop-wizard",
    (pickedIds) => {
      draft.value.items = pickGoods(draft.value.items, pickedIds);
    }
  );
  ionRouter.push({ name: "xp-economy-global" });
};

// ---- Step 5: open the shop ----------------------------------------------------------------------------------------

const summary = computed(() => shopSummary(draft.value));

const ROW_ICONS: Record<ShopSummaryRow["id"], string> = { shop: "store", clerk: "user", look: "paint-brush", hours: "clock", shelves: "boxes" };

// A tap on a row goes straight back to the step that owns the answer
const goToStep = (id: ShopStepId) => {
  const target = steps.findIndex((step) => step.id === id);
  if (target >= 0) position.value = target;
};

const openShop = async () => {
  if (saving.value) return;
  saving.value = true;
  try {
    await shopsDb.setShop(shopToRecord(draft.value, original.value));
    play$fx("yes");
    void say(isEdit.value ? "Shop updated" : "Shop opened", `${draft.value.name.trim()} is ready for heroes.`);
    goBack();
  } catch (error) {
    debug.warn("[ShopWizard] the shop could not be saved", error);
    play$fx("no");
    void say("It could not be saved", "Try Open once more.");
  } finally {
    saving.value = false;
  }
};
</script>

<style lang="scss" scoped src="./_XpCreateUpdateShop.scss" />

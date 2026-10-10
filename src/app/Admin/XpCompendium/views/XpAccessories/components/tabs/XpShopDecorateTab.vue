<template>
  <ion-page class="xp-shop-decorate-tab">
    <ion-content class="ion-padding transparent-content" :fullscreen="true">
      <div v-if="isLoading" class="loading-wrapper-centered">
        <XpLoading />
      </div>

      <div v-else-if="shop" class="content-wrapper">
        <div class="tab-header">
          <i class="fad fa-paint-brush fa-3x"></i>
          <h1 class="tab-title">Decorate Shop</h1>
          <p class="tab-lead">
            The picture behind {{ shop.name }} and the sign over its door.
          </p>
        </div>

        <section class="panel">
          <div class="field-label">Preview</div>
          <div class="preview" :style="{ '--preview-bg': `url(${previewBg})` }">
            <div class="preview-shade">
              <i :class="[draftIcon, 'fa-3x']"></i>
              <div class="preview-name">{{ shop.name }}</div>
            </div>
          </div>
        </section>

        <section class="panel">
          <div class="field-label">Background</div>
          <div class="choice-grid">
            <button
              v-for="world in worlds"
              :key="world.id"
              type="button"
              class="choice world-choice"
              :class="{ 'is-picked': draftWorld === world.id }"
              :aria-pressed="draftWorld === world.id"
              @click="pickWorld(world.id)"
            >
              <img :src="world.image" alt="" loading="lazy" />
              <span class="choice-name">{{ world.label }}</span>
              <span v-if="world.isDefault" class="choice-tag">Default</span>
            </button>
          </div>
          <p class="hint">
            Heroes see this art behind the shop. The default keeps the picture
            the shop already had.
          </p>
        </section>

        <section class="panel">
          <div class="field-label">Icon</div>
          <div class="choice-grid icon-grid">
            <button
              v-for="icon in icons"
              :key="icon.value"
              type="button"
              class="choice icon-choice"
              :class="{ 'is-picked': draftIcon === icon.value }"
              :aria-pressed="draftIcon === icon.value"
              :aria-label="icon.label"
              :title="icon.label"
              @click="pickIcon(icon.value)"
            >
              <i :class="[icon.value, 'fa-2x']"></i>
              <span v-if="icon.isDefault" class="choice-tag">Default</span>
            </button>
          </div>
        </section>

        <div class="actions">
          <ion-button
            color="rpg"
            expand="block"
            :disabled="!isDirty || isSaving"
            @click="save"
          >
            <i class="fad fa-save"></i>&nbsp; Save look
          </ion-button>
          <ion-button
            v-if="canReset"
            fill="clear"
            color="medium"
            expand="block"
            :disabled="isSaving"
            @click="resetLook"
          >
            Back to the default look
          </ion-button>
        </div>
      </div>

      <div v-else class="tab-header">
        <i class="fad fa-store-slash fa-3x"></i>
        <p class="tab-lead">This shop could not be found.</p>
      </div>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
  import { computed, defineComponent, inject, ref, Ref, watch } from "vue";
  import Ionic from "@/lib/mixins/ionic";
  import XpLoading from "@/components/molecules/Loading/XpLoading.vue";
  import { play$fx } from "@/assets/fx";
  import debug from "@/lib/utils/debug";
  import { SHOP_METADATA } from "@/lib/engine/core/shopRegistry";
  import {
    ShopInterface,
    customIcon,
    customWorld,
  } from "@/lib/databases/ShopsDb";
  import {
    SHOP_WORLD_CHOICES,
    saveShopFields,
    shopToast,
    shopWorldBackground,
  } from "../../hooks/useShopData";

  // Duotone Font Awesome names that suit a shop sign (all of them are in the bundled icon set).
  const SHOP_ICON_NAMES = [
    "store",
    "store-alt",
    "shopping-bag",
    "sack-dollar",
    "treasure-chest",
    "gem",
    "farm",
    "pegasus",
    "horse",
    "ship",
    "anchor",
    "campground",
    "caravan",
    "wagon-covered",
    "dungeon",
    "igloo",
    "snowflake",
    "island-tropical",
    "cactus",
    "cauldron",
    "hat-witch",
    "hat-wizard",
    "flask-potion",
    "book-spells",
    "scroll",
    "swords",
    "shield",
    "crown",
    "chess-rook",
    "moon",
    "cloud",
    "mountain",
    "tree",
    "house",
    "torii-gate",
    "skull",
  ];

  const iconClass = (name: string) => `fad fa-${name}`;
  const iconLabel = (value: string) =>
    value
      .replace(/^fa[dsrlb]? fa-/, "")
      .replace(/-/g, " ")
      .replace(/^./, (letter) => letter.toUpperCase());

  export default defineComponent({
    name: "XpShopDecorateTab",
    mixins: [Ionic],
    components: {
      XpLoading,
    },
    props: {
      shopId: { type: String, required: true },
    },
    setup() {
      const shop = inject<Ref<ShopInterface | null>>("shop");
      const isLoading = inject<Ref<boolean>>("isLoading");

      const draftWorld = ref("");
      const draftIcon = ref("");
      const isSaving = ref(false);

      const blueprint = computed(() => SHOP_METADATA[shop?.value?.id ?? ""]);
      const defaultWorld = computed(() => blueprint.value?.world ?? "");
      const defaultIcon = computed(() =>
        blueprint.value ? iconClass(blueprint.value.icon) : ""
      );

      watch(
        () => shop?.value,
        (loaded) => {
          draftWorld.value = loaded?.world ?? "";
          draftIcon.value = loaded?.icon || iconClass("store");
        },
        { immediate: true }
      );

      const worlds = computed(() =>
        SHOP_WORLD_CHOICES.map((world) => ({
          ...world,
          image: shopWorldBackground(world.id),
          isDefault: world.id === defaultWorld.value,
        }))
      );

      // The shop's default and current icons are always on offer, even when they are not stock choices.
      const icons = computed(() => {
        const stock = SHOP_ICON_NAMES.map(iconClass);
        const offered = [defaultIcon.value, shop?.value?.icon].filter(Boolean) as string[];
        const extra = Array.from(new Set(offered)).filter((value) => !stock.includes(value));
        return [...extra, ...stock].map((value) => ({
          value,
          label: iconLabel(value),
          isDefault: value === defaultIcon.value,
        }));
      });

      const previewBg = computed(() => shopWorldBackground(draftWorld.value));

      const isDirty = computed(
        () =>
          draftWorld.value !== (shop?.value?.world ?? "") ||
          draftIcon.value !== (shop?.value?.icon ?? "")
      );
      const canReset = computed(
        () =>
          !!blueprint.value &&
          !!(customWorld(shop?.value) || customIcon(shop?.value))
      );

      const pickWorld = (id: string) => {
        play$fx("cursor");
        draftWorld.value = id;
      };
      const pickIcon = (value: string) => {
        play$fx("cursor");
        draftIcon.value = value;
      };

      const persist = async (world: string, icon: string, message: string) => {
        if (isSaving.value) return;
        const current = shop?.value;
        if (!current) return;
        isSaving.value = true;
        try {
          await saveShopFields(current, { world, icon });
          draftWorld.value = world;
          draftIcon.value = icon;
          play$fx("select");
          await shopToast(message);
        } catch (error) {
          debug.error("Could not save the shop look", error);
          play$fx("no");
          await shopToast("The look could not be saved. Please try again.");
        } finally {
          isSaving.value = false;
        }
      };

      const save = () =>
        persist(
          draftWorld.value,
          draftIcon.value,
          `${shop?.value?.name ?? "The shop"} has a new look.`
        );

      const resetLook = () =>
        persist(
          defaultWorld.value,
          defaultIcon.value,
          "The default look is back."
        );

      return {
        shop,
        isLoading,
        draftWorld,
        draftIcon,
        isSaving,
        worlds,
        icons,
        previewBg,
        isDirty,
        canReset,
        pickWorld,
        pickIcon,
        save,
        resetLook,
      };
    },
  });
</script>

<style lang="scss" scoped>
  .transparent-content {
    --background: transparent;
  }

  .content-wrapper {
    padding: 16px 0 96px;
    max-width: 760px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .tab-header {
    text-align: center;

    i {
      color: var(--eb-color-pale-yellow);
      filter: drop-shadow(0 0 16px rgba(var(--ion-color-warning-rgb), 0.5));
    }

    .tab-title {
      font-family: "Twoson", serif;
      font-size: 2rem;
      color: #fff;
      text-transform: uppercase;
      letter-spacing: 2px;
      text-shadow: 2px 2px 0 rgba(0, 0, 0, 0.8);
      margin: 0.5rem 0;
    }

    .tab-lead {
      font-family: "Apple Kid", sans-serif;
      font-size: 1.1rem;
      color: rgba(255, 255, 255, 0.8);
      line-height: 1.4;
      margin: 0 auto;
    }
  }

  .panel {
    padding: 16px;
    background: rgba(25, 27, 46, 0.6);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
  }

  .field-label {
    font-family: "StatusPlz", monospace;
    font-size: 0.9rem;
    color: var(--eb-color-pale-yellow);
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 10px;
  }

  .hint {
    font-family: "Apple Kid", sans-serif;
    font-size: 0.95rem;
    color: rgba(255, 255, 255, 0.6);
    margin: 12px 0 0;
  }

  .preview {
    height: 160px;
    border-radius: 12px;
    overflow: hidden;
    background-image: var(--preview-bg);
    background-size: cover;
    background-position: center;

    .preview-shade {
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-end;
      gap: 8px;
      padding: 12px;
      box-sizing: border-box;
      background: linear-gradient(to top, rgba(0, 0, 0, 0.85), rgba(0, 0, 0, 0.1));

      i {
        color: var(--eb-color-pale-yellow);
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
      }
    }

    .preview-name {
      font-family: "StatusPlz", monospace;
      font-size: 1.3rem;
      color: #fff;
      text-align: center;
      text-transform: uppercase;
      letter-spacing: 1px;
      overflow-wrap: anywhere;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
    }
  }

  .choice-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
    gap: 10px;

    &.icon-grid {
      grid-template-columns: repeat(auto-fill, minmax(64px, 1fr));
    }
  }

  .choice {
    position: relative;
    padding: 0;
    color: #fff;
    background: rgba(255, 255, 255, 0.06);
    border: 2px solid rgba(255, 255, 255, 0.12);
    border-radius: 10px;
    overflow: hidden;
    cursor: pointer;

    &.is-picked {
      border-color: var(--eb-color-pale-yellow, #f7e8a8);
      background: rgba(247, 232, 168, 0.18);
    }

    .choice-tag {
      position: absolute;
      top: 4px;
      right: 4px;
      padding: 1px 5px;
      font-family: "StatusPlz", monospace;
      font-size: 0.6rem;
      text-transform: uppercase;
      color: var(--eb-color-dark-purple, #280828);
      background: var(--eb-color-sky-blue, #68a8d8);
      border-radius: 4px;
    }
  }

  .world-choice {
    display: flex;
    flex-direction: column;

    img {
      width: 100%;
      height: 64px;
      object-fit: cover;
      display: block;
    }

    .choice-name {
      padding: 6px 4px;
      font-family: "StatusPlz", monospace;
      font-size: 0.85rem;
      text-transform: uppercase;
      overflow-wrap: anywhere;
    }
  }

  .icon-choice {
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: center;

    i {
      color: var(--eb-color-pale-yellow);
    }
  }
</style>

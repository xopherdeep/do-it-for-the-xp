<template>
  <ion-page class="xp-shop-clerk-tab">
    <ion-content class="ion-padding transparent-content" :fullscreen="true">
      <div v-if="isLoading" class="loading-wrapper-centered">
        <XpLoading />
      </div>

      <div v-else-if="shop" class="content-wrapper">
        <div class="tab-header">
          <i class="fad fa-user-friends fa-3x"></i>
          <h1 class="tab-title">Shop Clerk</h1>
          <p class="tab-lead">
            Who stands behind the counter at {{ shop.name }}, and what they say
            when a hero walks in.
          </p>
        </div>

        <section class="panel">
          <div class="field-label">Clerk name</div>
          <ion-input
            v-model="clerkName"
            class="custom-input"
            :placeholder="defaults.shopkeep"
            :maxlength="40"
            aria-label="Clerk name"
          ></ion-input>

          <div class="field-label">Greeting</div>
          <ion-textarea
            v-model="greeting"
            class="custom-input"
            :placeholder="defaults.greeting"
            :rows="3"
            :maxlength="200"
            :auto-grow="true"
            aria-label="Greeting"
          ></ion-textarea>

          <p class="hint">
            Leave a box empty and heroes get the portal's own clerk and line for
            this shop (shown in grey).
          </p>
        </section>

        <section class="panel">
          <div class="field-label">What heroes see</div>
          <div class="speech">
            <div class="speech-name">{{ previewName }}</div>
            <p class="speech-line">{{ previewGreeting }}</p>
          </div>
        </section>

        <div class="actions">
          <ion-button
            color="rpg"
            expand="block"
            :disabled="!isDirty || isSaving"
            @click="save"
          >
            <i class="fad fa-save"></i>&nbsp; Save clerk
          </ion-button>
          <ion-button
            fill="clear"
            color="medium"
            expand="block"
            :disabled="!hasCustomClerk || isSaving"
            @click="useDefault"
          >
            Back to the default clerk
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
    clerkDefaultFor,
    customClerkName,
    customGreeting,
  } from "@/lib/databases/ShopsDb";
  import { saveShopFields, shopToast } from "../../hooks/useShopData";

  export default defineComponent({
    name: "XpShopClerkTab",
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

      const clerkName = ref("");
      const greeting = ref("");
      const isSaving = ref(false);

      // What the shop already holds of the Game Master's own: the portal's clerk stands in until then.
      const savedName = computed(() => customClerkName(shop?.value));
      const savedGreeting = computed(() => customGreeting(shop?.value));
      const defaults = computed(() => clerkDefaultFor(shop?.value?.id));

      watch(
        () => shop?.value,
        () => {
          clerkName.value = savedName.value;
          greeting.value = savedGreeting.value;
        },
        { immediate: true }
      );

      const isDirty = computed(
        () =>
          clerkName.value.trim() !== savedName.value ||
          greeting.value.trim() !== savedGreeting.value
      );
      const hasCustomClerk = computed(
        () => !!(savedName.value || savedGreeting.value)
      );
      const previewName = computed(
        () => clerkName.value.trim() || defaults.value.shopkeep
      );
      const previewGreeting = computed(
        () => greeting.value.trim() || defaults.value.greeting
      );

      // An empty name puts the shop's registry clerk back, which the hero's portal reads as "no custom clerk".
      const persist = async (name: string, line: string, message: string) => {
        if (isSaving.value) return;
        const current = shop?.value;
        if (!current) return;
        isSaving.value = true;
        try {
          await saveShopFields(current, {
            clerkName: name || SHOP_METADATA[current.id]?.clerkName || "",
            greeting: line || undefined,
          });
          clerkName.value = savedName.value;
          greeting.value = savedGreeting.value;
          play$fx("select");
          await shopToast(message);
        } catch (error) {
          debug.error("Could not save the shop clerk", error);
          play$fx("no");
          await shopToast("The clerk could not be saved. Please try again.");
        } finally {
          isSaving.value = false;
        }
      };

      const save = () =>
        persist(
          clerkName.value.trim(),
          greeting.value.trim(),
          `${previewName.value} is behind the counter.`
        );

      const useDefault = () => persist("", "", "The default clerk is back.");

      return {
        shop,
        isLoading,
        clerkName,
        greeting,
        isSaving,
        defaults,
        isDirty,
        hasCustomClerk,
        previewName,
        previewGreeting,
        save,
        useDefault,
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
    max-width: 640px;
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
    margin: 12px 0 6px;

    &:first-child {
      margin-top: 0;
    }
  }

  .custom-input {
    --background: rgba(255, 255, 255, 0.1);
    --padding-start: 12px;
    --padding-end: 12px;
    --color: #fff;
    --placeholder-color: rgba(255, 255, 255, 0.45);
    --placeholder-opacity: 1;
    border-radius: 8px;
    font-family: "Apple Kid", sans-serif;
    font-size: 1.1rem;
  }

  .hint {
    font-family: "Apple Kid", sans-serif;
    font-size: 0.9rem;
    color: rgba(255, 255, 255, 0.55);
    margin: 12px 0 0;
  }

  .speech {
    padding: 12px 14px;
    background: var(--eb-color-dark-purple, #280828);
    border: 3px solid var(--eb-color-pale-yellow, #f7e8a8);
    border-radius: 6px;

    .speech-name {
      font-family: "StatusPlz", monospace;
      font-size: 1rem;
      color: var(--eb-color-sky-blue, #68a8d8);
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .speech-line {
      font-family: "Apple Kid", sans-serif;
      font-size: 1.15rem;
      color: #fff;
      line-height: 1.35;
      margin: 6px 0 0;
      overflow-wrap: anywhere;
    }
  }

  .actions {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
</style>

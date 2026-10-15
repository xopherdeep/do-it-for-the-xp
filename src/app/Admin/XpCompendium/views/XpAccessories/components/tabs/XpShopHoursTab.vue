<template>
  <ion-page class="xp-shop-hours-tab">
    <ion-content class="ion-padding transparent-content" :fullscreen="true">
      <div v-if="isLoading" class="loading-wrapper-centered">
        <XpLoading />
      </div>

      <div v-else-if="shop" class="content-wrapper">
        <div class="tab-header">
          <i class="fad fa-clock fa-3x"></i>
          <h1 class="tab-title">Shop Hours</h1>
          <p class="tab-lead">
            When {{ shop.name }} is open for heroes. Outside these hours the
            clerk turns them away and nothing can be bought.
          </p>
        </div>

        <section class="panel">
          <ion-toggle
            class="always-toggle"
            label-placement="start"
            justify="space-between"
            :checked="alwaysOpen"
            @ionChange="setAlwaysOpen($event.detail.checked)"
          >
            Always open
          </ion-toggle>

          <div v-if="!alwaysOpen" class="time-row">
            <label class="time-field">
              <span class="field-label">Opens</span>
              <input v-model="openAt" type="time" class="time-input" required />
            </label>
            <label class="time-field">
              <span class="field-label">Closes</span>
              <input v-model="closeAt" type="time" class="time-input" required />
            </label>
          </div>

          <p v-if="!alwaysOpen && !isValid" class="hint hint-warning">
            Pick both an opening and a closing time.
          </p>
          <p v-else-if="!alwaysOpen && isRoundTheClock" class="hint">
            Opening and closing at the same time keeps the shop open all day.
          </p>
          <p v-else-if="!alwaysOpen && isOvernight" class="hint">
            This runs past midnight: heroes can shop until {{ closeLabel }} the
            next morning.
          </p>
        </section>

        <section class="panel">
          <div class="field-label">Right now</div>
          <div class="status" :class="openNow ? 'is-open' : 'is-closed'">
            <i
              class="fad"
              :class="openNow ? 'fa-door-open' : 'fa-door-closed'"
            ></i>
            <div>
              <div class="status-name">{{ openNow ? "Open" : "Closed" }}</div>
              <div class="status-detail">
                {{ openNow ? summary : nextOpening }}
              </div>
            </div>
          </div>
        </section>

        <div class="actions">
          <ion-button
            color="rpg"
            expand="block"
            :disabled="!isDirty || !canSave"
            @click="save"
          >
            <i class="fad fa-save"></i>&nbsp; Save hours
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
  import {
    computed,
    defineComponent,
    inject,
    onBeforeUnmount,
    ref,
    Ref,
    watch,
  } from "vue";
  import Ionic from "@/lib/mixins/ionic";
  import XpLoading from "@/components/molecules/Loading/XpLoading.vue";
  import { play$fx } from "@/assets/fx";
  import debug from "@/lib/utils/debug";
  import { ShopInterface } from "@/lib/databases/ShopsDb";
  import {
    DEFAULT_SHOP_HOURS,
    ShopHours,
    clockToMinutes,
    formatClock,
    hoursSummary,
    isShopOpen,
    opensAtLabel,
  } from "@/lib/services/shops/shopHours";
  import { saveShopFields, shopToast } from "../../hooks/useShopData";

  export default defineComponent({
    name: "XpShopHoursTab",
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

      const alwaysOpen = ref(true);
      const openAt = ref(DEFAULT_SHOP_HOURS.open);
      const closeAt = ref(DEFAULT_SHOP_HOURS.close);
      const isSaving = ref(false);

      // Only hours with two readable times count; anything else is an always open shop, as the hero's shop reads it.
      const savedHours = computed<ShopHours | null>(() => {
        const hours = shop?.value?.hours;
        const readable =
          !!hours &&
          clockToMinutes(hours.open) !== null &&
          clockToMinutes(hours.close) !== null;
        return readable ? hours! : null;
      });

      const loadDraft = () => {
        const hours = savedHours.value;
        alwaysOpen.value = !hours;
        openAt.value = hours?.open ?? DEFAULT_SHOP_HOURS.open;
        closeAt.value = hours?.close ?? DEFAULT_SHOP_HOURS.close;
      };
      watch(() => shop?.value, loadDraft, { immediate: true });

      const setAlwaysOpen = (checked: boolean) => {
        alwaysOpen.value = checked;
      };

      const isValid = computed(
        () =>
          alwaysOpen.value ||
          (clockToMinutes(openAt.value) !== null &&
            clockToMinutes(closeAt.value) !== null)
      );
      const draftHours = computed<ShopHours | null>(() =>
        alwaysOpen.value || !isValid.value
          ? null
          : { open: openAt.value, close: closeAt.value }
      );
      const hoursKey = (hours: ShopHours | null) =>
        hours ? `${hours.open}-${hours.close}` : "always";
      const isDirty = computed(
        () => hoursKey(savedHours.value) !== hoursKey(draftHours.value)
      );
      const canSave = computed(() => isValid.value && !isSaving.value);

      const isRoundTheClock = computed(
        () => isValid.value && openAt.value === closeAt.value
      );
      const isOvernight = computed(
        () =>
          isValid.value &&
          (clockToMinutes(closeAt.value) as number) <
            (clockToMinutes(openAt.value) as number)
      );
      const closeLabel = computed(() => formatClock(closeAt.value));

      // The clock the status line reads, kept fresh while the tab is open.
      const now = ref(new Date());
      const ticker = setInterval(() => {
        now.value = new Date();
      }, 30000);
      onBeforeUnmount(() => clearInterval(ticker));

      const openNow = computed(() => isShopOpen(draftHours.value, now.value));
      const summary = computed(() => hoursSummary(draftHours.value));
      const nextOpening = computed(() =>
        opensAtLabel(draftHours.value, now.value)
      );

      const save = async () => {
        if (!canSave.value) return;
        const current = shop?.value;
        if (!current) return;
        isSaving.value = true;
        try {
          const hours = draftHours.value;
          await saveShopFields(current, { hours });
          play$fx("select");
          await shopToast(
            hours
              ? `${current.name} is open ${hoursSummary(hours)}.`
              : `${current.name} is open all day.`
          );
        } catch (error) {
          debug.error("Could not save the shop hours", error);
          play$fx("no");
          await shopToast("The hours could not be saved. Please try again.");
        } finally {
          isSaving.value = false;
        }
      };

      return {
        shop,
        isLoading,
        alwaysOpen,
        openAt,
        closeAt,
        canSave,
        isValid,
        isDirty,
        isRoundTheClock,
        isOvernight,
        closeLabel,
        openNow,
        summary,
        nextOpening,
        setAlwaysOpen,
        save,
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
    display: block;
    font-family: "StatusPlz", monospace;
    font-size: 0.9rem;
    color: var(--eb-color-pale-yellow);
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 6px;
  }

  .always-toggle {
    font-family: "StatusPlz", monospace;
    font-size: 1.1rem;
    color: #fff;
  }

  .time-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 16px;
    margin-top: 16px;
  }

  .time-input {
    width: 100%;
    box-sizing: border-box;
    padding: 10px 12px;
    font-family: "StatusPlz", monospace;
    font-size: 1.3rem;
    color: #fff;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 8px;
    color-scheme: dark;
  }

  .hint {
    font-family: "Apple Kid", sans-serif;
    font-size: 0.95rem;
    color: rgba(255, 255, 255, 0.6);
    margin: 14px 0 0;

    &.hint-warning {
      color: var(--ion-color-warning);
    }
  }

  .status {
    display: flex;
    align-items: center;
    gap: 16px;

    i {
      font-size: 2rem;
      width: 40px;
      text-align: center;
    }

    &.is-open i {
      color: var(--ion-color-success);
    }

    &.is-closed i {
      color: var(--ion-color-danger);
    }

    .status-name {
      font-family: "StatusPlz", monospace;
      font-size: 1.3rem;
      color: #fff;
      text-transform: uppercase;
    }

    .status-detail {
      font-family: "Apple Kid", sans-serif;
      font-size: 1rem;
      color: rgba(255, 255, 255, 0.7);
    }
  }
</style>

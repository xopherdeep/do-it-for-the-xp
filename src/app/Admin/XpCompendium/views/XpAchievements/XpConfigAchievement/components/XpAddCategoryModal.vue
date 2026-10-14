<template>
  <ion-modal :is-open="isOpen" @didDismiss="didDismiss">
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button @click="didDismiss">
            <i class="fad fa-times"></i>
          </ion-button>
        </ion-buttons>

        <ion-title>Categories</ion-title>
        <ion-buttons slot="end">
          <ion-button
            expand="full"
            class="mx-2"
            data-test="save-category"
            @click="addNewCategory"
            :disabled="newCategoryName.trim().length < 3"
          >
            {{ typedMatch ? "Pick" : "Save" }}
            <i class="fad fa-save fa-lg mx-2"></i>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="bg-slide">
      <!-- Tap a category to file the quest under it -->
      <ion-list v-if="categories.length > 0">
        <ion-list-header> Pick a category </ion-list-header>
        <ion-item
          v-for="category in categories"
          :key="`pick-${category.id}`"
          button
          :detail="false"
          class="category-pick"
          :class="{ 'is-current': category.id === current }"
          :data-test="`pick-${category.id}`"
          @click="pickCategory(category)"
        >
          <i class="fad fa-tag mr-3" slot="start" aria-hidden="true"></i>
          <ion-label>{{ category.name }}</ion-label>
          <i
            v-if="category.id === current"
            class="fad fa-check-circle fa-lg"
            slot="end"
            aria-label="Chosen"
          ></i>
          <ion-note v-else slot="end">{{ questCountLabel(category) }}</ion-note>
        </ion-item>
      </ion-list>

      <ion-grid class="ion-no-padding">
        <ion-row>
          <ion-col>
            <ion-list>
              <ion-list-header> Add your own </ion-list-header>
              <ion-item>
                <i class="fad fa-tags fa-lg mr-3" slot="start" aria-hidden="true"></i>
                <ion-input
                  v-model="newCategoryName"
                  data-test="category-name"
                  placeholder="Enter Category Name"
                ></ion-input>
              </ion-item>
              <ion-list-header v-if="categoriesNotAdded.length > 0">
                Use a predefined category
              </ion-list-header>
              <ion-radio-group
                v-if="categoriesNotAdded.length > 0"
                @ionChange="setPredefinedCategory"
              >
                <ion-item size="4" v-for="cat in categoriesNotAdded" :key="cat">
                  <i class="fad fa-tag mr-3" slot="start" aria-hidden="true"></i>
                  <ion-label>
                    {{ cat }}
                  </ion-label>
                  <ion-radio name="category" :value="cat"></ion-radio>
                </ion-item>
              </ion-radio-group>
              <ion-item v-else>
                <ion-label>
                  You're using all our predefined categories - Way to go!
                </ion-label>
                <i class="fad fa-ban ion-float-right" slot="end"></i>
              </ion-item>
            </ion-list>
          </ion-col>
        </ion-row>
      </ion-grid>

      <ion-list v-if="categories.length > 0">
        <ion-list-header> Rename or delete </ion-list-header>
        <ion-item v-for="category in categories" :key="category.id">
          <i class="fad fa-tag mr-3" slot="start" aria-hidden="true"></i>
          <ion-input
            :value="category.name"
            :aria-label="`Rename ${category.name}`"
            @ionChange="renameCategory(category, $event.detail.value)"
          >
          </ion-input>
          <ion-note slot="end" class="mr-2">{{ questCountLabel(category) }}</ion-note>
          <ion-buttons slot="end">
            <ion-button
              :color="armedId === category.id ? 'warning' : 'danger'"
              :aria-label="armedId === category.id ? `Tap again to delete ${category.name}` : `Delete ${category.name}`"
              :data-test="`delete-${category.id}`"
              @click="deleteCategory(category)"
            >
              <i class="fad fa-trash fa-lg"></i>
              <span v-if="armedId === category.id" class="ml-1">Sure?</span>
            </ion-button>
          </ion-buttons>
        </ion-item>
      </ion-list>
    </ion-content>
    <ion-footer>
      <ion-toolbar>
        <ion-button @click="didDismiss"> Cancel </ion-button>
      </ion-toolbar>
    </ion-footer>
  </ion-modal>
</template>

<script lang="ts">
  import { defineComponent, ref } from "vue";
  import ionic from "@/lib/mixins/ionic";
  import { toastController } from "@ionic/vue";
  import { v4 as uuid4 } from "uuid";
  import { useTimers } from "@/hooks/useTimers";
  import debug from "@/lib/utils/debug";
  import { findCategory } from "../../questConfigWizard";

  /** How long the trash button stays armed ("Sure?") before it goes back to being a plain trash can */
  const ARMED_MS = 3000;

  export default defineComponent({
    name: "xp-add-category",
    // questCounts: quests per category id (a category in use can't be deleted); current: the id the quest is filed under
    props: ["isOpen", "categories", "questCounts", "current"],
    emits: ["dismiss", "add-category", "pick-category", "edit-categories", "delete-category"],
    mixins: [ionic],
    data() {
      return {
        newCategoryName: "",
        // The category whose trash button was tapped once: a second tap deletes it
        armedId: "",
      };
    },
    computed: {
      categoriesNotAdded() {
        // return a list of predefined categoreis that aren't found in categories.
        return this.predefinedCategories.filter((predefinedCat) => {
          return !this.categories.some(
            (category) => category.name === predefinedCat
          );
        });
      },
      // The category a typed name already is: Save then picks it instead of adding a second one
      typedMatch() {
        return findCategory(this.categories || [], this.newCategoryName);
      },
    },
    methods: {
      didDismiss() {
        this.armedId = "";
        this.$emit("dismiss");
      },
      editCategories() {
        this.$emit("edit-categories", this.categories);
      },
      questCountLabel(category) {
        const count = this.questCounts?.[category.id] || 0;
        return count === 1 ? "1 quest" : `${count} quests`;
      },
      // A tap on a row files the quest under that category and closes the list
      pickCategory(category) {
        this.$emit("pick-category", category);
        this.didDismiss();
      },
      renameCategory(category, name) {
        const trimmed = (name || "").trim();
        const shouldSkipRename = !trimmed || trimmed === category.name;
        if (shouldSkipRename) return;
        this.$emit(
          "edit-categories",
          this.categories.map((cat) => (cat.id === category.id ? { ...cat, name: trimmed } : cat))
        );
      },
      async say(header, message) {
        try {
          const toast = await toastController.create({
            header,
            message,
            duration: 3000,
            position: "middle",
            buttons: [{ text: "Close", role: "cancel" }],
            cssClass: "rpg-toast",
          });
          await toast.present();
        } catch (error) {
          debug.warn("[Categories] the toast could not be shown", error);
        }
      },
      async deleteCategory(category) {
        const count = this.questCounts?.[category.id] || 0;
        // A category in use stays: its quests would point at nothing and fall under "Uncategorized"
        if (count > 0) {
          this.armedId = "";
          await this.say(
            `${category.name} is in use`,
            `${this.questCountLabel(category)} ${count === 1 ? "uses" : "use"} this category. Move ${count === 1 ? "it" : "them"} to another category first.`
          );
          return;
        }
        // The first tap arms the button, the second deletes: no alert in the way
        if (this.armedId !== category.id) {
          this.armedId = category.id;
          this.startTimeout(ARMED_MS, () => {
            if (this.armedId === category.id) this.armedId = "";
          });
          return;
        }
        this.armedId = "";
        this.$emit("delete-category", category);
      },
      addNewCategory() {
        // The parent files the quest under it; a name that already exists is picked there, not added twice
        this.$emit("add-category", {
          id: uuid4(),
          name: this.newCategoryName,
        });
        this.newCategoryName = "";
        this.$emit("dismiss");
      },
      setPredefinedCategory($event) {
        this.newCategoryName = $event.detail.value;
      },
    },
    setup() {
      const { startTimeout } = useTimers();
      const predefinedCategories = ref([
        "After School",
        "Bathroom",
        "Before School",
        "Cleaning",
        "Evening",
        "Garden",
        "Healthy Habit",
        "Home",
        "Kitchen",
        "Maintenance",
        "Meals",
        "Morning",
        "Personal",
      ]);

      return {
        predefinedCategories,
        startTimeout,
      };
    },
  });
</script>

<style lang="scss" scoped>
  // The category the quest is filed under: its tag and check wear the app's accent
  .category-pick.is-current {
    i {
      color: var(--xp-app-accent, var(--ion-color-rpg));
    }
  }
</style>

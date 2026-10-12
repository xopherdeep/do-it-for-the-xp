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
            @click="addNewCategory"
            :disabled="newCategoryName.length < 3"
          >
            Save
            <i class="fad fa-save fa-lg mx-2"></i>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="bg-slide">
      <ion-grid class="ion-no-padding">
        <ion-row>
          <ion-col>
            <ion-list>
              <ion-item>
                <i class="fad fa-tags fa-lg mr-3" slot="start" aria-hidden="true"></i>
                <ion-input
                  v-model="newCategoryName"
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

      <ion-list>
        <ion-list-header> Your categories </ion-list-header>
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
              @click="deleteCategory(category)"
              color="danger"
              :aria-label="`Delete ${category.name}`"
            >
              <i class="fad fa-trash fa-lg"></i>
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
  import { alertController } from "@ionic/vue";
  import { v4 as uuid4 } from "uuid";

  export default defineComponent({
    name: "xp-add-category",
    // questCounts: quests per category id (a category in use can't be deleted)
    props: ["isOpen", "categories", "questCounts"],
    mixins: [ionic],
    data() {
      return {
        newCategoryName: "",
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
    },
    methods: {
      didDismiss() {
        this.$emit("dismiss");
      },
      editCategories() {
        this.$emit("edit-categories", this.categories);
      },
      questCountLabel(category) {
        const count = this.questCounts?.[category.id] || 0;
        return count === 1 ? "1 quest" : `${count} quests`;
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
      async deleteCategory(category) {
        const count = this.questCounts?.[category.id] || 0;
        // A category in use stays: its quests would point at nothing and fall under "Uncategorized"
        if (count > 0) {
          const blocked = await alertController.create({
            header: `${category.name} is in use`,
            message: `${this.questCountLabel(category)} ${count === 1 ? "uses" : "use"} this category. Move ${count === 1 ? "it" : "them"} to another category first.`,
            buttons: ["OK"],
          });
          await blocked.present();
          return;
        }
        const alert = await alertController.create({
          header: `Delete ${category.name}?`,
          message: "No quests use it.",
          buttons: [
            {
              text: "Cancel",
              role: "cancel",
            },
            {
              text: "Delete",
              role: "destructive",
              handler: () => {
                this.$emit("delete-category", category);
              },
            },
          ],
        });
        await alert.present();
      },
      addNewCategory() {
        // emit event with new category name
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
      };
    },
  });
</script>

<style></style>

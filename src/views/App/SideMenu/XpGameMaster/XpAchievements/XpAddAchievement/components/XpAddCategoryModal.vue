<template>
  <ion-modal
    :is-open="isOpen"
    @didDismiss="didDismiss"
  >
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button @click="didDismiss">
            <i class="fad fa-times"></i>
          </ion-button>
        </ion-buttons>

        <ion-title>Add New Category</ion-title>
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
                <ion-avatar
                  @click="openActionSheet"
                  slot="start"
                >
                  <ion-skeleton-text></ion-skeleton-text>
                </ion-avatar>
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
                <ion-item
                  size="4"
                  v-for=" cat  in  categoriesNotAdded "
                  :key="cat"
                >
                  <ion-avatar slot="start">
                    <ion-skeleton-text />
                  </ion-avatar>
                  <ion-label>
                    {{ cat }}
                  </ion-label>
                  <ion-radio
                    name="category"
                    :value="cat"
                  ></ion-radio>
                </ion-item>
              </ion-radio-group>
              <ion-item v-else>
                <ion-label>
                  You're using all our predefined categories - Way to go!
                </ion-label>
                <i
                  class="fad fa-ban ion-float-right"
                  slot="end"
                ></i>
              </ion-item>
            </ion-list>
          </ion-col>
        </ion-row>
      </ion-grid>

      <ion-list>
        <ion-list-header>
          Categories
        </ion-list-header>
        <ion-item
          v-for="category in categories"
          :key="category.id"
        >
          <ion-avatar slot="start">
            <ion-skeleton-text/>
          </ion-avatar>
          <ion-input :value="category.name">

          </ion-input>
          <!-- {{ category.name }} -->
          <ion-buttons slot="end">
            <ion-button
              @click="deleteCategory(category)"
              color="danger"
            >
              <i class="fad fa-trash fa-lg"></i>
            </ion-button>
          </ion-buttons>
        </ion-item>
      </ion-list>

    </ion-content>
    <ion-footer>
      <ion-toolbar>
        <ion-button @click="didDismiss">
          Cancel
        </ion-button>
      </ion-toolbar>
    </ion-footer>
    <ion-action-sheet
      :is-open="actionSheetOpen"
      :header="'Choose an option'"
      :buttons="[
        { text: 'Take Picture', icon: cameraOutline, handler: () => { } },
        { text: 'Choose from Gallery', icon: imagesOutline, handler: () => { } },
        { text: 'Cancel', role: 'cancel' },
      ]
        "
      @didDismiss="actionSheetOpen = false"
    />
  </ion-modal>
</template>

<script lang="ts">
  import { defineComponent, ref } from "vue";
  import ionic from "@/mixins/ionic";
  import { alertController } from "@ionic/vue";
  import { cameraOutline, imagesOutline } from "ionicons/icons";
  import { v4 as uuid4 } from "uuid";

  export default defineComponent({
    name: "xp-add-category",
    props: ["isOpen", "categories"],
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
          return !this.categories.some((category) => category.name === predefinedCat);
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
      async deleteCategory(category) {
        const alert = await alertController.create({
          header: "Delete Category: " + category.name,
          message: "Are you sure you want to delete this category?",
          buttons: [
            {
              text: "Cancel",
              role: "cancel",
            },
            {
              text: "Delete",
              handler: () => {
                this.$emit("delete-category", category);
              }
            }
          ]
        })
        alert.present();
      },
      addNewCategory() {
        // emit event with new category name
        this.$emit("add-category", {
          id: uuid4(),
          name: this.newCategoryName
        });
        this.newCategoryName = "";
        this.$emit("dismiss");
      },
      setPredefinedCategory($event) {
        this.newCategoryName = $event.detail.value;

      }
    },
    setup() {
      const actionSheetOpen = ref(false);

      const openActionSheet = () => {
        actionSheetOpen.value = true;
      };

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
        actionSheetOpen,
        openActionSheet,
        cameraOutline,
        imagesOutline,
        predefinedCategories,
      };
    },
  });
</script>

<style></style>

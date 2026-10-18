import { defineComponent, ref, computed, onMounted, watch } from "vue";
import ionic from "@/lib/mixins/ionic";
import {
  add,
  listOutline,
  gridOutline,
  albumsOutline,
  homeOutline,
  gameControllerOutline,
  starOutline,
  closeOutline,
  colorWandOutline,
} from "ionicons/icons";
import { v4 as uuidv4 } from "uuid";
import {
  actionSheetController,
  toastController,
  onIonViewWillEnter,
} from "@ionic/vue";
import AbilitiesDb, { abilitiesStorage } from "@/lib/databases/AbilitiesDb";
import { confirmDelete } from "@/hooks/useConfirmDelete";
import { deletePower, usageOfPower } from "@/lib/services/compendium/deleteContent";
import { getCastLogDb, lastCastsOf } from "@/lib/databases/CastLogDb";
import XpAbilityManager from "@/components/molecules/Ability/XpAbilityManager.vue";
import XpIconPicker from "@/components/atoms/Icon/XpIconPicker.vue";
import XpLoading from "@/components/molecules/Loading/XpLoading.vue";
import {
  Ability,
  AbilityType,
  TimePeriod,
  ABILITY_CLASSES,
} from "@/hooks/abilities/abilityConstants";
import {
  REAL_LIFE_PRESETS,
  TIME_MAGE_PRESETS,
  TECH_MAGE_PRESETS,
} from "@/lib/services/abilities/AbilityPresets";
import {
  computeHeroAbilityStatuses,
  heroAbilitySnapshot,
} from "@/lib/services/abilities/heroAbilityStatus";
import { useUserStore } from "@/lib/store/stores/user";
import { play$fx } from "@/assets/fx";
import debug from "@/lib/utils/debug";
import { useRouter } from "vue-router";
import XpRpgPage from "@/components/templates/pages/XpRpgPage.vue";

export default defineComponent({
  name: "XpAbilities",
  components: {
    XpAbilityManager,
    XpIconPicker,
    XpLoading,
    XpRpgPage,
  },
  mixins: [ionic],
  setup() {
    // Database instance
    const abilitiesDb = new AbilitiesDb(abilitiesStorage);

    // State
    const abilities = ref<Ability[]>([]);
    const showAbilityModal = ref(false);
    const showPresetModal = ref(false);
    const showIconPicker = ref(false);
    const editingAbility = ref<Ability>({} as Ability);
    const viewMode = ref("list"); // 'list' or 'grid'
    const currentFilter = ref("all");
    const classFilter = ref("all");
    const isLoading = ref(true);
    const router = useRouter();
    const userStore = useUserStore();
    const selectedIconName = ref("");

    // Form field refs
    const apCost = ref(0);
    const selectedClass = ref("none");
    const selectedClassLevel = ref(1);
    const characterLevelRequired = ref("none");
    const scalingAttribute = ref("none");
    const scalingRate = ref(0.1); // 10% by default

    // Computed properties
    const filteredAbilities = computed(() => {
      let filtered = abilities.value;

      // Apply type filter
      const isFilteringByType = currentFilter.value !== "all";
      const isPresetsFilter = currentFilter.value === "presets";
      if (isFilteringByType) {
        if (isPresetsFilter) {
          filtered = filtered.filter((a) => a.isPreset);
        } else {
          filtered = filtered.filter((a) => a.type === currentFilter.value);
        }
      }

      // Apply class filter for in-game abilities
      const isFilteringInGameByClass =
        currentFilter.value === "in-game" && classFilter.value !== "all";
      if (isFilteringInGameByClass) {
        filtered = filtered.filter((a) => {
          const requiredClasses = a.characterRequirement?.class;
          if (requiredClasses) {
            return Object.keys(requiredClasses).includes(
              classFilter.value
            );
          }
          return false;
        });
      }

      return filtered;
    });

    const prerequisites = computed(() => {
      const editingId = editingAbility.value.id;
      if (editingId) {
        // Don't show current ability in prerequisites to avoid circular references
        return abilities.value.filter((a) => a.id !== editingId);
      }
      return abilities.value;
    });

    // Preset abilities references
    const timeMagePresets: Ability[] = TIME_MAGE_PRESETS;
    const techMagePresets: Ability[] = TECH_MAGE_PRESETS;
    const realLifePresets: Ability[] = REAL_LIFE_PRESETS;
    const hybridPresets: Ability[] = [];

    // Methods
    const toggleViewMode = () => {
      viewMode.value = viewMode.value === "list" ? "grid" : "list";
    };

    const filterAbilities = () => {
      // Reset class filter when switching tabs
      const isInGameFilter = currentFilter.value === "in-game";
      if (!isInGameFilter) {
        classFilter.value = "all";
      }
    };

    const filterByClass = () => {
      // This function is triggered when the class filter changes
      // The actual filtering is handled by the computed properties
    };

    const navigateToEditAbility = (ability: Ability) => {
      router.push(
        `/game-master/compendium/abilities/create-update/${ability.id}`
      );
    };

    const navigateToCreateAbility = () => {
      router.push("/game-master/compendium/abilities/create-update");
    };

    const openAbilityModal = (ability: Ability | null = null) => {
      if (ability) {
        editingAbility.value = { ...ability };

        // Set form field refs
        apCost.value = ability.apRequirement.amount;

        // Set class requirement fields
        const requiredClasses = ability.characterRequirement?.class;
        if (requiredClasses) {
          const className = Object.keys(requiredClasses)[0];
          if (className) {
            selectedClass.value = className;
            selectedClassLevel.value =
              requiredClasses[className];
          } else {
            selectedClass.value = "none";
          }
        } else {
          selectedClass.value = "none";
        }

        // Set character level requirement
        characterLevelRequired.value = ability.characterRequirement?.level
          ? ability.characterRequirement.level.toString()
          : "none";

        // Set scaling fields
        const scaling = ability.scaling;
        if (scaling) {
          scalingAttribute.value = scaling.attribute;
          scalingRate.value = scaling.rate;
        } else {
          scalingAttribute.value = "none";
          scalingRate.value = 0.1;
        }
      } else {
        // Create new ability with defaults
        const newAbility = {
          id: "",
          name: "",
          description: "",
          type: AbilityType.RealLife,
          frequency: TimePeriod.Daily,
          mpCost: 0,
          apRequirement: {
            amount: 0,
            period: TimePeriod.Daily,
          },
          prerequisites: [],
          icon: "colorWandOutline",
          isPreset: false,
          position: {
            x: Math.floor(Math.random() * 800),
            y: Math.floor(Math.random() * 600),
          },
        };

        editingAbility.value = newAbility as Ability;
        apCost.value = 0;
        selectedClass.value = "none";
        selectedClassLevel.value = 1;
        characterLevelRequired.value = "none";
        scalingAttribute.value = "none";
        scalingRate.value = 0.1;
      }
      showAbilityModal.value = true;
    };

    const closeAbilityModal = () => {
      showAbilityModal.value = false;
      // Initialize with a valid default structure to prevent undefined errors
      editingAbility.value = {
        apRequirement: { amount: 0, period: TimePeriod.Daily },
      } as Ability;
    };

    const openPresetModal = () => {
      showPresetModal.value = true;
    };

    const closePresetModal = () => {
      showPresetModal.value = false;
    };

    // Icon picker methods
    const openIconPicker = () => {
      showIconPicker.value = true;
    };

    const closeIconPicker = () => {
      showIconPicker.value = false;
    };

    const selectIcon = ({ iconName, iconPrefix }) => {
      editingAbility.value.icon = iconName;
      editingAbility.value.iconPrefix = iconPrefix;
      closeIconPicker();
    };

    const getIconClass = (iconName: string) => {
      // If the ability has a specific iconPrefix, use it, otherwise default to solid
      const prefix = editingAbility.value.iconPrefix || "fas";
      return `${prefix} fa-${iconName}`;
    };

    const editAbility = (ability: Ability) => {
      openAbilityModal(ability);
    };

    const updateClassRequirement = () => {
      const isNoClass = selectedClass.value === "none";
      if (isNoClass) {
        const requirement = editingAbility.value.characterRequirement;
        if (requirement) {
          delete requirement.class;

          // If no character requirements left, remove the whole object
          const requiredLevel = requirement.level;
          if (!requiredLevel) {
            delete editingAbility.value.characterRequirement;
          }
        }
      } else {
        editingAbility.value.characterRequirement ??= {};

        editingAbility.value.characterRequirement.class = {
          [selectedClass.value]: selectedClassLevel.value,
        };
      }
    };

    const updateCharacterLevelRequirement = () => {
      const isNoLevel = characterLevelRequired.value === "none";
      if (isNoLevel) {
        const requirement = editingAbility.value.characterRequirement;
        if (requirement) {
          delete requirement.level;

          // If no character requirements left, remove the whole object
          const requiredClasses = requirement.class;
          if (!requiredClasses) {
            delete editingAbility.value.characterRequirement;
          }
        }
      } else {
        editingAbility.value.characterRequirement ??= {};

        editingAbility.value.characterRequirement.level = parseInt(
          characterLevelRequired.value
        );
      }
    };

    const updateScalingAttribute = () => {
      const isUnscaled = scalingAttribute.value === "none";
      if (isUnscaled) {
        delete editingAbility.value.scaling;
      } else {
        editingAbility.value.scaling = {
          attribute: scalingAttribute.value,
          rate: scalingRate.value,
        };
      }
    };

    const updateScalingRate = (event: any) => {
      scalingRate.value = event.detail.value / 100;

      const scaling = editingAbility.value.scaling;
      if (scaling) {
        scaling.rate = scalingRate.value;
      }
    };

    const saveAbility = () => {
      const abilityToSave = { ...editingAbility.value };

      // Update AP amount from apCost ref
      abilityToSave.apRequirement.amount = apCost.value;

      const isNewAbility = !abilityToSave.id;
      if (isNewAbility) {
        // New ability
        abilityToSave.id = uuidv4();

        // Save to DB
        abilitiesDb.setAbility(abilityToSave);
        abilities.value.push(abilityToSave);
      } else {
        // Update existing ability
        abilitiesDb.setAbility(abilityToSave);

        // Update in local array
        const index = abilities.value.findIndex(
          (a) => a.id === abilityToSave.id
        );
        const isFound = index !== -1;
        if (isFound) {
          abilities.value[index] = abilityToSave;
        }
      }

      closeAbilityModal();
    };

    const addPreset = async (preset: Ability) => {
      // Check if preset already exists
      const existingPreset = abilities.value.find((a) => a.id === preset.id);

      if (existingPreset) {
        // Unticking an added preset deletes that Power, the same way its own Delete does (shelves and prerequisites too)
        const isDeleted = await confirmDelete({
          kind: "Power",
          name: existingPreset.name,
          usage: () => usageOfPower(existingPreset.id),
          detaching: "Deleting it takes the Power off them first.",
          run: () => deletePower(existingPreset),
        });
        if (isDeleted) abilities.value = abilities.value.filter((a) => a.id !== preset.id);
      } else {
        // Add preset
        const presetToAdd = { ...preset };
        abilitiesDb.setAbility(presetToAdd);
        abilities.value.push(presetToAdd);
      }
    };

    const isPresetAdded = (presetId: string) => {
      return abilities.value.some((a) => a.id === presetId);
    };

    // The preset catalogue by group, as the preset modal and the Presets segment list it
    const presetGroups = [
      { key: "time-mage", label: "Time Mage Abilities", presets: timeMagePresets },
      { key: "technician", label: "Technician Abilities", presets: techMagePresets },
      { key: "real-life", label: "Real Life Rewards", presets: realLifePresets },
      { key: "hybrid", label: "Multi-Class Abilities", presets: hybridPresets },
    ].filter((group) => group.presets.length > 0);
    const allPresets = presetGroups.flatMap((group) => group.presets);

    // What is still on offer: the catalogue minus the presets already in the Compendium
    const unaddedPresetGroups = computed(() =>
      presetGroups
        .map((group) => ({
          ...group,
          presets: group.presets.filter((preset) => !isPresetAdded(preset.id)),
        }))
        .filter((group) => group.presets.length > 0)
    );

    // Names of the prerequisite presets this one still waits on, so a GM sees why it will show Locked
    const presetNeeds = (preset: Ability): string[] =>
      (preset.prerequisites ?? [])
        .filter((id) => !isPresetAdded(id))
        .map((id) => allPresets.find((p) => p.id === id)?.name ?? id);

    // One tap on the catalogue adds the preset (the modal's checkbox list toggles, so it stays the way to remove one)
    const addPresetFromCatalogue = async (preset: Ability) => {
      if (isPresetAdded(preset.id)) return;
      addPreset(preset);
      play$fx("select");
      const toast = await toastController.create({
        message: `${preset.name} added to the Compendium`,
        duration: 1500,
        position: "top",
        cssClass: "rpg-toast",
      });
      await toast.present();
    };

    // Preview as: the Powers are judged for one real hero, never an invented one
    const heroes = computed(() =>
      userStore.usersAz.filter((hero: any) => hero.isAdult !== true)
    );
    const previewHeroId = ref("");
    const previewHero = computed(
      () =>
        heroes.value.find((hero: any) => String(hero.id) === previewHeroId.value) ??
        heroes.value[0] ??
        null
    );
    const hasPreviewHero = computed(() => previewHero.value !== null);
    const heroName = (hero: any): string =>
      hero?.name?.nick || hero?.name?.first || String(hero?.id);
    const selectPreviewHero = (hero: any) => {
      previewHeroId.value = String(hero.id);
      play$fx("cursor");
    };

    // The previewed hero's own newest cast per Power (the Cast Log), so the cooldown is theirs and not the family's
    const previewCasts = ref<Record<string, string>>({});
    watch(
      previewHero,
      async (hero: any) => {
        if (!hero) {
          previewCasts.value = {};
          return;
        }
        const heroId = String(hero.id);
        const casts = lastCastsOf(await getCastLogDb().getForHero(heroId));
        // A slow load for a hero the GM already tapped away from must not overwrite the current one
        const isStillPreviewed = String(previewHero.value?.id) === heroId;
        if (isStillPreviewed) previewCasts.value = casts;
      },
      { immediate: true }
    );

    // Judged against every ability, not only the filtered ones, so prerequisites resolve
    const heroStatuses = computed(() =>
      previewHero.value
        ? computeHeroAbilityStatuses(abilities.value, previewHero.value, [], new Date(), previewCasts.value)
        : { statuses: {}, unlocks: {} }
    );
    const abilityStatuses = computed(() => heroStatuses.value.statuses);
    const unlockStatuses = computed(() => heroStatuses.value.unlocks);
    const previewSnapshot = computed(() =>
      previewHero.value ? heroAbilitySnapshot(previewHero.value) : null
    );

    // Empty-state copy: names the real control (the spellbook button opens Create New Ability / Add from Presets)
    const FILTER_LABELS: { [filter: string]: string } = {
      "real-life": "Real Life",
      "in-game": "Game",
    };
    const emptyTitle = computed(() => {
      const isPresetsFilter = currentFilter.value === "presets";
      if (isPresetsFilter) return "No Presets Added Yet";
      const hasNoAbilities = abilities.value.length === 0;
      if (hasNoAbilities) return "No Abilities Created Yet";
      return `No ${FILTER_LABELS[currentFilter.value] ?? ""} Abilities Here Yet`;
    });
    const emptyHint = computed(() =>
      currentFilter.value === "presets"
        ? "Presets are ready-made abilities. Pick the ones you want from the list below, one tap each."
        : "Abilities are special skills or privileges for your heroes. Tap the spellbook button below to write your own with Create New Ability, or choose Add from Presets: ready-made abilities are one tap away."
    );

    const getAbilityIcon = (ability: Ability) => {
      // If the ability has iconPrefix, it's a Font Awesome icon, so we should display it differently
      const iconPrefix = ability.iconPrefix;
      if (iconPrefix) {
        return {
          component: "i",
          class: `${ability.iconPrefix} fa-${ability.icon} fa-lg`,
        };
      }

      // Otherwise use the old ionic icon mapping
      const iconMap: any = {
        colorWandOutline,
        timeOutline: colorWandOutline,
        flameOutline: colorWandOutline,
        waterOutline: colorWandOutline,
        flashOutline: colorWandOutline,
        medkitOutline: colorWandOutline,
        shieldOutline: colorWandOutline,
        homeOutline,
        tvOutline: homeOutline,
        gameControllerOutline,
        peopleOutline: homeOutline,
      };

      return iconMap[ability.icon] || colorWandOutline;
    };

    const formatClassName = (className: string): string => {
      return className
        .replace("-", " ")
        .replace(/\b\w/g, (l) => l.toUpperCase());
    };

    const formatFrequency = (frequency: TimePeriod): string => {
      switch (frequency) {
        case TimePeriod.Hourly:
          return "Hourly";
        case TimePeriod.Daily:
          return "Daily";
        case TimePeriod.Weekly:
          return "Weekly";
        case TimePeriod.Monthly:
          return "Monthly";
        case TimePeriod.Quarterly:
          return "Quarterly";
        case TimePeriod.BiAnnual:
          return "Bi-Annual";
        case TimePeriod.Yearly:
          return "Yearly";
        case TimePeriod.Flat:
        default:
          return "One-time";
      }
    };

    const formatPeriod = (period: TimePeriod): string => {
      const isFlat = period === TimePeriod.Flat;
      if (isFlat) {
        return "Total (one-time)";
      }
      return formatFrequency(period);
    };

    // Initialize
    onMounted(async () => {
      isLoading.value = true;
      try {
        abilities.value = await abilitiesDb.getAbilities();
        // App.ts loads the heroes at start-up; this only covers a page opened before that finished
        const noHeroesLoaded = Object.keys(userStore.users).length === 0;
        if (noHeroesLoaded) await userStore.loadUsers();
      } catch (error) {
        debug.error("Powers: could not load abilities or heroes", error);
      } finally {
        isLoading.value = false;
      }
    });

    // Ionic keeps this page alive under the Power wizard, so a Power saved there is read in again when the list comes
    // back into view (the first visit is already loaded by onMounted)
    let hasEnteredOnce = false;
    onIonViewWillEnter(async () => {
      if (!hasEnteredOnce) {
        hasEnteredOnce = true;
        return;
      }
      try {
        abilities.value = await abilitiesDb.getAbilities();
      } catch (error) {
        debug.error("Powers: could not read the abilities again", error);
      }
    });

    // Action sheet handler
    const presentActionSheet = async () => {
      const actionSheet = await actionSheetController.create({
        header: "Ability Actions",
        cssClass: "abilities-action-sheet",
        mode: "ios",
        buttons: [
          {
            text: "Create New Ability",
            cssClass: "action-create",
            handler: () => {
              navigateToCreateAbility();
            },
          },
          {
            text: "Add from Presets",
            cssClass: "action-preset",
            handler: () => {
              openPresetModal();
            },
          },
          {
            text: "Cancel",
            role: "cancel",
            cssClass: "action-cancel",
            handler: () => {
              // Just close the action sheet
            },
          },
        ],
      });
      await actionSheet.present();
    };

    return {
      abilities,
      filteredAbilities,
      heroes,
      previewHero,
      hasPreviewHero,
      previewSnapshot,
      heroName,
      selectPreviewHero,
      presetGroups,
      unaddedPresetGroups,
      presetNeeds,
      addPresetFromCatalogue,
      emptyTitle,
      emptyHint,
      showAbilityModal,
      showPresetModal,
      showIconPicker,
      editingAbility,
      viewMode,
      currentFilter,
      classFilter,
      abilityStatuses,
      unlockStatuses,
      prerequisites,
      apCost,
      selectedClass,
      selectedClassLevel,
      characterLevelRequired,
      scalingAttribute,
      scalingRate,

      // Presets
      timeMagePresets,
      techMagePresets,
      realLifePresets,
      hybridPresets,

      // Methods
      toggleViewMode,
      filterAbilities,
      filterByClass,
      openAbilityModal,
      closeAbilityModal,
      openPresetModal,
      closePresetModal,
      // Icon picker methods
      openIconPicker,
      closeIconPicker,
      selectIcon,
      getIconClass,
      editAbility,
      updateClassRequirement,
      updateCharacterLevelRequirement,
      updateScalingAttribute,
      updateScalingRate,
      saveAbility,
      addPreset,
      isPresetAdded,
      getAbilityIcon,
      formatClassName,
      formatFrequency,
      formatPeriod,
      presentActionSheet,
      isLoading,

      // Constants
      AbilityType,
      TimePeriod,
      ABILITY_CLASSES,

      // Icons
      add,
      listOutline,
      gridOutline,
      albumsOutline,
      homeOutline,
      gameControllerOutline,
      starOutline,
      closeOutline,
      colorWandOutline,

      selectedIconName,
      navigateToEditAbility,
      navigateToCreateAbility,
    };
  },
});

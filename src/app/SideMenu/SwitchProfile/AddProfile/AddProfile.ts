import { computed, ref, watch, defineComponent, onMounted, onUnmounted } from "vue";
import { play$fx } from "@/assets/fx";
import { modalController, toastController } from "@ionic/vue";
import { useRoute } from "vue-router";
import { useAudioStore } from "@/lib/store/stores/audio";
import { useGameStore } from "@/lib/store/stores/game";
import { useUserStore } from "@/lib/store/stores/user";
import { changeBGM } from "@/lib/engine/audio/routeMusic";
import { handleBgmGuard } from "@/router/_Guards/bgm.guard";
import { canSetGameMaster, needsGameMasterPasscode, passcodeProblem } from "@/router/_Guards/gm.guard";
import { FOOD_OPTIONS, JOB_CLASS_OPTIONS } from "@/constants";

import { ProfileDb } from "@/lib/databases";
import type { NewProfileForm } from "@/lib/databases/ProfileDb";
import { profileStorage } from "@/lib/databases/profileStorage";
import { heroAvatarImage, heroAvatarSrc } from "@/lib/hero-look/look";
import { isHeroLook, type HeroLook } from "@/lib/hero-look/types";
import InputSettings from "../../XpSettings/components/InputSettings.vue";

import {
  NEW_HERO_STEPS,
  firstBlockedStep,
  stepIndex,
  stepProblem,
  stepProgress,
  type NewHeroStepId,
} from "@/lib/services/profile/newHeroSteps";

import { EDIT_TABS, FEATURE_OPTIONS, ROLE_CHOICES } from "./formOptions";
import { useHeroStyleChoice } from "./useHeroStyleChoice";
import type { ChoiceCard, FeatureKey } from "./formOptions";
import ionic from "@/lib/mixins/ionic";

import XpHeroFanfare from "@/components/organisms/HeroFanfare/XpHeroFanfare.vue";
import GamerCard from "./GamerCard.vue"
import HeroStylePicker from "./HeroStylePicker.vue"
import Stats from "@/lib/utils/User/stats";
import { profileToSave } from "@/lib/utils/User/user";
import debug from "@/lib/utils/debug";

export const AddProfile = defineComponent({
  // presetGameMaster (new profiles only): true starts the Game Master toggle on ("Add Adult"),
  // false starts it off ("Add Kid"), undefined keeps the default.
  props: ["id", "profile", "presetGameMaster", "startTab"],
  mixins: [ionic],
  components: {
    InputSettings,
    XpHeroFanfare,
    GamerCard,
    HeroStylePicker
  },
  methods: {
    async loadProfile() {
      this.storage.get(this.$props.id).then(this.setProfile);
    },
    async clickSaveProfile() {
      // A Game Master's profile is only saved by a Game Master (Save is disabled otherwise)
      const isGameMasterEditLocked = this.gameMasterEditLocked;
      if (isGameMasterEditLocked) return;

      // Validate before saving: a Game Master needs a 4-digit passcode, so send them to the Pin tab
      const passcodeError = this.passcodeError;
      if (passcodeError) {
        if (this.isEditing) this.activeSegment = "account";
        else this.step = "secret";
        const toast = await toastController.create({
          message: passcodeError,
          duration: 2500,
          position: "top",
          color: "warning",
        });
        await toast.present();
        return;
      }

      // An edit lays the form's fields over the stored hero, so equipment, inventory, quest effects
      // and the rest survive; a new hero is built from the form (see profileToSave)
      const profile = await profileToSave(this.storage, this.newProfile, this.$props.profile);
      await this.storage.setProfile(profile as NewProfileForm);

      // An edit has nothing to announce: back to the family
      if (this.isEditing) {
        this.play$fx('yes');
        modalController.dismiss({ profileAdded: true });
        return;
      }

      // A new hero joins the party: the reveal plays the stinger and its song, and hands back on its button
      this.showFanfare = true;
    },
    // The reveal's big moment: the song for a new adventure starts under its stinger
    playAdventureSong() {
      const rpgTheme = this.gameStore.theme?.rpg || 'earthbound';
      const BGM = this.audioStore.bgm?.$fx?.rpg?.[rpgTheme]?.BGM;
      const hasNowLetsGoTrack = BGM && BGM.nowLetsGo;
      if (hasNowLetsGoTrack) {
        changeBGM(this.audioStore, {
          tracks: BGM.nowLetsGo,
          track: 0,
          startDelay: 0,
          repeat: false,
          saveBookmark: false
        });
      }
    },
    // "Begin your adventure": the modal closes and the list of heroes reloads
    finishFanfare() {
      this.showFanfare = false;
      modalController.dismiss({ profileAdded: true });
    }
  },

  mounted() {
    const { id, profile } = this.$props;
    if (id) this.loadProfile();
    if (profile) this.setProfile(profile);
  },
  setup(props) {
    const requireAvatar = require.context(
      "@/assets/images/avatars",
      false,
      /\.svg$/
    );

    const storage = new ProfileDb(profileStorage);
    const userStore = useUserStore();
    const email = ref("");
    const passcode = ref("");
    // What the Game Master toggle is set to. Off unless someone turns it on, except for the first
    // profile on a device and the "Add Adult" preset. Read isGameMaster for what the form really holds.
    const isAdult = ref(false);
    // Set once the person touches the toggle (or a preset picks a side), so the first-profile
    // default never overrides the choice
    const gameMasterChosen = ref(false);
    // The profile being edited already is a Game Master
    const wasGameMaster = ref(false);
    // The profile being edited is a Game Master saved without a usable PIN (from before the rule)
    const legacyGameMaster = ref(false);
    // True once the device's profiles are known; until then the toggle stays locked, so a slow
    // load can never leave it open by accident
    const profilesLoaded = ref(false);
    // Only a Game Master may switch the flag (anybody may while the device has no Game Master yet)
    const canSetFlag = computed(() => profilesLoaded.value && canSetGameMaster(userStore));
    // What the form really holds. Without permission the flag stays as the profile already had it
    // (off for a new profile), whatever the toggle says, so a preset cannot be a back door.
    const isGameMaster = computed(() => (canSetFlag.value ? isAdult.value : wasGameMaster.value));
    // A Game Master's profile, and above all its PIN, is only editable by a Game Master
    // (unless it is a legacy Game Master with no 4-digit PIN, which has nothing to protect and must be fixed)
    const gameMasterEditLocked = computed(
      () => wasGameMaster.value && !canSetFlag.value && !legacyGameMaster.value
    );
    // Why the passcode cannot be saved yet, or null: a Game Master must have a 4-digit PIN
    const passcodeError = computed(() => passcodeProblem(passcode.value, isGameMaster.value));
    // "Add Adult" / "Add Kid" pick the toggle's starting side for a new profile (isGameMaster still
    // holds it off when the person has no say). Applied once, before the first render.
    const isEditingProfile = () => Boolean(props.id || props.profile);
    // An existing hero is being edited, not made (the props never change while the form is open)
    const isEditing = isEditingProfile();
    const applyPresetGameMaster = () => {
      const hasNoPresetToApply = isEditingProfile() || typeof props.presetGameMaster !== "boolean";
      if (hasNoPresetToApply) return;
      isAdult.value = props.presetGameMaster;
      gameMasterChosen.value = true;
    };
    applyPresetGameMaster();
    const avatarIndex = ref(1);
    const fullName = ref("");
    const favoriteFood = ref("");
    const favoriteThing = ref("");
    const foodOptions = ref(FOOD_OPTIONS);
    const jobClass = ref("");
    // Retro or Modern, game style and menu sounds: the hero's own look and feel (services/profile/heroSkin.ts, heroTheme.ts)
    const { styleChoice, styleSummary, setStyleChoice, loadStyleFrom } = useHeroStyleChoice();
    // The 3D hero built in the look builder (GamerCard), and the picture of its face; none until they build one
    const look = ref<HeroLook | undefined>(undefined);
    const avatarImage = ref<string | undefined>(undefined);
    // What an existing hero holds: it lends the 3D hero its hands in the look builder
    const equipment = ref<Record<string, unknown> | undefined>(undefined);
    const gamerCard = ref<{ openAvatarPicker: () => void } | null>(null);
    // The new-hero reveal is playing
    const showFanfare = ref(false);

    const paddedIndex = computed(() =>
      avatarIndex.value.toString().padStart(3, "0")
    );

    // The face shown on the avatar row: the 3D hero's picture when there is one, else the preset portrait
    const currentAvatar = computed(
      () =>
        heroAvatarSrc(
          { avatar: `${paddedIndex.value}-gamer`, avatarImage: avatarImage.value },
          (key: string) => requireAvatar(key)
        ) || undefined
    );

    const closeModal = () => {
      modalController.dismiss();
    };

    const setProfile = (profile) => {
      const name = profile.name;
      if (!name) return;
      passcode.value = profile.passcode || '';
      email.value = profile.email;
      fullName.value = profile.name.full;
      favoriteThing.value = profile.favoriteThing;
      favoriteFood.value = profile.favoriteFood;
      jobClass.value = profile.jobClass;
      loadStyleFrom(profile);
      isAdult.value = profile.isAdult === true;
      wasGameMaster.value = profile.isAdult === true;
      legacyGameMaster.value = needsGameMasterPasscode(profile);
      avatarIndex.value = parseInt(profile.avatar.split("-")[0]);
      look.value = isHeroLook(profile.look) ? { ...profile.look } : undefined;
      avatarImage.value = heroAvatarImage(profile) || undefined;
      equipment.value = profile.equipment || undefined;
    };

    const setGameMaster = (event: CustomEvent<{ checked: boolean }>) => {
      // Backstop: the toggle is disabled for anyone without a say, but never trust the UI alone
      if (!canSetFlag.value) return;
      gameMasterChosen.value = true;
      isAdult.value = event.detail.checked === true;
    };

    // The toggle unlocks only once the device's profiles are known (the store may not have
    // caught up yet), the same load the Game Master route guard does before it decides.
    const loadProfilesForGameMasterCheck = async () => {
      try {
        const hasNoProfilesLoaded = Object.keys(userStore.users).length === 0;
        if (hasNoProfilesLoaded) await userStore.loadUsers();
        profilesLoaded.value = true;
      } catch (error) {
        // Could not tell who is a Game Master, so the toggle stays locked
        debug.error("Could not load the profiles to check Game Master access", error);
      }
    };

    // There must be a parent: the first profile created on a device starts as a Game Master.
    // Anyone else, and anyone being edited, is left exactly as they are.
    const defaultFirstProfileToGameMaster = async () => {
      if (isEditingProfile()) return;
      try {
        const profiles = await storage.getProfiles();
        const isFirstProfileUnchosen = profiles.length === 0 && !gameMasterChosen.value;
        if (isFirstProfileUnchosen) isAdult.value = true;
      } catch (error) {
        // Could not tell, so stay off: a kid must never become a Game Master by accident
        debug.error("Could not check for existing profiles", error);
      }
    };

    const activeSegment = ref(props.startTab === "account" ? "account" : "info")

    // --- New hero wizard (a hero being edited keeps the tabs) ---
    const step = ref<NewHeroStepId>("name");
    const stepsBack = ref(false);
    const showAdvanced = ref(false);
    const heroDraft = computed(() => ({
      fullName: fullName.value,
      jobClass: jobClass.value,
      favoriteFood: favoriteFood.value,
      passcode: passcode.value,
      isGameMaster: isGameMaster.value,
    }));
    const currentStepIndex = computed(() => stepIndex(step.value));
    const currentStepInfo = computed(() => NEW_HERO_STEPS[currentStepIndex.value]);
    const progressPercent = computed(() => Math.round(stepProgress(step.value) * 100));
    const currentStepProblem = computed(() => stepProblem(step.value, heroDraft.value));
    const isLastStep = computed(() => currentStepIndex.value === NEW_HERO_STEPS.length - 1);
    const hasFace = computed(() => Boolean(look.value || avatarImage.value || avatarIndex.value !== 1));
    const classCards: ChoiceCard[] = JOB_CLASS_OPTIONS.filter((job) => !job.tier || job.tier === 1).map((job) => ({
      key: job.name,
      label: job.name,
      icon: job.icon,
      hint: job.creed,
    }));
    const foodCards: ChoiceCard[] = FOOD_OPTIONS.map((food) => ({ key: food.value, label: food.value, icon: food.icon }));
    const selectedJob = computed(() => JOB_CLASS_OPTIONS.find((job) => job.name === jobClass.value));
    const selectedFood = computed(() => FOOD_OPTIONS.find((food) => food.value === favoriteFood.value));

    const goToStep = (id: NewHeroStepId) => {
      stepsBack.value = stepIndex(id) < currentStepIndex.value;
      step.value = id;
    };
    const goNext = async () => {
      const problem = currentStepProblem.value;
      if (problem) {
        play$fx("no");
        const toast = await toastController.create({
          message: problem,
          duration: 1800,
          position: "top",
          color: "warning",
        });
        await toast.present();
        return;
      }
      play$fx("select");
      goToStep(NEW_HERO_STEPS[Math.min(currentStepIndex.value + 1, NEW_HERO_STEPS.length - 1)].id);
    };
    const goBack = () => {
      const isFirstStep = currentStepIndex.value === 0;
      if (isFirstStep) return;
      play$fx("cursor");
      goToStep(NEW_HERO_STEPS[currentStepIndex.value - 1].id);
    };
    // A tapped choice plays its sound; the hero moves on with Next
    const pickClass = (name: string) => {
      play$fx("select");
      jobClass.value = name;
    };
    const pickFood = (value: string) => {
      play$fx("select");
      favoriteFood.value = value;
    };
    // The class and food steps are one grid of cards: each step says which cards, which is chosen, and what a tap does
    const choiceCardsByStep: Partial<Record<NewHeroStepId, ChoiceCard[]>> = { class: classCards, food: foodCards };
    const choicePickers: Partial<Record<NewHeroStepId, (key: string) => void>> = { class: pickClass, food: pickFood };
    const choiceCards = computed(() => choiceCardsByStep[step.value] ?? []);
    const isChoiceStep = computed(() => choiceCards.value.length > 0);
    const chosenByStep = computed<Partial<Record<NewHeroStepId, string>>>(() => ({
      class: jobClass.value,
      food: favoriteFood.value,
    }));
    const chosenKey = computed(() => chosenByStep.value[step.value]);
    const pickChoice = (key: string) => choicePickers[step.value]?.(key);
    const chooseRole = (gameMaster: boolean) => {
      if (!canSetFlag.value) return;
      play$fx("cursor");
      gameMasterChosen.value = true;
      isAdult.value = gameMaster;
    };

    // Play sound when switching tabs
    watch(activeSegment, () => {
      play$fx('okdesuka');
    });

    const features = ref({
      rewards: true,
      goals: true,
      battles: true,
      community: true
    })

    const toggleFeature = (key: FeatureKey) => {
      features.value[key] = !features.value[key];
    };


    const hidePasscode = ref(true)
    const passcodeType = computed(() => hidePasscode.value ? "password" : "text")


    const newProfile = computed(() => ({
      id: props?.id || props.profile?.id || "",
      email: email.value,
      passcode: passcode.value,
      name: { full: fullName.value },
      avatar: `${paddedIndex.value}-gamer`,
      look: look.value,
      avatarImage: avatarImage.value,
      favoriteThing: favoriteThing.value,
      favoriteFood: favoriteFood.value,
      jobClass: jobClass.value,
      skin: styleChoice.value.skin,
      themeChoice: { rpg: styleChoice.value.rpg, ui: styleChoice.value.ui },
      isAdult: isGameMaster.value,
      stats: props.profile?.stats || new Stats(),
    }))

    const hasMissingRequiredField = computed(
      () => !favoriteFood.value || !favoriteThing.value || !jobClass.value || !fullName.value
    );
    const isSaveDisabled = computed(() => hasMissingRequiredField.value || gameMasterEditLocked.value);
    // The wizard's last button: never save past a step that still has a problem
    const beginAdventure = () => {
      const blocked = firstBlockedStep(heroDraft.value);
      if (blocked) {
        play$fx("no");
        goToStep(blocked);
        return false;
      }
      return true;
    };

    const audioStore = useAudioStore();
    const gameStore = useGameStore();
    const route = useRoute();

    onMounted(() => {
      loadProfilesForGameMasterCheck();
      // If creating a new profile (no id or profile prop)
      if (!isEditingProfile()) {
        defaultFirstProfileToGameMaster();
        const rpgTheme = gameStore.theme?.rpg || 'earthbound';
        const BGM = audioStore.bgm?.$fx?.rpg?.[rpgTheme]?.BGM;
        const hasCreateProfileTrack = BGM && BGM.createProfile;
        if (hasCreateProfileTrack) {
          debug.log('Playing createProfile music');
          changeBGM(audioStore, {
            tracks: BGM.createProfile,
            track: 0,
            startDelay: 0,
            repeat: true,
            saveBookmark: true
          });
        }
      }
    });

    onUnmounted(() => {
      // Restore previous music based on current route
      debug.log('Restoring music from route:', route.name);
      handleBgmGuard(route);
    });

    return {
      // profile,
      newProfile,
      passcode,
      activeSegment,
      step,
      stepsBack,
      showAdvanced,
      steps: NEW_HERO_STEPS,
      currentStepIndex,
      currentStepInfo,
      progressPercent,
      currentStepProblem,
      isLastStep,
      hasFace,
      choiceCards,
      isChoiceStep,
      chosenKey,
      pickChoice,
      roles: ROLE_CHOICES,
      editTabs: EDIT_TABS,
      featureOptions: FEATURE_OPTIONS,
      selectedJob,
      selectedFood,
      styleChoice,
      styleSummary,
      setStyleChoice,
      goToStep,
      goNext,
      goBack,
      chooseRole,
      beginAdventure,
      avatarIndex,
      look,
      avatarImage,
      equipment,
      gamerCard,
      closeModal,
      currentAvatar,
      email,
      favoriteFood,
      favoriteThing,
      features,
      foodOptions,
      fullName,
      hidePasscode,
      isGameMaster,
      canSetFlag,
      profilesLoaded,
      gameMasterEditLocked,
      isSaveDisabled,
      passcodeError,
      jobClass,
      passcodeType,
      setGameMaster,
      setProfile,
      storage,
      toggleFeature,
      showFanfare,
      isEditing,
      requireAvatar,
      audioStore,
      gameStore
    };
  },
});

export default AddProfile;


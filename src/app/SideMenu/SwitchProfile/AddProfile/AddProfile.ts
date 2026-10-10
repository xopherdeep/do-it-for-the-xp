import { computed, ref, watch, defineComponent, onMounted, onUnmounted } from "vue";
import { play$fx } from "@/assets/fx";
import { modalController, toastController } from "@ionic/vue";
import { useRoute } from "vue-router";
import { arrowBack, arrowForward, closeOutline } from "ionicons/icons";
import { useAudioStore } from "@/lib/store/stores/audio";
import { useGameStore } from "@/lib/store/stores/game";
import { useUserStore } from "@/lib/store/stores/user";
import { changeBGM } from "@/lib/engine/audio/routeMusic";
import { handleBgmGuard } from "@/router/_Guards/bgm.guard";
import { canSetGameMaster, needsGameMasterPasscode, passcodeProblem } from "@/router/_Guards/gm.guard";
import { FOOD_OPTIONS, JOB_CLASS_OPTIONS } from "@/constants";

import { ProfileDb } from "@/lib/databases";
import { profileStorage } from "@/lib/databases/profileStorage";
import InputSettings from "../../XpSettings/components/InputSettings.vue";
import AvatarSelector from "./components/AvatarSelector.vue";

import ionic from "@/lib/mixins/ionic";

import XpGp from "@/components/atoms/Currency/XpGp.vue";
import GamerCard from "./GamerCard.vue"
import Stats from "@/lib/utils/User/stats";
import debug from "@/lib/utils/debug";

export const AddProfile = defineComponent({
  // presetGameMaster (new profiles only): true starts the Game Master toggle on ("Add Adult"),
  // false starts it off ("Add Kid"), undefined keeps the default.
  props: ["id", "profile", "presetGameMaster", "startTab"],
  mixins: [ionic],
  components: {
    InputSettings,
    XpGp,
    GamerCard,
    AvatarSelector
  },
  methods: {
    async loadProfile() {
      this.storage.get(this.$props.id).then(this.setProfile);
    },
    moveFocus(event: Event, nextInput: string) {
      const target = event.target as HTMLInputElement;
      const el = this.$refs[nextInput] as HTMLInputElement;
      if (target.value.length === 1 && el && typeof el.focus === 'function') {
        el.focus();
      }
    },
    getAvatarSrc(index: number) {
      const paddedIdx = index.toString().padStart(3, "0");
      return this.requireAvatar(`./${paddedIdx}-gamer.svg`);
    },
    selectAvatar(index: number) {
      this.avatarIndex = index;
      this.isAvatarSelectorOpen = false; // Close the modal after selecting
    },
    async clickSaveProfile() {
      // A Game Master's profile is only saved by a Game Master (Save is disabled otherwise)
      if (this.gameMasterEditLocked) return;

      // Validate before saving: a Game Master needs a 4-digit passcode, so send them to the Pin tab
      if (this.passcodeError) {
        this.activeSegment = "account";
        const toast = await toastController.create({
          message: this.passcodeError,
          duration: 2500,
          position: "top",
          color: "warning",
        });
        await toast.present();
        return;
      }

      const profile = this.storage.newProfile(this.newProfile);
      await this.storage.setProfile(profile);

      // Show success splash
      this.showSuccessSplash = true;

      // Play Now, Let's Go! BGM
      const rpgTheme = this.gameStore.theme?.rpg || 'earthbound';
      const BGM = this.audioStore.bgm?.$fx?.rpg?.[rpgTheme]?.BGM;
      if (BGM && BGM.nowLetsGo) {
        changeBGM(this.audioStore, {
          tracks: BGM.nowLetsGo,
          track: 0,
          startDelay: 0,
          repeat: false,
          saveBookmark: false
        });
      }

      // Play fanfare sound using the mixin method
      this.play$fx('levelUp');

      // Hide splash after 3 seconds
      setTimeout(() => {
        this.showSuccessSplash = false;
        modalController.dismiss({ profileAdded: true });
      }, 3000);
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
    const applyPresetGameMaster = () => {
      if (props.id || props.profile || typeof props.presetGameMaster !== "boolean") return;
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
    const jobClassOptions = ref(JOB_CLASS_OPTIONS);
    const maxAvatarIndex = requireAvatar.keys().length;
    const isAvatarSelectorOpen = ref(false);
    const showSuccessSplash = ref(false);

    const paddedIndex = computed(() =>
      avatarIndex.value.toString().padStart(3, "0")
    );

    const currentAvatar = computed(() =>
      requireAvatar(`./${paddedIndex.value}-gamer.svg`)
    );

    const closeModal = () => {
      modalController.dismiss();
    };

    const profileAdded = () => {
      clearForm();
    };

    const clearForm = () => {
      fullName.value = "";
      favoriteThing.value = "";
      favoriteFood.value = "";
      jobClass.value = "";
      avatarIndex.value = 1;
      email.value = "";
      passcode.value = "";
    };

    const previousAvatar = () => {
      if (avatarIndex.value > 1) {
        avatarIndex.value--;
      }
    };

    const nextAvatar = () => {
      if (avatarIndex.value < maxAvatarIndex) {
        avatarIndex.value++;
      }
    };

    const setProfile = (profile) => {
      if (!profile.name) return;
      passcode.value = profile.passcode || '';
      email.value = profile.email;
      fullName.value = profile.name.full;
      favoriteThing.value = profile.favoriteThing;
      favoriteFood.value = profile.favoriteFood;
      jobClass.value = profile.jobClass;
      isAdult.value = profile.isAdult === true;
      wasGameMaster.value = profile.isAdult === true;
      legacyGameMaster.value = needsGameMasterPasscode(profile);
      avatarIndex.value = parseInt(profile.avatar.split("-")[0]);
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
        if (Object.keys(userStore.users).length === 0) await userStore.loadUsers();
        profilesLoaded.value = true;
      } catch (error) {
        // Could not tell who is a Game Master, so the toggle stays locked
        debug.error("Could not load the profiles to check Game Master access", error);
      }
    };

    // There must be a parent: the first profile created on a device starts as a Game Master.
    // Anyone else, and anyone being edited, is left exactly as they are.
    const defaultFirstProfileToGameMaster = async () => {
      if (props.id || props.profile) return;
      try {
        const profiles = await storage.getProfiles();
        if (profiles.length === 0 && !gameMasterChosen.value) isAdult.value = true;
      } catch (error) {
        // Could not tell, so stay off: a kid must never become a Game Master by accident
        debug.error("Could not check for existing profiles", error);
      }
    };

    const activeSegment = ref(props.startTab === "account" ? "account" : "info")

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

    const toggleReward = () => features.value.rewards = !features.value.rewards
    const toggleGoal = () => features.value.goals = !features.value.goals
    const toggleBattles = () => features.value.battles = !features.value.battles
    const toggleCommunity = () => features.value.community = !features.value.community


    const hidePasscode = ref(true)
    const passcodeType = computed(() => hidePasscode.value ? "password" : "text")


    const newProfile = computed(() => ({
      id: props?.id || props.profile?.id || "",
      email: email.value,
      passcode: passcode.value,
      name: { full: fullName.value },
      avatar: `${paddedIndex.value}-gamer`,
      favoriteThing: favoriteThing.value,
      favoriteFood: favoriteFood.value,
      jobClass: jobClass.value,
      isAdult: isGameMaster.value,
      stats: props.profile?.stats || new Stats(),
    }))

    const audioStore = useAudioStore();
    const gameStore = useGameStore();
    const route = useRoute();

    onMounted(() => {
      loadProfilesForGameMasterCheck();
      // If creating a new profile (no id or profile prop)
      if (!props.id && !props.profile) {
        defaultFirstProfileToGameMaster();
        const rpgTheme = gameStore.theme?.rpg || 'earthbound';
        const BGM = audioStore.bgm?.$fx?.rpg?.[rpgTheme]?.BGM;
        if (BGM && BGM.createProfile) {
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
      arrowBack,
      arrowForward,
      closeOutline,
      avatarIndex,
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
      passcodeError,
      jobClass,
      jobClassOptions,
      maxAvatarIndex,
      nextAvatar,
      passcodeType,
      previousAvatar,
      setGameMaster,
      setProfile,
      storage,
      toggleBattles,
      toggleCommunity,
      toggleGoal,
      toggleReward,
      profileAdded,
      isAvatarSelectorOpen,
      showSuccessSplash,
      requireAvatar,
      audioStore,
      gameStore
    };
  },
});

export default AddProfile;


import { computed, ref, defineComponent, onMounted, onUnmounted } from "vue";
import { modalController } from "@ionic/vue";
import { useRoute } from "vue-router";
import { arrowBack, arrowForward, closeOutline } from "ionicons/icons";
import { useAudioStore } from "@/lib/store/stores/audio";
import { useGameStore } from "@/lib/store/stores/game";
import { changeBGM } from "@/lib/engine/audio/routeMusic";
import { handleBgmGuard } from "@/router/_Guards/bgm.guard";
import { FOOD_OPTIONS, JOB_CLASS_OPTIONS } from "@/constants";

import { ProfileDb } from "@/lib/databases";
import { profileStorage } from "../SwitchProfile.vue";
import InputSettings from "../../XpSettings/components/InputSettings.vue";
import AvatarSelector from "./components/AvatarSelector.vue";

import ionic from "@/lib/mixins/ionic";

import XpGp from "@/components/atoms/Currency/XpGp.vue";
import GamerCard from "./GamerCard.vue"
import Stats from "@/lib/utils/User/stats";
import debug from "@/lib/utils/debug";

export const AddProfile = defineComponent({
  props: ["id", "profile", "showIsAdult"],
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
    const email = ref("");
    const passcode = ref("");
    const isAdult = ref(false);
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
      isAdult.value = profile.isAdult;
      avatarIndex.value = parseInt(profile.avatar.split("-")[0]);
    };

    const activeSegment = ref("info")

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
      isAdult: isAdult.value,
      stats: props.profile?.stats || new Stats(),
    }))

    const audioStore = useAudioStore();
    const gameStore = useGameStore();
    const route = useRoute();

    onMounted(() => {
      // If creating a new profile (no id or profile prop)
      if (!props.id && !props.profile) {
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
      isAdult,
      jobClass,
      jobClassOptions,
      maxAvatarIndex,
      nextAvatar,
      passcodeType,
      previousAvatar,
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


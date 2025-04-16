import { computed, ref, defineComponent } from "vue";
import { modalController } from "@ionic/vue";
import { arrowBack, arrowForward, closeOutline } from "ionicons/icons";
import { FOOD_OPTIONS, JOB_CLASS_OPTIONS } from "@/constants";

import { ProfileDb } from "@/databases";
import { profileStorage } from "../SwitchProfile.vue";
import InputSettings from "../../XpSettings/components/InputSettings.vue";
import AvatarSelector from "./components/AvatarSelector.vue";

import ionic from "@/mixins/ionic";

import XpGp from "@/components/XpGp/XpGp.vue";
import GamerCard from "./GamerCard.vue"
import Stats from "@/utils/User/stats";

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
      return this.$requireAvatar(`./${paddedIdx}-gamer.svg`);
    },
    selectAvatar(index: number) {
      this.avatarIndex = index;
      this.isAvatarSelectorOpen = false; // Close the modal after selecting
    },
    handlePasscodeInput(event: Event, position: number) {
      const target = event.target as HTMLInputElement;
      // Move to next input if value is entered
      if (target.value.length === 1 && position < 4) {
        const nextInput = this.$refs[`passcode${position + 1}`] as HTMLInputElement;
        if (nextInput && typeof nextInput.focus === 'function') {
          nextInput.focus();
        }
      }
      // Update the combined passcode
      this.updatePasscode();
    },
    handleKeyDown(event: KeyboardEvent, position: number) {
      // Handle backspace to navigate to previous input
      if (event.key === 'Backspace' && position > 1 && !(event.target as HTMLInputElement).value) {
        const prevInput = this.$refs[`passcode${position - 1}`] as HTMLInputElement;
        if (prevInput && typeof prevInput.focus === 'function') {
          prevInput.focus();
        }
      }
    },
    updatePasscode() {
      // Combine the individual digits into a single passcode
      this.passcode = this.passcodeDigits.join('');
    }
  },

  mounted() {
    const { id, profile } = this.$props;
    if (id) this.loadProfile();
    if (profile) this.setProfile(profile);
  },
  setup(props) {
    const $requireAvatar = require.context(
      "@/assets/images/avatars",
      false,
      /\.svg$/
    );

    const storage = new ProfileDb(profileStorage);
    const email = ref("");
    const passcode = ref("");
    const passcodeDigits = ref(['', '', '', '']);
    const isAdult = ref(false);
    const avatarIndex = ref(1);
    const fullName = ref("");
    const favoriteFood = ref("");
    const favoriteThing = ref("");
    const foodOptions = ref(FOOD_OPTIONS);
    const jobClass = ref("");
    const jobClassOptions = ref(JOB_CLASS_OPTIONS);
    const maxAvatarIndex = $requireAvatar.keys().length;
    const isAvatarSelectorOpen = ref(false);

    const paddedIndex = computed(() =>
      avatarIndex.value.toString().padStart(3, "0")
    );

    const currentAvatar = computed(() =>
      $requireAvatar(`./${paddedIndex.value}-gamer.svg`)
    );

    const clickSaveProfile = () => {
      const profile = storage.newProfile(newProfile.value);
      storage.setProfile(profile).then(profileAdded);
      modalController.dismiss({ profileAdded: true });
    };

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
      passcodeDigits.value = ['', '', '', ''];
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
      passcode.value = profile.passcode;
      email.value = profile.email;
      fullName.value = profile.name.full;
      favoriteThing.value = profile.favoriteThing;
      favoriteFood.value = profile.favoriteFood;
      jobClass.value = profile.jobClass;
      isAdult.value = profile.isAdult;
      avatarIndex.value = parseInt(profile.avatar.split("-")[0]);
      
      // Set passcode digits for the individual inputs
      if (profile.passcode) {
        const digits = profile.passcode.split('');
        passcodeDigits.value = digits.length === 4 ? digits : ['', '', '', ''];
      }
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
      isAdult: isAdult?.value,
      stats: props.profile?.stats || new Stats(),
    }))

    return {
      // profile,
      newProfile,
      passcode,
      passcodeDigits,
      activeSegment,
      arrowBack,
      arrowForward,
      closeOutline,
      avatarIndex,
      clickSaveProfile,
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
      isAvatarSelectorOpen,
    };
  },
});

export default AddProfile;

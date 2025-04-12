import { v4 as uuidv4 } from 'uuid'
import { defineComponent, ref, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { modalController, alertController } from '@ionic/vue';

import { IonModal } from '@ionic/vue';

import AchievementDb, {
  Achievement,
  achievementStorage,
  achievementCategoryStorage,
  AchievementCategoryDb,
  AchievementCategoryInterface
} from "@/databases/AchievementDb"

import ProfileDb from '@/databases/ProfileDb';
import { profileStorage } from '../../../SwitchProfile/SwitchProfile.vue';

import User from '@/utils/User';

import XpAddCategoryModal from "./components/XpAddCategoryModal.vue";

import ionic from '@/mixins/ionic';
import { checkmarkOutline, checkmarkSharp } from 'ionicons/icons';

import XpAchievementItem from './components/XpAchievementItem.vue';
import XpReorderAchievementsModal from './components/XpReorderAchievementsModal.vue';
import { DIFFICULTY_ICONS, ACHIEVEMENT_TYPE_ICONS, BASIC_SCHEDULE_ICONS } from "@/constants"

import BestiaryDb, { Beast, beastStorage } from '@/databases/BestiaryDb';
import EFFORTS from '@/constants/EFFORTS';

export const sortCategoryByName = (a, b) => {
  const nameA = a.name.toLowerCase();
  const nameB = b.name.toLowerCase();
  if (nameA < nameB) {
    return -1;
  }
  if (nameA > nameB) {
    return 1;
  }
  return 0;
}

export default defineComponent({
  name: 'xp-add-achievement',
  mixins: [ionic],
  components: {
    XpAddCategoryModal,
    XpReorderAchievementsModal,
    XpAchievementItem
  },
  data() {
    return {
      fibonacciArray: [1, 2, 3, 5, 8, 13],
      efforts: EFFORTS,
      prev1: 1,
      prev2: 1,
      segments: [{
        name: "Adventure",
        icon: "fa-map-signs"
      }, {
        name: "Reward",
        icon: "fa-treasure-chest"
      }, {
        name: "Heros",
        icon: "fa-user-shield"
      }, {
        name: "Timer",
        icon: "fa-hourglass"
      }],
      adventureTypes: [{
        segment: "simple",
        text: `A straightforward quest that tests a single skill or accomplishment. Perfect for daily tasks and building consistent habits. These are the building blocks of greater adventures.`
      }, {
        segment: "beast",
        text: `Face off against a mighty beast! These challenging quests pit heroes against formidable foes, requiring strategy and determination to overcome. Choose your beast wisely, for its strength determines the rewards.`
      }, {
        segment: "quest",
        text: `Embark on an epic journey! Chain multiple achievements together to create a grand adventure with multiple milestones. Perfect for complex projects or long-term goals that require multiple steps to complete.`
      }],
      achievementTypeIcons: ACHIEVEMENT_TYPE_ICONS,
      basicScheduleIcons: BASIC_SCHEDULE_ICONS,
      difficultyIcons: DIFFICULTY_ICONS,
      messages: [] as string[]

    }
  },

  computed: {
    achievementExpired() {
      if (!this.achievement.endsOn) return false
      return new Date(this.achievement.endsOn) < new Date()
    },
    achievementChain() {
      const { subAchievementIds } = this.achievement;
      const mapAchievement = id => this.achievements.find(a => a.id === id);
      const achievements = subAchievementIds.map(mapAchievement);

      return achievements;
    },
    hasBeast() {
      return !!this.achievement.beastId
    },

    hasSubAchievements() {
      return !!this.achievement.subAchievementIds
    },

    typeOfAdventure() {
      const isQuest = !this.hasBeast && this.hasSubAchievements;
      return isQuest ? "quest" : "beast"
    },

    activeAdventureType() {
      const { adventureTypes, adventureType } = this;
      const [firstType] = adventureTypes;
      const bySegment = type => type.segment === adventureType;
      return adventureTypes.find(bySegment) || firstType;
    },

    difficultyIcon() {
      const icon = this.difficultyIcons[this.achievement.difficulty]
      return icon || 'fa-chess'
    },

    isFibonacci() {
      return this.fibonacciArray.includes(this.achievement.difficulty)
    },

    assignedTo() {

      // get the list of users that are assigned to the achievement
      const { assignee } = this.achievement || {}

      // filter them from the users 
      const filterUserById = user => user.id === assignee
      const users = this.users.filter(filterUserById)

      const assignedTo = users.join(", ")

      return assignedTo

    },
    category() {
      // get the category that maatches the idea
      const { categoryId } = this.achievement || {}
      const findCategoryByName = category => category.id === categoryId
      const category = this.categories.find(findCategoryByName)
      return category
    },
    nextButton() {
      const { activeSegment } = this
      const findIndex = segment => segment.name.toLowerCase() === activeSegment.toLowerCase()
      const index = this.segments.findIndex(findIndex)

      const nextIndex = index + 1
      const maxLength = this.segments.length
      const nextSegment = this.segments[nextIndex]

      return (nextIndex >= maxLength)
        ? {
          text: this.segments[0].name,
          icon: this.segments[0].icon
        }
        : {
          text: nextSegment.name,
          icon: nextSegment.icon
        }
    },

    prevButton() {
      const { activeSegment } = this
      const findIndex = segment => segment.name.toLowerCase() === activeSegment.toLowerCase()
      const index = this.segments.findIndex(findIndex)

      const lastIndex = index - 1
      const maxLength = this.segments.length
      const lastSegment = this.segments[lastIndex]

      return (lastIndex < 0)
        ? {
          text: this.segments[maxLength - 1].name,
          icon: this.segments[maxLength - 1].icon,
        }
        : {
          text: lastSegment.name,
          icon: lastSegment.icon,
        }
    },
    isValidAdventure() {
      const { achievement, adventureType } = this;
      
      // Basic validation
      if (!achievement.achievementName?.trim()) return false;
      if (!achievement.categoryId) return false;
      if (!achievement.difficulty) return false;
      
      // Type-specific validation
      switch (adventureType) {
        case 'beast':
          return !!achievement.beastId;
        case 'quest':
          return achievement.subAchievementIds.length > 0;
        case 'simple':
          return true;
        default:
          return false;
      }
    },

    saveBtnDisabled() {
      return !this.isValidAdventure;
    }
  },

  methods: {

    async clickReorder() {
      const { achievementChain } = this
      const modal = await modalController.create({
        component: XpReorderAchievementsModal,
        componentProps: {
          achievements: achievementChain
        }
      });

      modal.onDidDismiss().then(({ data }) => {
        if (data)
          this.achievement.subAchievementIds = data
      });

      modal.present()
    },
    increaseDifficulty() {
      const currentIndex = this.fibonacciArray.indexOf(this.achievement.difficulty);
      if (currentIndex < this.fibonacciArray.length - 1) {
        this.achievement.difficulty = this.fibonacciArray[currentIndex + 1];
      }
    },
    decreaseDifficulty() {
      const currentIndex = this.fibonacciArray.indexOf(this.achievement.difficulty);
      if (currentIndex > 0) {
        this.achievement.difficulty = this.fibonacciArray[currentIndex - 1];
      }
    },
    async loadAchievement() {
      if (this.id) {
        const task = await this.achievementDb.getTaskById(this.id);
        this.achievement = { ...this.achievement, ...task };

        const hasBeast = task.beastId != ''
        const hasSubAchievement = task.subAchievementIds.length > 0

        this.adventureType = this.typeOfAdventure
      }
    },
    async loadAchievements() {
      this.achievements = await this.achievementDb.getAll();
    },
    async loadBeasts() {
      this.beasts = await this.bestiaryDb.getAll();
    },
    async loadCategories() {
      const categories = await this.categoryDb.getAll();
      this.categories = categories.sort(this.sortCategoryByName);
    },
    setNever() {
      this.achievement.endsOn = '';
      this.dismissModal();
    },
    async loadUsers() {
      const users = await this.profilesDb.getAll();
      this.users = users;
    },
    updatePoints() {
      const { difficulty } = this.achievement;
      // Find closest Fibonacci number
      const closestFib = this.fibonacciArray.reduce((prev, curr) => 
        Math.abs(curr - difficulty) < Math.abs(prev - difficulty) ? curr : prev
      );
      
      // Adjust difficulty to closest Fibonacci number
      this.achievement.difficulty = closestFib;
      
      // Calculate rewards based on difficulty
      const baseXP = 100;
      const baseGP = 10;
      const baseAP = 1;
      
      this.achievement = {
        ...this.achievement,
        xp: closestFib * baseXP,
        gp: closestFib * baseGP,
        ap: closestFib * baseAP
      };
    },
    dismissModal() {
      modalController.dismiss()
    },
    saveAchievement() {
      if (!this.isValidAdventure) {
        this.showValidationError();
        return;
      }

      const goBack = () => this.$router.go(-1);
      const showToast = () => this.achievementDb.showSuccessToast("Achievement Added!");
      
      this.achievementDb
        .setTask(this.achievement)
        .then(goBack)
        .then(showToast);
    },

    async showValidationError() {
      const alert = await alertController.create({
        header: 'Incomplete Adventure',
        subHeader: 'Some required fields are missing',
        message: this.getValidationMessage(),
        buttons: ['OK'],
        mode: 'ios'
      });

      await alert.present();
    },

    getValidationMessage() {
      const { achievement, adventureType } = this;
      const messages: string[] = [];

      if (!achievement.achievementName?.trim()) {
        messages.push('• Name your achievement');
      }
      if (!achievement.categoryId) {
        messages.push('• Select a category');
      }
      if (!achievement.difficulty) {
        messages.push('• Set the difficulty level');
      }
      
      switch (adventureType) {
        case 'beast':
          if (!achievement.beastId) {
            messages.push('• Choose a beast to challenge');
          }
          break;
        case 'quest':
          if (!achievement.subAchievementIds.length) {
            messages.push('• Add achievements to your quest chain');
          }
          break;
      }

      return messages.join('\n');
    }
  },

  mounted() {
    this.loadAchievements()
      .then(this.loadAchievement)
      .then(this.loadBeasts)
      .then(this.loadCategories)
      .then(this.loadUsers)
  },

  setup() {

    const route = useRoute();
    const router = useRouter();
    const id = router.currentRoute.value.params.id
    const profilesDb = new ProfileDb(profileStorage);
    const bestiaryDb = new BestiaryDb(beastStorage);
    const achievementDb = new AchievementDb(achievementStorage);
    const categoryDb = new AchievementCategoryDb(achievementCategoryStorage);

    const achievements = ref([] as Achievement[]);
    const achievement = ref({
      id: id ? id : uuidv4(),
      achievementName: '',
      beastId: '',
      subAchievementIds: [],
      categoryId: '',
      requiresApproval: false,
      points: '',
      assignee: [],
      type: '',
      bonusAchievement: false,
      startsOn: new Date().toISOString(),
      endsOn: '',
      dueByTime: '',
      scheduleType: 'basic',
      basicSchedule: 'daily',
      showDailyUntilComplete: false,
      repeatOnDays: [],
      customFrequency: 1,
      customPeriodNumber: 1,
      customPeriodType: 'day',
      difficulty: 0,
      imageUrl: '',
      xp: 0,
      gp: 0,
      ap: 0
    });

    const beasts = ref([] as Beast[])

    const ends = ref({} as typeof IonModal);

    const endsIsOpen = ref(false)

    const showEndsModal = () => endsIsOpen.value = true

    // create refs for form fields
    const achievementName = ref('');
    // const category = ref('');
    const addCategoryModalOpen = ref(false);

    const openAddCategoryModal = () => {
      addCategoryModalOpen.value = true;
    };

    const categories = ref([] as AchievementCategoryInterface[]);
    const users = ref([] as User[])

    const syncCategories = async () => {
      const updateCategories = newCategories => categories.value = newCategories.sort(sortCategoryByName)
      await categoryDb.getAll().then(updateCategories)
    }

    const addCategory = (newCategory: AchievementCategoryInterface) => {
      categoryDb
        .setCategory(newCategory)
        .then(syncCategories)
      achievement.value.categoryId = newCategory.id
    };

    const editCategories = (categories: AchievementCategoryInterface[]) => {
      categoryDb
        .setCategories(categories)
        .then(syncCategories)
    }

    const deleteCategory = (category: AchievementCategoryInterface) => {
      categoryDb
        .remove(category.id)
        .then(syncCategories)
    }

    const activeSegment = ref('adventure')

    const adventureType = ref('beast')

    const endsModalOpen = ref(false)

    // Watch for changes in route
    return {
      endsModalOpen,
      achievements,
      beasts,
      adventureType,
      deleteCategory,
      editCategories,
      sortCategoryByName,
      activeSegment,
      users,
      id,
      achievementDb,
      bestiaryDb,
      categoryDb,
      profilesDb,
      achievement,
      achievementName,
      addCategory,
      addCategoryModalOpen,
      categories,
      checkmarkOutline,
      checkmarkSharp,
      openAddCategoryModal
    };
  },
});

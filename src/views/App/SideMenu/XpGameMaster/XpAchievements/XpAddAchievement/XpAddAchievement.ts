import { v4 as uuidv4 } from 'uuid'
import { defineComponent, ref, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { modalController } from '@ionic/vue';

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
        name: "Treasure",
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
        text: `Simple adventures are the quests of everyday life. They may not have beasts to slay or treasure to find, but they are essential steps in your journey.`
      }, {
        segment: "beast",
        text: `Challenging tasks deserve formidable foes. Choose a beast from your Bestiary to face off against and elevate your quest to the next level.`
      }, {
        segment: "quest",
        text: `Some adventures are too grand to stand alone. Assemble a series of challenges that lead you toward an ultimate goal. These quests are perfect for epic undertakings that require multiple steps to complete.`
      }],
      achievementTypeIcons: ACHIEVEMENT_TYPE_ICONS,
      basicScheduleIcons: BASIC_SCHEDULE_ICONS,
      difficultyIcons: DIFFICULTY_ICONS

    }
  },

  computed: {
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
      return icon || 'fa-dice'
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
      const { difficulty } = this.achievement
      const multiplier = 200;
      this.achievement = {
        ...this.achievement,
        xp: difficulty * multiplier,
        gp: difficulty * (multiplier / 10),
        ap: difficulty * (multiplier / 100)
      }
    },
    dismissModal() {
      modalController.dismiss()
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
      subAchievementIds: [''],
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

    const sortCategoryByName = (a, b) => {
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

    const saveAchievement = () => {
      const goBack = () => router.go(-1)
      const showToast = () => achievementDb.showSuccessToast("Achievement Added!")
      achievementDb
        .setTask(achievement.value)
        .then(goBack)
        .then(showToast)
    };

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


    // Watch for changes in route
    return {
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
      // category,
      checkmarkOutline,
      checkmarkSharp,
      openAddCategoryModal,
      saveAchievement,
    };
  },
});

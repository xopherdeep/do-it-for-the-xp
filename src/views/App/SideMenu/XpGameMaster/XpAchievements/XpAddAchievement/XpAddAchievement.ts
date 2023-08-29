import { v4 as uuidv4 } from 'uuid'
import { defineComponent, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { modalController } from '@ionic/vue';
import { Drivers, Storage } from "@ionic/storage";

import { IonModal } from '@ionic/vue';

import AchievementDb, { AchievementCategoryDb, AchievementCategoryInterface } from "@/databases/AchievementDb"
import { achievementStorage } from '../XpAchievements.vue';
import ProfileDb from '@/databases/ProfileDb';
import { profileStorage } from '../../../SwitchProfile/SwitchProfile.vue';
import User from '@/utils/User';

import XpAddCategoryModal from "./components/XpAddCategoryModal.vue";

import ionic from '@/mixins/ionic';
import { checkmarkOutline, checkmarkSharp } from 'ionicons/icons';

export const achievementCategoryStorage = new Storage({
  name: "__achievementCategories",
  driverOrder: [Drivers.IndexedDB, Drivers.LocalStorage],
});

export default defineComponent({
  name: 'xp-add-achievement',
  mixins: [ionic],
  components: {
    XpAddCategoryModal
  },
  data() {
    return {
      efforts: [

      ],
      segments: [{
        name: "Classify",
        icon: "fa-book-open"
      },
      {
        name: "Assign",
        icon: "fa-dragon"
      }, {
        name: "XP",
        icon: "fa-ring"
      }, {
        name: "Schedule",
        icon: "fa-hourglass"
      }],
      achievementTypeIcons: {
        compete: "fa-swords",
        collaborate: "fa-dungeon",
        rotate: "fa-game-board",
        asNeeded: "fa-paw-claws",
        individual: "fa-scroll"
      }
    }
  },
  computed: {
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
      const maxLenght = this.segments.length
      const nextSegment = this.segments[nextIndex]

      return (nextIndex >= maxLenght)
        ? {
          text: this.segments[0].name
        }
        : {
          text: this.segments[index + 1].name,
        }
    },

    prevButton() {
      const { activeSegment } = this
      const findIndex = segment => segment.name.toLowerCase() === activeSegment.toLowerCase()
      const index = this.segments.findIndex(findIndex)

      const lastIndex = index - 1
      const maxLength = this.segments.length
      const nextSegment = this.segments[lastIndex]

      return (lastIndex < 0)
        ? {
          text: this.segments[maxLength - 1].name
        }
        : {
          text: this.segments[lastIndex].name,
        }
    }
  },

  methods: {
    async loadAchievement() {
      if (this.id) {
        const task = await this.storage.getTaskById(this.id);
        this.achievement = { ...this.achievement, ...task };
      }
    },
    async loadCategories() {
      const categories = await this.categoryStorage.getAll();
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
      this.achievement = {
        ...this.achievement,
        xp: difficulty * 200,
        gp: difficulty * 20,
        ap: difficulty * 2
      }
    },
    dismissModal() {
      modalController.dismiss()
    }
  },

  mounted() {
    this.loadAchievement()
    this.loadCategories()
    this.loadUsers()
  },

  setup() {
    const storage = new AchievementDb(achievementStorage)
    const categoryStorage = new AchievementCategoryDb(achievementCategoryStorage)
    const profilesDb = new ProfileDb(profileStorage)
    const router = useRouter()
    const id = router.currentRoute.value.params.id
    const achievement = ref({
      id: id ? id : uuidv4(),
      achievementName: '',
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
      basicSchedule: 'once',
      showDailyUntilComplete: false,
      repeatOnDays: [],
      customFrequency: 1,
      customPeriodNumber: 1,
      customPeriodType: 'day',
      difficulty: 1,
      xp: 0,
      gp: 0,
      ap: 0
    });

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

    const submitForm = () => {
      const goBack = () => router.go(-1)
      const showToast = () => storage.showSuccessToast("Achievement Added!")
      storage.setTask(achievement.value)
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
      await categoryStorage.getAll().then(updateCategories)
    }

    const addCategory = (newCategory) => {
      categoryStorage.setCategory(newCategory)
        .then(syncCategories)
      achievement.value.categoryId = newCategory.id
    };

    const activeSegment = ref('classify')

    return {
      sortCategoryByName,
      activeSegment,
      users,
      id,
      storage,
      categoryStorage,
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
      submitForm,
    };
  },
});

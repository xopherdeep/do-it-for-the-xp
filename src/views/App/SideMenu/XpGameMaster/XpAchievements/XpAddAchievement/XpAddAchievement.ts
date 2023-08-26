import { v4 as uuidv4 } from 'uuid'
import { defineComponent, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { modalController } from '@ionic/vue';
import { Drivers, Storage } from "@ionic/storage";

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
  methods: {
    async loadAchievement() {
      if (this.id) {
        const task = await this.storage.getTaskById(this.id);
        this.achievement = { ...this.achievement, ...task };
      }
    },
    async loadCategories() {
      const categories = await this.categoryStorage.getAll();
      this.categories = categories;
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
      type: 'individual',
      bonusAchievement: false,
      startsOn: new Date().toISOString(),
      endsOn: new Date().toISOString(),
      dueByTime: '',
      scheduleType: 'basic',
      basicSchedule: 'once',
      showDailyUntilComplete: false,
      repeatOnDays: [],
      customFrequency: 1,
      customPeriodNumber: 1,
      customPeriodType: 'day',
      difficulty: 1,
      xp: 200,
      gp: 20,
      ap: 2
    });

    const submitForm = () => {
      const goBack = () => router.go(-1)
      const showToast = () => storage.showSuccessToast("Achievement Added!")
      storage.setTask(achievement.value)
        .then(goBack)
        .then(showToast)
    };

    // create refs for form fields
    const achievementName = ref('');
    const category = ref('');
    const addCategoryModalOpen = ref(false);

    const openAddCategoryModal = () => {
      addCategoryModalOpen.value = true;
    };

    const categories = ref([] as AchievementCategoryInterface[]);
    const users = ref([] as User[])

    const syncCategories = async () => {
      const syncCategories = sync => categories.value = sync
      await categoryStorage.getAll().then(syncCategories)
    }

    const addCategory = (newCategory) => {
      categoryStorage.setCategory(newCategory)
        .then(syncCategories)
      achievement.value.categoryId = newCategory.id
    };

    return {
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
      category,
      checkmarkOutline,
      checkmarkSharp,
      openAddCategoryModal,
      submitForm,
    };
  },
});

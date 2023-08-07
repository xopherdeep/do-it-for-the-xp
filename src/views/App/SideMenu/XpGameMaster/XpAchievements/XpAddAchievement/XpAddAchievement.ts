import { defineComponent, ref } from 'vue';
import { checkmarkOutline, checkmarkSharp } from 'ionicons/icons';
import ionic from '@/mixins/ionic'
import XpAddCategoryModal from './components/XpAddCategoryModal.vue';

export default defineComponent({
  name: 'xp-add-achievement',
  mixins: [ionic],
    components: {
      XpAddCategoryModal
    },
  setup() {
    // create refs for form fields
    const achievementName = ref('');
    const category = ref('');
    const addCategoryModalOpen = ref(false);

    const openAddCategoryModal = () => {
      addCategoryModalOpen.value = true;
    };
    const requiresApproval = ref(false);
    const points = ref('');
    const assignee = ref([]);
    const type = ref('individual');
    const bonusAchievement = ref(false);
    const schedule = ref('');
    const xp = ref('');
    const gp = ref('');
    const ap = ref('');

    const categories = ref([
      { id: 1, name: 'Category 1' },
      { id: 2, name: 'Category 2' },
      // Add more categories as needed
    ]);

    const addCategory = (newCategory) => {
      categories.value.push(newCategory);
      category.value = newCategory.id;
    };

    const submitForm = () => {
      console.log({
        achievementName: achievementName.value,
        category: category.value,
        requiresApproval: requiresApproval.value,
        points: points.value,
        assignee: assignee.value,
        type: type.value,
        bonusAchievement: bonusAchievement.value,
        schedule: schedule.value,
      });
      // Now you can send this data to your server
    };

    return {
      openAddCategoryModal,
      addCategoryModalOpen,
      achievementName,
      category,
      requiresApproval,
      points,
      assignee,
      type,
      bonusAchievement,
      schedule,
      submitForm,
      checkmarkOutline,
      checkmarkSharp,
      categories,
      addCategory,
    };
  },
});

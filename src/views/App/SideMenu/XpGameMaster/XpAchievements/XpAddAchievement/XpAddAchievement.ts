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
  watch: {
    difficulty: function (val) {
      this.xp = val * 100;
      this.gp = val * 10;
      this.ap = val;
    }
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
    const difficulty = ref(1);

    const xp = ref(difficulty.value * 100);
    const gp = ref(difficulty.value * 10);
    const ap = ref(difficulty.value);

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
      xp.value = difficulty.value * 100;
      gp.value = difficulty.value * 10;
      ap.value = difficulty.value;

      console.log({
        achievementName: achievementName.value,
        category: category.value,
        requiresApproval: requiresApproval.value,
        points: points.value,
        assignee: assignee.value,
        type: type.value,
        bonusAchievement: bonusAchievement.value,
        schedule: schedule.value,
        difficulty: difficulty.value,
        xp: xp.value,
        gp: gp.value,
        ap: ap.value,
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
      difficulty,
      xp,
      ap, 
      gp
    };
  },
});

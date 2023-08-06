import { defineComponent, ref } from 'vue';
import { checkmarkOutline, checkmarkSharp } from 'ionicons/icons';
import ionic from '@/mixins/ionic'

export default defineComponent({
  name: 'xp-add-achievement',
  mixins: [ionic],
  setup() {
    // create refs for form fields
    const achievementName = ref('');
    const category = ref('');
    const requiresApproval = ref(false);
    const points = ref('');
    const assign = ref('');
    const type = ref('individual');
    const bonusAchievement = ref(false);
    const schedule = ref('');

    const submitForm = () => {
      console.log({
        achievementName: achievementName.value,
        category: category.value,
        requiresApproval: requiresApproval.value,
        points: points.value,
        assign: assign.value,
        type: type.value,
        bonusAchievement: bonusAchievement.value,
        schedule: schedule.value,
      });
      // Now you can send this data to your server
    };

    return {
      achievementName,
      category,
      requiresApproval,
      points,
      assign,
      type,
      bonusAchievement,
      schedule,
      submitForm,
      checkmarkOutline,
      checkmarkSharp,
    };
  },
});
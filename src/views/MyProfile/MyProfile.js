import { computed, defineComponent } from 'vue'
import ionic from "@/assets/js/mixins/ionic";
import { useRoute, useRouter } from "vue-router";
import { useStore } from 'vuex';
import userActions from "@/assets/js/mixins/userActions";

import CardUserStats from "@/views/CardUserStats/CardUserStats.vue";
import XpCardMenu from "@/views/MyPortal/components/XpCardMenu.vue"
import {
  arrowBack
} from "ionicons/icons"

export default defineComponent({
  name: "my-profile",
  mixins: [ionic, userActions],
  components: { CardUserStats, XpCardMenu },
  ionViewDidEnter(){
    this.setUserActions(this.userActions)
  },
  setup() {
    const route      = useRoute();
    const router     = useRouter();
    const store      = useStore();
    const { userId } = route.params;
    const user       = computed(() => store.getters.getUserById(userId));
    // code
    return {
      arrowBack,
      userId,
      userActions: [
        {
          label: "Talk",
          id: "talk-to",
          faIcon: "comment",
        },
        {
          label: "Notifications",
          id: "notifications",
          faIcon: "bell-exclamation",
        },
        {
          id: "abilities",
          label: "My Abilities",
          faIcon: "book-spells",
          click($ev) {
            router.push({ name: "my-abilities", params: { userId } });
          },
        },
        {
          label: "My Quests",
          id: "staff",
          faIcon: "medal quest",
          click(){
            router.push({name: 'my-tasks', params: {userId}})
          }
        },
        {
          label: "My Items",
          id: "my-inventory",
          faIcon: "backpack",
          click($ev) {
            router.push({ name: "my-inventory", params: { userId } });
          },
        },
        {
          label: "Stats",
          id: "user-profile",
          faIcon: "hand-holding-seedling",
        },
        {
          label: "My Wallet",
          id: "wallet",
          faIcon: "wallet",
          click(){
            router.push({name: 'my-gold-points', params: {userId}})
          }
        },
        {
          label: "Save & Quit",
          id: 'save-quit',
          faIcon: "save",
        },
      ],
    }
  },
})
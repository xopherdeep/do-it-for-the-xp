import { computed, defineComponent } from 'vue'
import ionic from "@/mixins/ionic";
import { useRoute, useRouter } from "vue-router";
import { useStore } from 'vuex';
import userActions from "@/mixins/userActions";
import XpIcon from "@/components/XpIcon";
import CardUserStats from "@/components/CardUserStats/CardUserStats.vue";
import XpCardMenu from "@/views/Console/MyPortal/UserHud/components/XpCardMenu.vue";
import { arrowBack } from "ionicons/icons";

export default defineComponent({
  name: "my-profile",
  mixins: [ionic, userActions],
  components: { 
    CardUserStats, 
    XpCardMenu,
    XpIcon
  },
  ionViewDidEnter() {
    this.setUserActions(this.userActions)
  },
  setup() {
    const route = useRoute();
    const router = useRouter();
    const store = useStore();
    const { userId } = route.params;
    const user = computed(() => store.getters.getUserById(userId));

    return {
      arrowBack,
      userId,
      user,
      userActions: [
        {
          label: "Talk",
          id: "talk-to",
          icon: "comment", // Changed from faIcon to icon
          primary: "blue",
          secondary: "gray"
        },
        {
          label: "Notifications",
          id: "notifications",
          icon: "bell-exclamation", // Changed from faIcon to icon
          primary: "yellow",
          secondary: "orange"
        },
        {
          id: "abilities",
          label: "My Abilities",
          icon: "book-spells", // Changed from faIcon to icon
          primary: "purple",
          secondary: "blue",
          click() {
            router.push(`/my-portal/${userId}/abilities`);
          },
        },
        {
          label: "My Quests",
          id: "staff",
          icon: "medal", // Changed from faIcon to icon
          primary: "gold",
          secondary: "bronze",
          click() {
            router.push(`/my-portal/${userId}/quests`);
          }
        },
        {
          label: "My Items",
          id: "my-inventory",
          icon: "backpack", // Changed from faIcon to icon
          primary: "brown",
          secondary: "gold",
          click() {
            router.push(`/my-portal/${userId}/inventory`);
          }
        },
        {
          label: "Stats",
          id: "user-profile",
          icon: "hand-holding-seedling", // Changed from faIcon to icon
          primary: "green",
          secondary: "lightgreen"
        },
        {
          label: "My Wallet",
          id: "wallet",
          icon: "wallet", // Changed from faIcon to icon
          primary: "black",
          secondary: "gray",
          click() {
            router.push(`/my-portal/${userId}/wallet`);
          }
        },
        {
          label: "Save & Quit",
          id: 'save-quit',
          icon: "save", // Changed from faIcon to icon
          primary: "red",
          secondary: "darkred"
        }
      ]
    };
  }
});
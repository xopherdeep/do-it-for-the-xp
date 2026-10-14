import { computed, defineComponent, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import {
  IonButton,
  IonButtons,
  IonCard,
  IonCardHeader,
  IonCardSubtitle,
  IonChip,
  IonContent,
  IonHeader,
  IonIcon,
  IonLabel,
  IonPage,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar,
  toastController,
} from "@ionic/vue";
import {
  flashOutline,
  peopleOutline,
  pulseOutline,
  settingsOutline,
  sparklesOutline,
} from "ionicons/icons";
import ionic from "@/lib/mixins/ionic";
import { getQuestLogDb, type QuestLogEntry } from "@/lib/databases/QuestLogDb";
import {
  calculatePartyStreak,
  partyActivityFeed,
  type PartyMember,
} from "@/lib/services/party/partyStats";
import { useUserStore } from "@/lib/store/stores/user";
import debug from "@/lib/utils/debug";
import PartyActivityTab from "./party/PartyActivityTab.vue";
import PartyRaidsTab from "./party/PartyRaidsTab.vue";
import PartyRosterTab from "./party/PartyRosterTab.vue";
import PartySynergiesTab from "./party/PartySynergiesTab.vue";

export default defineComponent({
  name: "my-party",
  components: {
    IonPage,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonButton,
    IonTitle,
    IonIcon,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardSubtitle,
    IonChip,
    PartyRosterTab,
    PartyActivityTab,
    PartySynergiesTab,
    PartyRaidsTab,
  },
  mixins: [ionic as any],
  setup() {
    const userStore = useUserStore();
    const router = useRouter();
    const activeTab = ref("roster");
    const questLogEntries = ref<QuestLogEntry[]>([]);

    const loadQuestLog = async () => {
      try {
        const entries = await getQuestLogDb().getEntries();
        questLogEntries.value = entries;
      } catch (error) {
        debug.error("MyParty could not load quest log entries:", error);
      }
    };

    onMounted(loadQuestLog);

    const partyMembers = computed<PartyMember[]>(() => {
      return userStore.usersAz.map((user: any) => ({
        ...user,
        role: user.isAdult ? "leader" : "member",
      }));
    });

    const partyStreak = computed(() =>
      calculatePartyStreak(questLogEntries.value)
    );

    const activityFeed = computed(() =>
      partyActivityFeed(questLogEntries.value, userStore.users)
    );

    const showToast = async (message: string, color = "success") => {
      const toast = await toastController.create({
        message,
        duration: 2000,
        position: "bottom",
        color,
      });
      await toast.present();
    };

    const cheerMember = (member: PartyMember) => {
      const name = member.name?.nick || "Hero";
      void showToast(`💚 Sent encouragement to ${name}!`);
    };

    const pokeMember = (member: PartyMember) => {
      const name = member.name?.nick || "Hero";
      void showToast(`👋 Nudged ${name}!`, "warning");
    };

    const openMemberProfile = (member: PartyMember) => {
      const nick = member.name?.nick || "Hero";
      debug.log("Open profile for", nick);
    };

    const openPartySettings = () => {
      void router.push("/xp-settings/party");
    };

    return {
      // Icons
      peopleOutline,
      pulseOutline,
      sparklesOutline,
      flashOutline,
      settingsOutline,
      // State
      activeTab,
      partyMembers,
      partyStreak,
      activityFeed,
      // Methods
      cheerMember,
      pokeMember,
      openMemberProfile,
      openPartySettings,
    };
  },
});

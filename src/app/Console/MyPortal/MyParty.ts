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
  actionSheetController,
  modalController,
  toastController,
} from "@ionic/vue";
import {
  flashOutline,
  peopleOutline,
  pulseOutline,
  settingsOutline,
  sparklesOutline,
} from "ionicons/icons";
import AddProfile from "@/app/SideMenu/SwitchProfile/AddProfile/AddProfile.vue";
import XpHeroPhonesModal from "@/app/SideMenu/XpSettings/components/XpHeroPhonesModal.vue";
import ionic from "@/lib/mixins/ionic";
import { getQuestLogDb, type QuestLogEntry } from "@/lib/databases/QuestLogDb";
import {
  calculatePartyStreak,
  partyActivityFeed,
  type PartyMember,
} from "@/lib/services/party/partyStats";
import { useFamilyStore } from "@/lib/store/stores/family";
import { useUserStore } from "@/lib/store/stores/user";
import { canManageFamily } from "@/router/_Guards/gm.guard";
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

    const family = useFamilyStore();
    const canManage = computed(() => canManageFamily(userStore));

    const openAddProfileModal = async () => {
      try {
        const modal = await modalController.create({
          component: AddProfile,
          cssClass: "fullscreen",
        });
        await modal.present();
        await modal.onDidDismiss();
        await userStore.loadUsers();
        await family.registerHeroes();
      } catch (error) {
        debug.error("Could not open AddProfile modal:", error);
      }
    };

    const openHeroPhonesModal = async (heroId: string, nickname: string) => {
      try {
        const modal = await modalController.create({
          component: XpHeroPhonesModal,
          componentProps: { heroId, nickname },
        });
        await modal.present();
      } catch (error) {
        debug.error("Could not open hero phones modal:", error);
      }
    };

    const promptPickHeroToLink = async () => {
      const heroButtons = userStore.usersAz.map((user: any) => ({
        text: user.name?.nick || user.name?.full || "Hero",
        handler: () => {
          const heroId = user.id as string;
          const nickname = user.name?.nick || user.name?.full || "Hero";
          void openHeroPhonesModal(heroId, nickname);
        },
      }));

      const buttons = [
        ...heroButtons,
        {
          text: "Cancel",
          role: "cancel",
        },
      ];

      const sheet = await actionSheetController.create({
        header: "Link a Hero Phone",
        subHeader: "Select which hero device you are linking",
        buttons,
      });
      await sheet.present();
    };

    const handleInviteMember = async () => {
      const isManager = canManage.value;
      if (!isManager) {
        void showToast("Only the Game Master can add party members.", "warning");
        return;
      }

      const buttons: any[] = [
        {
          text: "Add Hero on this Device",
          icon: "person-add",
          handler: () => {
            void openAddProfileModal();
          },
        },
      ];

      const hasRegisteredHeroes = userStore.usersAz.length > 0;
      if (hasRegisteredHeroes) {
        buttons.push({
          text: "Link a Hero Phone (QR Code)",
          icon: "phone-portrait",
          handler: () => {
            const hasSingleHero = userStore.usersAz.length === 1;
            if (hasSingleHero) {
              const only = userStore.usersAz[0];
              const heroId = only.id as string;
              const nickname = only.name?.nick || only.name?.full || "Hero";
              void openHeroPhonesModal(heroId, nickname);
            } else {
              void promptPickHeroToLink();
            }
          },
        });
      }

      buttons.push(
        {
          text: "Party Invites (Share with Friends)",
          icon: "share-social",
          handler: () => {
            void router.push("/tell-a-friend");
          },
        },
        {
          text: "Cancel",
          role: "cancel",
        }
      );

      const sheet = await actionSheetController.create({
        header: "Invite to Party",
        subHeader: "Add household heroes or link kid phones",
        buttons,
      });
      await sheet.present();
    };

    const handleLinkPhone = (member: PartyMember) => {
      const heroId = member.id as string;
      const nickname = member.name?.nick || member.name?.full || "Hero";
      void openHeroPhonesModal(heroId, nickname);
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
      canManage,
      // Methods
      cheerMember,
      pokeMember,
      openMemberProfile,
      openPartySettings,
      handleInviteMember,
      handleLinkPhone,
    };
  },
});

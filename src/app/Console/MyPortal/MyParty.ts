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
  IonFooter,
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
import { usePartyScope, type HomeScope } from "@/hooks/usePartyScope";
import { usePartyVoice } from "@/hooks/usePartyVoice";
import ionic from "@/lib/mixins/ionic";
import { getQuestLogDb, type QuestLogEntry } from "@/lib/databases/QuestLogDb";
import { problemText } from "@/lib/services/party/partyProblemText";
import { HOME_PARTY_ID } from "@/lib/services/party/partyRules";
import {
  calculatePartyStreak,
  heroesFinishedOn,
  partyActivityFeed,
  toDayKey,
  type PartyMember,
} from "@/lib/services/party/partyStats";
import { useFamilyStore } from "@/lib/store/stores/family";
import { useUserStore } from "@/lib/store/stores/user";
import { canManageFamily } from "@/router/_Guards/gm.guard";
import debug from "@/lib/utils/debug";
import PartyActivityTab from "./party/PartyActivityTab.vue";
import PartyFormJoin from "./party/PartyFormJoin.vue";
import PartyPresetBar from "./party/PartyPresetBar.vue";
import PartyRaidsTab from "./party/PartyRaidsTab.vue";
import PartyRosterTab from "./party/PartyRosterTab.vue";
import PartySwitcher from "./party/PartySwitcher.vue";
import PartySynergiesTab from "./party/PartySynergiesTab.vue";
import { sentWordToast } from "./party/partyWording";

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
    IonFooter,
    PartyRosterTab,
    PartyActivityTab,
    PartySynergiesTab,
    PartyRaidsTab,
    PartySwitcher,
    PartyFormJoin,
    PartyPresetBar,
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

    // The party the tabs show: the household's own, or one with other families (the tabs read one scope either way)
    const homeScope = computed<HomeScope>(() => ({
      members: partyMembers.value,
      activity: activityFeed.value,
      heroIdsToday: heroesFinishedOn(questLogEntries.value, toDayKey()),
    }));
    const { activePartyId, parties, outsideParty, isNewParty, scope } = usePartyScope(homeScope, activeTab);
    const showHome = computed(() => activePartyId.value === HOME_PARTY_ID);
    const { senderHeroId, showWords, partyHeroes, sendWordTo } = usePartyVoice(outsideParty);

    const showToast = async (message: string, color = "success") => {
      const toast = await toastController.create({
        message,
        duration: 2000,
        position: "bottom",
        color,
      });
      await toast.present();
    };

    /** A cheer or a poke: a toast at home, and one of the fixed words aimed at the member in a party with other families */
    const sayTo = async (member: PartyMember, word: "cheer" | "poke"): Promise<void> => {
      const sent = sentWordToast(word, member.name?.nick || "");
      const isAtHome = !outsideParty.value;
      if (isAtHome) {
        await showToast(sent.text, sent.color);
        return;
      }

      const result = await sendWordTo(String(member.id), word);
      await showToast(result.ok ? sent.text : problemText(result.problem), result.ok ? sent.color : "warning");
    };

    const cheerMember = (member: PartyMember) => {
      void sayTo(member, "cheer");
    };

    const pokeMember = (member: PartyMember) => {
      void sayTo(member, "poke");
    };

    /** A party with other families was just formed: show it */
    const showFormedParty = (partyId: string) => {
      activePartyId.value = partyId;
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
      // In a party with other families, inviting means handing a friend's Game Master the code
      const party = outsideParty.value;
      if (party) {
        const shareText = party.code ? `Party code: ${party.code}. Give it to a friend's Game Master.` : "Ask the party leader for the code.";
        void showToast(shareText, "success");
        return;
      }

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
      activePartyId,
      parties,
      scope,
      showHome,
      isNewParty,
      outsideParty,
      senderHeroId,
      showWords,
      partyHeroes,
      partyMembers,
      partyStreak,
      canManage,
      // Methods
      cheerMember,
      pokeMember,
      showFormedParty,
      openMemberProfile,
      openPartySettings,
      handleInviteMember,
      handleLinkPhone,
    };
  },
});

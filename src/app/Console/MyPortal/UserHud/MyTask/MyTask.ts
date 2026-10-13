import { defineComponent, ref } from "vue";
import ionic from "@/lib/mixins/ionic";
import { IonicSlides, modalController } from "@ionic/vue";
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonMenuButton,
  IonTitle,
  IonContent,
  IonBackdrop,
  alertController,
  IonSegment,
  IonSegmentButton,
  toastController,
  createAnimation,
} from "@ionic/vue";

import { Swiper, SwiperSlide } from "swiper/vue";
// Import Swiper styles
import "swiper/css";
import type { Swiper as SwiperType } from 'swiper';

/* eslint-disable */
// eslint-disable-next-line to

// import rabbitFast from "@/assets/fonts/font-awesome/svgs/duotone/rabbit-fast.svg";
// import comment from "@/assets/fonts/font-awesome/svgs/duotone/comment.svg";
// import wandMagic from "@/assets/fonts/font-awesome/svgs/duotone/wand-magic.svg";
// import sack from "@/assets/fonts/font-awesome/svgs/duotone/sack.svg";

import { NativeAudio } from "@awesome-cordova-plugins/native-audio";
import CardUserStats from "@/components/organisms/CardUserStats/CardUserStats.vue";
import { useItemFetcher } from "@/hooks/useItemFetcher";
import { useTimers } from "@/hooks/useTimers";
import AnimatedNumber from "@/components/atoms/AnimatedNumber/XpAnimatedNumber.vue";
import { useUserStore } from "@/lib/store/stores/user";
import { useGameStore } from "@/lib/store/stores/game";
import { useBattleStore } from "@/lib/store/stores/battle";
import { useAudioStore } from "@/lib/store/stores/audio";
import { useRouter } from "vue-router";
import { Controller, Navigation } from "swiper/modules";
import { formatQuestName } from "@/lib/utils/format";
import { sanitizeHtml } from "@/lib/utils/sanitizeHtml";
import { format, set } from "date-fns";
import { getQuestLogDb } from "@/lib/databases/QuestLogDb";
import { DAY_TOKENS, effectiveDeadline } from "@/lib/engine/quests/QuestSchedule";
import { checkClaimWindow } from "@/lib/services/quests/QuestClaimGuard";
import { cardDueLabelFor } from "@/lib/services/quests/QuestList";
import { completeQuest, questRewards } from "@/lib/services/quests/QuestCompletionService";
import type { CompletionResult } from "@/lib/services/quests/QuestCompletionService";
import { questBattleRoute } from "@/app/Console/BattleField/battle/battleContext";
import { isFabOpening } from "./fabOpening";

// Define interfaces for the app
interface Item {
  label: string;
  quantity: number;
}

interface ToastParams {
  header: any;
  message: any;
  icon?: any;
  duration?: number;
}

interface UserCardRef {
  beginCounter: () => void;
}

interface SlidesRef {
  slideTo: (index: number) => Promise<void>;
  getActiveIndex: () => Promise<number>;
}

// Names for the Fibonacci effort scale the Game Master picks a quest's difficulty from
const DIFFICULTY_LABELS: Record<number, string> = {
  1: "Trivial", 2: "Simple", 3: "Easy", 5: "Moderate", 8: "Challenging", 13: "Difficult",
  21: "Very Difficult", 34: "Extremely Difficult", 55: "Insane", 89: "Legendary", 144: "Mythical",
};

// Today at the quest's due time. The time picker stores a bare "HH:mm" or a full ISO stamp; only the clock matters.
const dueTimeToday = (dueByTime = ""): Date | null => {
  const clock = /^(\d{1,2}):(\d{2})/.exec(dueByTime);
  const stamp = !clock && /[T-]/.test(dueByTime) ? new Date(dueByTime) : null;
  const hours = clock ? Number(clock[1]) : stamp?.getHours();
  const minutes = clock ? Number(clock[2]) : stamp?.getMinutes();
  // Unset, unreadable (NaN) and out-of-range times all fail this check
  const isClockUnreadable = hours === undefined || minutes === undefined || !(hours < 24 && minutes < 60);
  if (isClockUnreadable) return null;
  return set(new Date(), { hours, minutes, seconds: 0, milliseconds: 0 });
};

export default defineComponent({
  // boardStatus: 'open' | 'done' | 'notDue' as seen on the quest board the modal was opened from
  // pending: a claim in the current window is still waiting for the Game Master (a done quest then reads Pending, not Tamed)
  props: ["taskId", "item", "userId", "boardStatus", "pending"],
  emits: ["didDismiss"],
  name: "my-task",
  components: {
    alertController,
    AnimatedNumber,
    CardUserStats,
    IonBackdrop,
    IonButtons,
    IonContent,
    IonHeader,
    IonMenuButton,
    IonPage,
    IonSegment,
    IonSegmentButton,
    IonTitle,
    IonToolbar,
    Swiper,
    SwiperSlide,
  },
  data() {
    return {
      debug: false,
      nativeAudio: NativeAudio,
      isOpen: false,
      // slider: IonSlides,
      userMenuActive: false,
      fabOpenedAt: 0, // when the fab's menu opened by itself, so a tap just after it goes to the primary action
      itemsDropped: [
        {
          label: "Potion",
          quantity: 2,
        },
      ] as Item[],
      itemsLooted: [] as Item[],
      segment: 0,
      claimed: false, // set once the hero claims the quest from this modal
      claiming: false, // a claim is being recorded
      awaitingApproval: false,
      walletBefore: 0, // wallet when the modal opened, so the GP counter can climb to the credited total

      temp: {
        gp: {
          wallet: 0,
          gained: 0,
        },
      },
    };
  },
  created() {
    this.temp.gp.wallet = (this as any).user?.stats?.gp?.wallet || 0;
    this.walletBefore = this.temp.gp.wallet;
  },
  computed: {
    // item(){
    //   const { taskId: id } = this
    //   return this.singleById({ type: "xp_achievement", id })
    // }
    gpBar() {
      const stats = (this as any).user?.stats;
      if (!stats) return 0;
      return this.temp.gp.wallet / stats.gp.limit;
    },
    user() {
      return (this as any).userStore.getUserById(this.userId);
    },
    router() {
      return (this as any).$router;
    },
    rewards() {
      return questRewards(this.item || {});
    },
    questImage() {
      const src = this.item?.localImage || this.item?.imageUrl;
      return src ? { src, alt: this.item.achievementName } : null;
    },
    // The quest's window is used up (per the board the modal opened from, or claimed just now)
    isDone() {
      return this.boardStatus === "done" || this.claimed;
    },
    // Done, but the Game Master has not approved the claim yet, so the rewards are still held
    isPending() {
      return this.isDone && (this.claimed ? this.awaitingApproval : Boolean(this.pending));
    },
    // Done for good: approved, or paid out at once
    isTamed() {
      return this.isDone && !this.isPending;
    },
    canClaim() {
      return !this.isDone && this.boardStatus !== "notDue";
    },
    // A beast quest is won in the arena (the battle records the completion) instead of claimed from the log
    isBeastQuest() {
      return this.item?.adventureType === "beast" || Boolean(this.item?.beastId);
    },
    // Label of the primary button in the fab menu
    primaryLabel() {
      if (this.isPending) return "Pending";
      if (this.isTamed) return "Tamed";
      return this.isBeastQuest ? "Fight!" : "Claim";
    },
    primaryIcon() {
      if (this.isPending) return "fad fa-hourglass-half fa-lg";
      return this.isBeastQuest && !this.isDone ? "fad fa-swords fa-lg" : "fa fa-hand-holding-medical fa-lg";
    },
    // The quest's due moment: today's due time, or the last day of a weekly or custom window, after the hero's Ice Wand and Chronos' Clock
    dueTime() {
      const effects = (this as any).user?.questEffects;
      return this.item ? effectiveDeadline(this.item, effects, new Date()) : dueTimeToday(this.item?.dueByTime);
    },
    dueLabel() {
      return this.dueTime ? cardDueLabelFor(this.dueTime, new Date()) : null;
    },
    // Flip-clock target: only while the quest is still open and today's due time is ahead
    deadline() {
      if (this.isDone) return null;
      const dueTime = this.dueTime;
      const isDeadlineOver = !dueTime || dueTime <= new Date();
      if (isDeadlineOver) return null;
      return format(dueTime, "yyyy-MM-dd HH:mm:ss");
    },
    difficultyLabel() {
      const difficulty = Number(this.item?.difficulty);
      return difficulty ? DIFFICULTY_LABELS[difficulty] || `Level ${difficulty}` : null;
    },
    // Weekday chips for daily and weekly quests, lit on the days the quest repeats
    weekDays() {
      const { basicSchedule, repeatOnDays = [] } = this.item || {};
      const hasNoWeekdayChips = basicSchedule !== "daily" && basicSchedule !== "weekly";
      if (hasNoWeekdayChips) return [];
      return DAY_TOKENS.map((token) => ({
        letter: token[0].toUpperCase(),
        active: basicSchedule === "daily" || repeatOnDays.includes(token),
      }));
    },
  },
  methods: {
    // The claim already credited the wallet; fill the bar and counters up to the new total
    addUpGP() {
      if (!this.rewards.gp) return;
      this.$fx.rpg[this.$fx.theme.rpg].countCoins.play();
      setTimeout(() => {
        this.$fx.rpg[this.$fx.theme.rpg].countCoins.pause();
      }, 4000);
      this.startCounting();
      this.temp.gp.wallet = (this as any).user.stats.gp.wallet;
      this.temp.gp.gained = this.rewards.gp;
    },
    startCounting() {
      const counters = ["countAPGained", "countXPGained", "countGPGained", "countWallet"];
      counters.forEach((name) => (this.$refs[name] as { start?: () => void } | undefined)?.start?.());
    },
    finishedCounting() {
      // alert()
      const $fx = (this as any).$fx;
      const theme = $fx.theme;
      $fx.rpg[theme.rpg].countCoins.pause();
      $fx.rpg[theme.rpg].fillPoints.pause();
      $fx.rpg[theme.rpg].fillPoints.currentTime = 0;
    },
    didPresent() {
      this.timers.startTimeout(500, () => {
        this.userMenuActive = true;
        this.fabOpenedAt = Date.now();
      });
    },
    // The avatar toggles the fab's menu. Just after the menu opened by itself that tap means "go": run the primary
    // action (Fight!, Claim) instead of letting Ionic shut the menu again. Taps on the buttons themselves pass through.
    onFabTap(ev: Event) {
      const isAvatarTap = Boolean((ev.target as Element | null)?.closest?.("ion-fab-button"));
      const isTapDuringOpening = isAvatarTap && isFabOpening(this.fabOpenedAt, Date.now());
      if (!isTapDuringOpening) return;
      ev.stopPropagation();
      void this.clickClaim();
    },
    willPresent() {
      this.$fx.ui[this.$fx.theme.ui].openTask.play();
    },
    willDismiss() {
      this.$fx.ui[this.$fx.theme.ui].closeTask.play();
    },
    focusUserMenu() {
      this.$fx.ui[this.$fx.theme.ui].select.play();
    },
    getItemLabel(item) {
      return `${item.quantity.toString()}x ${item.label}`;
    },
    filterList(list, item) {
      this[list] = this[list]
        ? this[list].filter((i) => i.label != item.label)
        : [];
    },
    slideLootItem(item) {
      this.$fx.rpg[this.$fx.theme.rpg].lootItem.play();
      this.itemsLooted.push(item);
      this.filterList("itemsDropped", item);
    },
    slideDropItem(item) {
      this.$fx.rpg[this.$fx.theme.rpg].dropItem.play();
      this.itemsDropped.push(item);
      this.filterList("itemsLooted", item);
    },
    clickDropAll() {
      this.$fx.rpg[this.$fx.theme.rpg].dropItem.play();
      this.itemsDropped = this.itemsLooted;
      this.itemsLooted = [];
    },
    clickLootAll() {
      this.$fx.rpg[this.$fx.theme.rpg].lootItem.play();
      this.itemsLooted = this.itemsDropped;
      this.itemsDropped = [];
    },
    clickLoot() {
      this.$fx.ui[this.$fx.theme.ui].select.play();
      this.$fx.rpg[this.$fx.theme.rpg].loot.play();
      (this as any).controlledSwiper?.slideNext();
    },

    async segmentChanged(ev) {
      // console.log(ev);
      this.segment = ev.detail.value;

      await (this.$refs.slides as SlidesRef).slideTo(this.segment);
    },

    // Keep `segment` in step with the swiper so each slide's reward effects play when it appears
    slideChanged(swiper: SwiperType) {
      this.segment = swiper.activeIndex;
    },
    getUserAvatar(user) {
      if (user.avatar) {
        const avatar = `./avatars/${user.avatar}.svg`;
        return this.$requireImg(avatar);
      }
    },
    async clickMagic() {
      const alert = await alertController.create({
        cssClass: "my-custom-class",
        header: "Magic & Abilities",
        inputs: [
          {
            label: "Slow",
            type: "radio",
          },
          {
            label: "Slowga",
          },
          {
            label: "Slowga",
          },
          {
            label: "Bribe",
          },
        ],
        buttons: [
          {
            text: "Cancel",
            role: "cancel",
            cssClass: "secondary",
            handler: () => {
              this.$fx.ui[this.$fx.theme.ui].no.play();
              // console.log("Confirm Cancel");
            },
          },
          {
            text: "Cast",
            handler: (value) => {
              this.$fx.rpg[this.$fx.theme.rpg].useMP.play();
              this.$fx.ui[this.$fx.theme.ui].yes.play();
              // console.log(value);

              this.createToast({
                header: `${(this as any).user.name.nick} uses a spell...`,
                message: "Ha! Take that",
                icon: null,
                duration: 1750,
              });
            },
          },
        ],
      });
      alert.addEventListener("click", () => {
        this.$fx.ui[this.$fx.theme.ui].select.play();
      });
      return alert.present();
    },
    async clickInventory() {
      const alert = await alertController.create({
        cssClass: "my-custom-class",
        header: "Inventory",
        inputs: [
          {
            label: "Neigh Card",
            type: "radio",
          },
          {
            label: "Get-Out-of-Jail-Free",
          },
        ],
        buttons: [
          {
            text: "Cancel",
            role: "cancel",
            cssClass: "secondary",
            handler: () => {
              this.$fx.ui[this.$fx.theme.ui].no.play();

              // console.log("Confirm Cancel");
            },
          },
          {
            text: "Use",
            handler: () => {
              this.$fx.ui[this.$fx.theme.ui].yes.play();
              this.$fx.rpg[this.$fx.theme.rpg].useItem.play();
              // console.log("Confirm Ok");
              this.createToast({
                header: `${(this as any).user.name.nick} took out something from their bag...`,
                message: "...nothing happened.",
                icon: null,
                duration: 1750,
              });
            },
          },
        ],
      });
      this.$fx.ui[this.$fx.theme.ui].options.play();
      alert.addEventListener("click", () => {
        this.$fx.ui[this.$fx.theme.ui].select.play();
      });
      return alert.present();
    },
    // Take the quest into battle. Nothing is claimed here: the battle credits the rewards and logs the win.
    clickFight() {
      if (!this.canClaim) return;
      this.$fx.ui[this.$fx.theme.ui].yes.play();
      this.$emit("didDismiss");
      this.router.push(questBattleRoute(String(this.userId), String(this.item.id)));
    },
    async clickClaim() {
      if (!this.canClaim) return;
      if (this.isBeastQuest) return this.clickFight();
      const alert = await alertController.create({
        cssClass: "my-custom-class",
        header: "Claim Achievement?",
        // subHeader: 'Adds Mark in Quest log',
        message: "Would you like claim this achievement in your quest log?",
        buttons: [
          {
            text: "No",
            role: "cancel",
            cssClass: "secondary",
            handler: () => {
              this.$fx.ui[this.$fx.theme.ui].no.play();
              this.createToast({
                header: `${(this as any).user.name.nick}:`,
                message: `"I'll come back to that later..."`,
                duration: 1800,
                icon: null,
              });
            },
          },
          {
            text: "Yes",
            // Ionic keeps the alert up until the claim is recorded
            handler: async () => {
              this.$fx.ui[this.$fx.theme.ui].yes.play();
              await this.submitClaim();
            },
          },
        ],
      });
      this.$fx.ui[this.$fx.theme.ui].alert.play();
      return alert.present();
    },
    // Hero-voiced toast, like the other quest prompts
    say(message: string, header?: string, duration = 1800) {
      return this.createToast({ header: header ?? `${this.user.name.nick}:`, message, duration, icon: null });
    },
    // Record the claim, pay the rewards (or hold them for the Game Master) and show the result
    async submitClaim() {
      if (this.claiming) return; // "Yes" tapped again before the first claim was recorded
      this.claiming = true;
      const heroId = String(this.userId);
      try {
        // The quest log is the source of truth, so a stale modal can never pay out twice. Every hero's log:
        // another assignee's clear of a shared quest (Team Effort, Rat Race) already used the window up
        const entries = await getQuestLogDb().getEntries();
        // The hero's items (a snooze, a pull-in) count the same way the board counted them
        const effects = (this as any).user?.questEffects;
        const check = checkClaimWindow(this.item, entries, heroId, new Date(), effects);
        if (!check.canClaim) {
          // The log says the window is used up already; show it the way the board would
          this.claimed = check.isUsedUp;
          this.awaitingApproval = check.awaitingApproval;
          this.say(check.notice);
          return;
        }
        const result = await completeQuest(this.item, heroId, "claim");
        this.claimed = true;
        this.awaitingApproval = result.awaitingApproval;
        this.announceClaim(result);
        (this as any).controlledSwiper?.slideNext();
      } catch {
        this.say("The quest log did not respond. Try again.", undefined, 2200);
      } finally {
        this.claiming = false;
      }
    },
    announceClaim({ awaitingApproval, levelUp, paid }: CompletionResult) {
      const nick = this.user.name.nick;
      if (awaitingApproval) {
        this.say("Sent to the Game Master for approval", nick, 2200);
        return;
      }
      // What landed in the pocket: a Thief's or Ninja's GP comes with the class bonus on top
      const { xp, gp, ap } = paid ?? this.rewards;
      this.say(`+${xp} XP · +${gp} GP · +${ap} AP`, `${nick} tamed ${this.item.achievementName || "the quest"}!`);
      if (!levelUp?.didLevelUp) return;
      const { newLevel } = levelUp;
      setTimeout(() => {
        this.$fx.rpg[this.$fx.theme.rpg].levelUp.play();
        this.say(`LEVEL UP! Now level ${newLevel}`, nick, 2400);
      }, 2000); // let the rewards toast clear first
    },
    async clickRun() {
      const alert = await alertController.create({
        cssClass: "my-custom-class",
        header: "Roll 1d8 to Run Away",
        // subHeader: 'Adds Mark in Quest log',
        message:
          "Running away will take -1d8 from your HP. Click Roll to continue.",
        buttons: [
          {
            text: "No",
            role: "cancel",
            cssClass: "secondary",
            handler: () => {
              this.$fx.ui[this.$fx.theme.ui].no.play();
              // console.log("Confirm Cancel");
            },
          },
          {
            text: "Roll",
            handler: () => {
              const { $fx, closeModal, router, user, battleStore } = this as any;

              const roll = Math.floor(Math.random() * 7) + 1;
              battleStore.deactivateBattle();
              afterLeaveBattle();

              function afterLeaveBattle() {
                router
                  .push({
                    name: "world-map",
                    params: { userId: user.id },
                  })
                  .then(leaveBattleMessage);
              }

              async function leaveBattleMessage() {
                $fx.rpg[$fx.theme.rpg].attack.play();

                const toast = await toastController.create({
                  header: user.name.nick + " Ran Away ",
                  cssClass: $fx.theme.rpg,
                  message: `-${roll} HP`,
                  // icon    : rabbitFast,
                  duration: 2000,
                  position: "top",
                });

                closeModal();

                await toast.present();
              }
            },
          },
        ],
      });
      this.$fx.ui[this.$fx.theme.ui].alert.play();
      return alert.present();
    },
    async closeModal() {
      await modalController.dismiss();
    },
    async createToast({ header, message, icon, duration }: ToastParams) {
      const toast = await toastController.create({
        header,
        cssClass: (this as any).$fx.theme.rpg,
        message,
        icon,
        duration: duration ? duration : 1750,
        position: "top",
      });

      await toast.present();
    },
    typewriter(el) {
      return createAnimation()
        .addElement(el)
        .duration(2000)
        .iterations(Infinity)
        .fromTo("width", "0", "100%");
    },
    blinkTextCursor(el) {
      return createAnimation()
        .addElement(el)
        .duration(500)
        .iterations(Infinity)
        .fromTo("border-color", "transparent", "white");
    },
  },
  watch: {
    segment(segment) {
      switch (segment) {
        case 0:
          this.didPresent();
          this.$fx.ui[this.$fx.theme.ui].openTask.play();
          break;
        case 1:
          // Nothing is paid out while the claim waits for the Game Master
          if (this.awaitingApproval) break;
          this.startCounting();
          this.$fx.rpg[this.$fx.theme.rpg].fillPoints.play();
          if (this.$refs.userCard) (this.$refs.userCard as UserCardRef).beginCounter();
          this.$fx.rpg[this.$fx.theme.rpg].gainXP.play();
          // setTimeout(()=>this.$refs.slides.slideNext(), 5000)
          break;
        case 2:
          this.addUpGP();
          break;

        default:
          break;
      }
    },
  },

  mixins: [ionic],
  setup(props) {
    const {
      request,
      items,
      getItems,
      getImgObj,
      nTotalPages
    } = useItemFetcher("xp_achievement", { per_page: 4 }, (props as any).userId);

    const userStore = useUserStore();
    const gameStore = useGameStore();
    const battleStore = useBattleStore();
    const audioStore = useAudioStore();
    const router = useRouter();
    const timers = useTimers();
    const controlledSwiper = ref<SwiperType | null>(null);
    const setControlledSwiper = (swiper: SwiperType) => {
      controlledSwiper.value = swiper;
    };
    return {
      userStore,
      gameStore,
      battleStore,
      audioStore,
      timers,
      controlledSwiper,
      setControlledSwiper,
      modules: [IonicSlides, Navigation, Controller],
      router,
      request,
      items,
      getItems,
      getImgObj,
      nTotalPages,
      formatQuestName,
      sanitizeHtml,
    };
  },
});

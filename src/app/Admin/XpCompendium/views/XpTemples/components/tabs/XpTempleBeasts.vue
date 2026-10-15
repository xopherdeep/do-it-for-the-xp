<template>
  <ion-page class="xp-temple-beasts">
    <ion-content class="transparent-content">
      <div class="content-wrapper">
        <!-- What the temple is about, how big it is, and what the dots mean -->
        <TempleQuestsHeader v-if="hasRooms" :view="view" :theme-label="quests.themeLabel.value" />

        <div class="stat-pills" v-if="totalRooms > 0">
          <div class="stat-pill">
            <i class="fad fa-dragon"></i>
            <span>{{ totalRooms }} Threats</span>
          </div>
          <div class="stat-pill" v-if="roomCount('boss') > 0">
            <i class="fad fa-crown text-warning"></i>
            <span>{{ roomCount("boss") }} Boss{{ roomCount("boss") !== 1 ? "es" : "" }}</span>
          </div>
          <div class="stat-pill" v-if="roomCount('miniboss') > 0">
            <i class="fad fa-helmet-battle text-tertiary"></i>
            <span>{{ roomCount("miniboss") }} Miniboss{{ roomCount("miniboss") !== 1 ? "es" : "" }}</span>
          </div>
        </div>

        <!-- Rooms Grouped by Tier -->
        <ion-accordion-group v-if="totalRooms > 0" :value="activeTiers" :multiple="true" @ionChange="onAccordionChange">
          <ion-accordion v-for="tier in shownTiers" :key="tier.id" :value="tier.id" class="tier-accordion"
            :class="`${tier.id}-tier`">
            <ion-item slot="header" class="tier-header">
              <div class="tier-icon" :class="tier.id">
                <i class="fad" :class="tier.icon"></i>
              </div>
              <ion-label>
                <h2>{{ tier.title }}</h2>
                <p>
                  {{ roomCount(tier.id) }} encounter{{ roomCount(tier.id) !== 1 ? "s" : "" }}
                </p>
              </ion-label>
            </ion-item>

            <div slot="content" class="tier-content">
              <!-- Quest rooms: the quest each holds, or the dormant template waiting to be woken -->
              <ul class="quest-list" v-if="view.groups[tier.id].length > 0">
                <li v-for="row in view.groups[tier.id]" :key="row.key">
                  <TempleQuestRowCard :row="row" @open="navigateToRoom(row)" />
                </li>
              </ul>

              <!-- Classic beast rooms: listed as they always were -->
              <p class="classic-label" v-if="view.groups[tier.id].length > 0 && classicEntries(tier.id).length > 0">
                Classic beast rooms
              </p>
              <div class="beast-grid" v-if="classicEntries(tier.id).length > 0">
                <ion-grid>
                  <ion-row>
                    <ion-col :size="tier.colSize" :size-md="tier.colMd" :size-lg="tier.colLg"
                      v-for="entry in classicEntries(tier.id)" :key="`${entry.roomSymbol}-${entry.beastId}`"
                      :id="`beast-card-${entry.roomSymbol}`">
                      <div class="beast-card-wrapper" role="button" tabindex="0" @click="openBeastSelector(entry)"
                        @keydown.enter.self="openBeastSelector(entry)"
                        @keydown.space.self.prevent="openBeastSelector(entry)">
                        <TempleBeastPortrait :beast="entry.beast" :tier="tier.id" :icon="tier.placeholderIcon"
                          :label="tier.placeholderLabel" />
                        <div class="room-info-overlay" :class="{ small: tier.small }">
                          <div class="config-token-badge" :class="{ small: tier.small }">
                            {{ entry.roomSymbol }}
                          </div>
                          <XpCoordBadge :size="tier.small ? 'small' : 'medium'" :x="entry.col" :y="entry.row"
                            @click.stop="navigateToRoom(entry)" />
                        </div>
                      </div>
                    </ion-col>
                  </ion-row>
                </ion-grid>
              </div>
            </div>
          </ion-accordion>
        </ion-accordion-group>

        <!-- Empty State -->
        <div class="glass-card empty-state" v-else>
          <ion-icon :icon="skullOutline" class="empty-icon"></ion-icon>
          <h2>No Quests Yet</h2>
          <p>
            Add quest rooms (or classic monster, miniboss or boss rooms) in the Layout tab to populate
            this dungeon with threats.
          </p>
        </div>
      </div>
    </ion-content>

    <!-- Wake quests sits at the bottom, under the thumb -->
    <ion-footer class="quests-dock" v-if="quests.choices.value.length > 0">
      <div class="dock">
        <button type="button" class="wake-open" :disabled="quests.sleeping.value.length === 0"
          @click="quests.openWake()">
          <i class="fad fa-sunrise" aria-hidden="true"></i>
          <span>{{ quests.sleeping.value.length === 0 ? "Every quest is awake" : "Wake quests" }}</span>
          <span class="wake-count" v-if="quests.sleeping.value.length > 0">{{ quests.sleeping.value.length }} asleep</span>
        </button>
      </div>
    </ion-footer>

    <TempleWakeSheet :is-open="quests.showWake.value" :sleeping="quests.sleeping.value" :covered="quests.covered.value"
      :heroes="quests.heroOptions.value" :picked-heroes="quests.pickedHeroes.value" :ticked="quests.ticked.value"
      :report="quests.report.value" :problem="quests.problem.value" :waking="quests.waking.value"
      :confirm-text="quests.confirmText.value" @close="quests.closeWake()" @toggle-hero="quests.toggleHero"
      @toggle-tick="quests.toggleTick" @tick-all="quests.setAllTicks" @wake="quests.confirmWake()" />
  </ion-page>
</template>

<script lang="ts">
import { defineComponent, computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import {
  IonPage,
  IonContent,
  IonIcon,
  IonGrid,
  IonRow,
  IonCol,
  IonAccordionGroup,
  IonAccordion,
  IonItem,
  IonLabel,
  IonFooter,
  onIonViewDidEnter,
} from "@ionic/vue";
import { skullOutline } from "ionicons/icons";
import { TempleBeast } from "../../hooks/useTempleData";
import TempleBeastPortrait from "./TempleBeastPortrait.vue";
import XpCoordBadge from "@/components/atoms/Coord/XpCoordBadge.vue";
import { TempleDataInjectionKey } from "../../hooks/useTempleData";
import { inject, onMounted } from "vue";
import type { QuestTier } from "@/lib/services/temples/questRooms";
import type { QuestLayout } from "@/lib/services/temples/templeQuestRows";
import { useTempleQuests } from "../../hooks/useTempleQuests";
import { useBeastRoomActions, usePendingBeastScroll } from "../../hooks/useTempleBeastsTab";
import TempleQuestsHeader from "../quests/TempleQuestsHeader.vue";
import TempleQuestRowCard from "../quests/TempleQuestRowCard.vue";
import TempleWakeSheet from "../quests/TempleWakeSheet.vue";

/** How a tier is titled, drawn, and how wide its classic cards are */
interface TierDisplay {
  id: QuestTier;
  title: string;
  icon: string;
  placeholderIcon: string;
  placeholderLabel: string;
  colSize: string;
  colMd: string;
  colLg: string;
  small: boolean;
}

/** The three tiers, boss first: how each is titled, drawn, and how wide its classic cards are */
const TIERS: TierDisplay[] = [
  { id: "boss", title: "Bosses", icon: "fa-crown", placeholderIcon: "fa-crown fa-3x", placeholderLabel: "Boss Room", colSize: "6", colMd: "4", colLg: "3", small: false },
  { id: "miniboss", title: "Minibosses", icon: "fa-helmet-battle", placeholderIcon: "fa-helmet-battle fa-3x", placeholderLabel: "Miniboss", colSize: "6", colMd: "4", colLg: "3", small: false },
  { id: "monster", title: "Monsters", icon: "fa-skull", placeholderIcon: "fa-skull fa-2x", placeholderLabel: "Monster", colSize: "4", colMd: "3", colLg: "2", small: true },
];

export default defineComponent({
  name: "xp-temple-beasts",
  components: {
    IonPage,
    IonContent,
    IonIcon,
    IonGrid,
    IonRow,
    IonCol,
    IonAccordionGroup,
    IonAccordion,
    IonItem,
    IonLabel,
    IonFooter,
    TempleBeastPortrait,
    XpCoordBadge,
    TempleQuestsHeader,
    TempleQuestRowCard,
    TempleWakeSheet,
  },
  setup() {
    const route = useRoute();
    const templeId = route.params.templeId as string;

    // Inject shared temple data from XpTempleSettings
    const { templeBeastsWithDetails, temple, saveTemple, allBeasts } = inject(
      TempleDataInjectionKey
    )!;

    const { openRoom: navigateToRoom, openBeastSelector } = useBeastRoomActions(templeId, temple, saveTemple);

    // The quest rooms: rows, size, status dots, and Wake quests
    const layout = computed(() => temple.value.dungeonLayout as QuestLayout | undefined);
    const quests = useTempleQuests(templeId, layout, allBeasts);
    const view = computed(() => quests.view.value);

    // Quest rooms are listed as quests; only the classic beast rooms keep the old cards
    const questSymbols = computed(() => new Set(view.value.rows.map((row) => row.symbol)));

    const classicEntries = (tier: QuestTier): TempleBeast[] =>
      templeBeastsWithDetails.value.filter((b) => b.tier === tier && !questSymbols.value.has(b.roomSymbol));

    const roomCount = (tier: QuestTier): number => view.value.groups[tier].length + classicEntries(tier).length;

    // The tiers with any room in them, each an accordion
    const shownTiers = computed(() => TIERS.filter((tier) => roomCount(tier.id) > 0));
    const totalRooms = computed(() => TIERS.reduce((sum, tier) => sum + roomCount(tier.id), 0));
    const hasRooms = computed(() => totalRooms.value > 0);

    const activeTiers = ref<string[]>([]);

    const updateDefaultTiers = () => {
      activeTiers.value = TIERS.filter((tier) => roomCount(tier.id) > 0).map((tier) => tier.id);
    };

    // The rooms arrive after the tab does (the temple, then the quests): open every tier once they are in, unless the
    // Game Master has already opened or closed some
    const hasChosenTiers = ref(false);
    watch(totalRooms, (rooms) => {
      const isFirstFill = rooms > 0 && activeTiers.value.length === 0 && !hasChosenTiers.value;
      if (isFirstFill) updateDefaultTiers();
    });

    const onAccordionChange = (ev: CustomEvent) => {
      hasChosenTiers.value = true;
      activeTiers.value = Array.isArray(ev.detail.value)
        ? ev.detail.value
        : [ev.detail.value].filter(Boolean);
    };

    const { showPendingRoom } = usePendingBeastScroll({ activeTiers, templeBeastsWithDetails, updateDefaultTiers });

    onIonViewDidEnter(() => {
      showPendingRoom();
      // A quest edited in the Compendium since the tab last showed changes its row and its dots
      void quests.load();
    });

    onMounted(() => {
      if (activeTiers.value.length === 0) {
        updateDefaultTiers();
      }
      void quests.load();
    });

    return {
      quests,
      view,
      TIERS,
      shownTiers,
      activeTiers,
      onAccordionChange,
      classicEntries,
      roomCount,
      totalRooms,
      hasRooms,
      openBeastSelector,
      navigateToRoom,
      skullOutline,
    };
  },
});
</script>

<style lang="scss" scoped src="./_XpTempleBeasts.scss" />

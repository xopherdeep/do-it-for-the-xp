<template>
  <div class="th-packs">
    <!-- The family's own packs the site does not have yet come first -->
    <town-hall-waiting :posts="waitingPacks" @dismiss="emit('dismiss', $event)" @edit="emit('edit', $event)" />

    <ion-card class="th-packs__share" data-cy="th-packs-share">
      <ion-card-header>
        <ion-card-title>Pack Exchange</ion-card-title>
        <ion-card-subtitle>Quest and reward sets other families made</ion-card-subtitle>
      </ion-card-header>
      <ion-card-content>
        <p>Load one with a tap, or share yours. Each pack is checked by the Town Hall before it goes up.</p>
        <ion-button size="small" color="rpg" :disabled="isBusy || sharing" data-cy="th-pack-share" @click="share">
          Share your family's pack
        </ion-button>
      </ion-card-content>
    </ion-card>

    <xp-loading v-if="isLoading && !shared.length" />

    <ion-card v-else-if="failed && !shared.length" class="th-late" data-cy="th-late">
      <ion-card-content class="ion-text-center">
        <p>The Pack Exchange hasn't arrived.</p>
        <ion-button size="small" color="rpg" @click="reload">Try again</ion-button>
      </ion-card-content>
    </ion-card>

    <ion-card v-else-if="!board" data-cy="th-packs-closed">
      <ion-card-content class="ion-text-center">
        The Pack Exchange isn't open at the Town Hall yet. Save your pack as a file in Settings > Packs to share it meanwhile.
      </ion-card-content>
    </ion-card>

    <template v-else>
      <ion-card v-if="!shared.length && !isLoading" data-cy="th-packs-empty">
        <ion-card-content class="ion-text-center">No packs shared yet. Yours could be the first.</ion-card-content>
      </ion-card>

      <template v-for="item in shared" :key="item.topic.id">
        <xp-pack-card
          v-if="item.pack"
          class="th-packs__pack"
          :pack="item.pack"
          :status="statusOf(item.pack)"
          :busy="isBusy"
          :removable="false"
          load-label="Get pack"
          @load="confirmLoad"
        >
          <template #before>
            <p class="th-packs__by">Shared by {{ item.topic.author }} &middot; {{ formatTownDate(item.topic.date) }}</p>
          </template>
        </xp-pack-card>
        <ion-card v-else class="th-packs__broken" data-cy="th-pack-broken">
          <ion-card-header>
            <ion-card-subtitle>{{ item.topic.author }} &middot; {{ formatTownDate(item.topic.date) }}</ion-card-subtitle>
            <ion-card-title v-html="sanitizeHtml(item.topic.title)"></ion-card-title>
          </ion-card-header>
          <ion-card-content>{{ item.problem }}</ion-card-content>
        </ion-card>
      </template>

      <ion-button v-if="hasMore && !isLoading" class="th-more" expand="block" fill="outline" color="rpg" data-cy="th-more" @click="loadMore">
        Older packs
      </ion-button>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { IonButton, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle, alertController } from "@ionic/vue";
import XpLoading from "@/components/molecules/Loading/XpLoading.vue";
import XpPackCard from "@/components/molecules/PackCard/XpPackCard.vue";
import { usePackLibrary } from "@/hooks/usePackLibrary";
import { packShareText, readPackBlock } from "@/lib/services/core/packs/packShare";
import type { XpPack } from "@/lib/services/core/packs/packFormat";
import { packSummary } from "@/lib/services/core/packs/packService";
import { fetchBoards, fetchTopics, type BoardInfo, type TopicItem } from "@/lib/services/townhall/townHallFeed";
import type { PostDraft } from "@/lib/services/townhall/townHallPosts";
import { PACK_EXCHANGE_BOARD } from "@/lib/services/townhall/townHallSite";
import type { TownHallPost } from "@/lib/services/townhall/townHallTypes";
import { dialogMessage } from "@/lib/utils/dialogMessage";
import { sanitizeHtml } from "@/lib/utils/sanitizeHtml";
import TownHallWaiting from "./TownHallWaiting.vue";
import { formatTownDate } from "./townHallShared";
import { useTownHallLoad } from "./useTownHallLoad";

/**
 * The Pack Exchange: the packs families shared on the site's pack-exchange board, each read out of its topic
 * (packShare.ts) and loaded with the same confirm as a built-in pack. Sharing builds the family's own pack and hands
 * it to the page's posting desk, so it waits, sends and is told about like any other post.
 */
interface PacksProps {
  waiting: TownHallPost[];
  /** The posting desk's sharePack: what stopped the post being kept, or null */
  sharePack: (draft: PostDraft) => Promise<string | null>;
}
interface PacksEmits {
  (event: "trouble"): void;
  (event: "dismiss", id: string): void;
  (event: "edit", post: TownHallPost): void;
}

interface SharedPack {
  topic: TopicItem;
  pack: XpPack | null;
  problem: string;
}

const props = defineProps<PacksProps>();
const emit = defineEmits<PacksEmits>();

const { isBusy, statusOf, refresh, confirmLoad, askOwnPack, showFailed } = usePackLibrary();
const board = ref<BoardInfo<typeof PACK_EXCHANGE_BOARD> | null>(null);
const shared = ref<SharedPack[]>([]);
const page = ref(1);
const hasMore = ref(false);
const sharing = ref(false);
const { isLoading, failed, run } = useTownHallLoad(() => emit("trouble"));

const waitingPacks = computed(() => props.waiting.filter((post) => post.board === PACK_EXCHANGE_BOARD));

const toShared = (topic: TopicItem): SharedPack => {
  try {
    return { topic, pack: readPackBlock(topic.content), problem: "" };
  } catch (error) {
    return { topic, pack: null, problem: `This pack can't be read: ${error instanceof Error ? error.message : String(error)}` };
  }
};

const loadPage = async (next: number) => {
  const current = board.value;
  if (!current) {
    shared.value = [];
    hasMore.value = false;
    return;
  }
  const result = await fetchTopics(current.id, next);
  const items = result.items.map(toShared);
  shared.value = next === 1 ? items : [...shared.value, ...items];
  page.value = next;
  hasMore.value = next < result.totalPages;
};

const reload = () =>
  run(async () => {
    const [found] = await fetchBoards({}, [PACK_EXCHANGE_BOARD] as const);
    board.value = found ?? null;
    await Promise.all([loadPage(1), refresh()]);
  });
const loadMore = () => run(() => loadPage(page.value + 1));

const confirmShare = async (pack: XpPack): Promise<boolean> =>
  new Promise((resolve) => {
    alertController
      .create({
        header: `Share ${pack.name}?`,
        cssClass: "rpg-alert",
        message: dialogMessage({
          lead: pack.description,
          groups: [{ title: "Shares", tone: "add", lines: [packSummary(pack)] }],
          note: "It goes up once the Town Hall has checked it. No heroes, logs or passcodes are in it.",
        }),
        buttons: [
          { text: "Cancel", role: "cancel" },
          { text: "Share", role: "confirm" },
        ],
      })
      .then(async (alert) => {
        void alert.onDidDismiss().then(({ role }) => resolve(role === "confirm"));
        await alert.present();
      });
  });

const share = async () => {
  sharing.value = true;
  try {
    const pack = await askOwnPack("Share your family's pack", "Next");
    if (!pack) return;
    const isConfirmed = await confirmShare(pack);
    if (!isConfirmed) return;
    const problem = await props.sharePack({
      kind: "topic",
      board: PACK_EXCHANGE_BOARD,
      title: pack.name,
      body: pack.description,
      pack: packShareText(pack),
    });
    if (problem) await showFailed("The pack wasn't shared", new Error(problem));
  } finally {
    sharing.value = false;
  }
};

onMounted(reload);
defineExpose({ reload });
</script>

<style lang="scss" scoped>
.th-packs {
  &__by {
    margin-bottom: 6px;
    font-size: 0.85em;
    opacity: 0.8;
  }

  // XpPackCard drops the theme's card margin for the Settings grid; the tab lists its cards like the Board does
  &__pack {
    margin: 16px auto !important;
  }
}
</style>

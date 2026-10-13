<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <xp-back-button></xp-back-button>
          <ion-icon :icon="businessOutline" slot="icon-only" />
        </ion-buttons>
        <ion-title> Town Hall </ion-title>
      </ion-toolbar>
      <ion-segment v-model="selectedTab">
        <ion-segment-button value="news">
          <ion-label>News</ion-label>
          <ion-icon :icon="newspaperOutline"></ion-icon>
        </ion-segment-button>
        <ion-segment-button value="events">
          <ion-label>Events</ion-label>
          <ion-icon :icon="calendarOutline"></ion-icon>
        </ion-segment-button>
        <ion-segment-button value="updates">
          <ion-label>Updates</ion-label>
          <ion-icon :icon="megaphoneOutline"></ion-icon>
        </ion-segment-button>
      </ion-segment>
    </ion-header>

    <ion-content>
      <xp-loading v-if="isLoading" />

      <div v-else class="ion-padding">
        <!-- News Tab -->
        <div v-if="selectedTab === 'news'">
          <ion-card v-if="error" color="danger">
            <ion-card-header>
              <ion-card-title>Error</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <p>{{ error }}</p>
              <ion-button @click="fetchWordPressPosts">Try Again</ion-button>
            </ion-card-content>
          </ion-card>

          <ion-card v-for="news in newsItems" :key="news.id">
            <div v-if="news.featured_media_url" class="news-image-container">
              <ion-img :src="news.featured_media_url" alt="Featured image"></ion-img>
            </div>
            <ion-card-header>
              <ion-card-subtitle>{{ formatDate(news.date) }}</ion-card-subtitle>
              <ion-card-title v-html="sanitizeHtml(news.title.rendered)"></ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <div v-html="sanitizeHtml(news.excerpt.rendered)"></div>
              <ion-button size="small" fill="clear" @click="openPost(news.link)">
                Read more
                <ion-icon slot="end" :icon="arrowForwardOutline"></ion-icon>
              </ion-button>
              <div class="categories-container" v-if="news.categories_names && news.categories_names.length">
                <ion-chip v-for="category in news.categories_names" :key="category" color="secondary">
                  <ion-label>{{ category }}</ion-label>
                </ion-chip>
              </div>
            </ion-card-content>
          </ion-card>

          <ion-infinite-scroll @ionInfinite="loadMorePosts" threshold="100px" v-if="hasMorePosts">
            <ion-infinite-scroll-content loading-spinner="bubbles" loading-text="Loading more posts...">
            </ion-infinite-scroll-content>
          </ion-infinite-scroll>
        </div>

        <!-- Events Tab: the hero's scheduled quests for the week ahead -->
        <div v-if="selectedTab === 'events'">
          <ion-list v-if="hasEvents">
            <ion-item-group v-for="(events, date) in groupedEvents" :key="date">
              <ion-item-divider sticky>
                <ion-label>{{ date }}</ion-label>
              </ion-item-divider>

              <ion-item v-for="event in events" :key="event.id">
                <ion-label>
                  <h2>{{ event.title }}</h2>
                  <p>{{ event.description }}</p>
                  <ion-note>{{ event.time }}</ion-note>
                </ion-label>
                <ion-badge :color="event.type === 'bounty' ? 'warning' : 'primary'" slot="end">
                  {{ event.type }}
                </ion-badge>
              </ion-item>
            </ion-item-group>
          </ion-list>
          <ion-card v-else>
            <ion-card-content class="ion-text-center">No events posted</ion-card-content>
          </ion-card>
        </div>

        <!-- Updates Tab -->
        <div v-if="selectedTab === 'updates'">
          <ion-card class="stats-card">
            <ion-card-header>
              <ion-card-title>Game Statistics</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <ion-list>
                <ion-item>
                  <ion-label>Heroes</ion-label>
                  <ion-badge color="success" slot="end">{{ stats.heroes }}</ion-badge>
                </ion-item>
                <ion-item>
                  <ion-label>Quests Posted</ion-label>
                  <ion-badge color="tertiary" slot="end">{{ stats.quests }}</ion-badge>
                </ion-item>
                <ion-item>
                  <ion-label>Open Today</ion-label>
                  <ion-badge color="primary" slot="end">{{ stats.openToday }}</ion-badge>
                </ion-item>
                <ion-item>
                  <ion-label>Awaiting Approval</ion-label>
                  <ion-badge color="warning" slot="end">{{ stats.pendingApprovals }}</ion-badge>
                </ion-item>
              </ion-list>
            </ion-card-content>
          </ion-card>

          <ion-card class="patch-notes">
            <ion-card-header>
              <ion-card-title>Latest Updates</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <ion-list>
                <ion-item v-for="update in updates" :key="update.id">
                  <ion-label>
                    <h3>Version {{ update.version }}</h3>
                    <p>{{ update.description }}</p>
                    <ion-text color="medium">
                      <small>{{ update.date }}</small>
                    </ion-text>
                  </ion-label>
                </ion-item>
              </ion-list>
            </ion-card-content>
          </ion-card>
        </div>
      </div>

      <!-- Floating Action Button for Quick Actions -->
      <ion-fab vertical="bottom" horizontal="center" slot="fixed">
        <ion-fab-button color="primary" @click="talkToClerk">
          <ion-icon :icon="addOutline"></ion-icon>
        </ion-fab-button>
      </ion-fab>
    </ion-content>

    <!-- The clerk's dialog: the game's own prompt, not a native sheet or toast -->
    <xp-reveal-prompt :prompt="prompt" @respond="respond" />
  </ion-page>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted } from "vue";
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonIcon,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonBadge,
  IonChip,
  IonList,
  IonItem,
  IonItemDivider,
  IonNote,
  IonFab,
  IonFabButton,
  IonImg,
  IonButton,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
} from "@ionic/vue";
import {
  businessOutline,
  newspaperOutline,
  calendarOutline,
  megaphoneOutline,
  addOutline,
  arrowForwardOutline,
} from "ionicons/icons";
import XpLoading from "@/components/molecules/Loading/XpLoading.vue";
import XpRevealPrompt from "@/components/organisms/RevealPrompt/XpRevealPrompt.vue";
import { useRevealPrompt } from "@/components/organisms/RevealPrompt/useRevealPrompt";
import { useVoice } from "@/hooks/useVoice";
import { CLERK_ERRANDS, clerkMenuPrompt, comingSoonPrompt } from "@/lib/services/hometown/hometownPrompts";
import debug from "@/lib/utils/debug";
import Ionic from "@/lib/mixins/ionic";
import { useUserStore } from "@/lib/store/stores/user";
import { getQuestEngine } from "@/lib/engine/quests/QuestEngine";
import type { QuestBoardItem } from "@/lib/engine/quests/QuestEngine";
import { formatQuestName } from "@/lib/utils/format";
import { sanitizeHtml } from "@/lib/utils/sanitizeHtml";

/** One scheduled quest on the events board */
interface TownEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  type: "quest" | "bounty";
}

/** How many days ahead the events board looks */
const EVENT_HORIZON_DAYS = 7;

// Define the type for Ionic infinite scroll element
declare global {
  interface HTMLElementTagNameMap {
    "ion-infinite-scroll": HTMLIonInfiniteScrollElement;
  }

  interface HTMLIonInfiniteScrollElement extends HTMLElement {
    complete: () => void;
  }
}

interface MediaObject {
  source_url: string;
  [key: string]: any;
}

interface TermObject {
  name: string;
  [key: string]: any;
}

interface WordPressPost {
  id: number;
  date: string;
  title: {
    rendered: string;
  };
  excerpt: {
    rendered: string;
  };
  content: {
    rendered: string;
  };
  link: string;
  featured_media: number;
  featured_media_url?: string;
  categories: number[];
  categories_names?: string[];
  _embedded?: {
    "wp:featuredmedia"?: MediaObject[];
    "wp:term"?: TermObject[][];
    [key: string]: any;
  };
}

export default defineComponent({
  name: "TownHall",
  components: {
    IonPage,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonIcon,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonBadge,
    IonChip,
    IonList,
    IonItem,
    IonItemDivider,
    IonNote,
    IonFab,
    IonFabButton,
    IonImg,
    IonButton,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    XpLoading,
    XpRevealPrompt,
  },
  mixins: [Ionic],
  props: {
    userId: {
      type: String,
      required: true,
    },
  },
  setup(props) {
    const isLoading = ref(false);
    const error = ref<string | null>(null);
    const selectedTab = ref("news");
    const newsItems = ref<WordPressPost[]>([]);
    const currentPage = ref(1);
    const hasMorePosts = ref(true);
    const wpBaseUrl = "https://doit.forthexp.com/wp-json/wp/v2";

    const userStore = useUserStore();
    const questEngine = getQuestEngine();

    // Events: the hero's quests scheduled over the coming week, read from the same board as the quest log
    const events = ref<TownEvent[]>([]);
    const openToday = ref(0);
    const pendingApprovals = ref(0);
    const questsPosted = ref(0);

    const dayKey = (date: Date) => date.toISOString().slice(0, 10);

    const toEvent = (item: QuestBoardItem, date: Date): TownEvent => ({
      id: `${item.quest.id}-${dayKey(date)}`,
      title: formatQuestName(item.quest.achievementName || "Untitled Quest"),
      description: item.pending ? "Awaiting the Game Master's approval" : `${item.quest.xp || 0} XP | ${item.quest.gp || 0} GP`,
      date: dayKey(date),
      time: item.quest.dueByTime ? `Due by ${item.quest.dueByTime}` : "Any time",
      type: questEngine.isOpenBounty(item.quest) ? "bounty" : "quest",
    });

    const loadQuestBoard = async () => {
      try {
        const today = new Date();
        const days = Array.from({ length: EVENT_HORIZON_DAYS }, (_, i) => {
          const d = new Date(today);
          d.setDate(today.getDate() + i);
          return d;
        });
        const [all, ...boards] = await Promise.all([
          questEngine.getAllQuests(),
          ...days.map((d) => questEngine.getQuestBoardForUser(props.userId, d)),
        ]);
        questsPosted.value = all.length;
        const todayBoard = boards[0];
        openToday.value = todayBoard.filter((item) => item.status === "open").length;
        pendingApprovals.value = todayBoard.filter((item) => item.pending).length;
        events.value = boards.flatMap((board, i) =>
          board.filter((item) => item.status !== "notDue").map((item) => toEvent(item, days[i]))
        );
      } catch (err) {
        debug.error("Town Hall could not read the quest board:", err);
        events.value = [];
      }
    };

    const stats = computed(() => ({
      heroes: Object.keys(userStore.users).length,
      quests: questsPosted.value,
      openToday: openToday.value,
      pendingApprovals: pendingApprovals.value,
    }));

    const updates = ref([
      {
        id: 1,
        version: "2.1.0",
        description: "Added new quest line and improved performance",
        date: "2025-04-10",
      },
      // Add more updates...
    ]);

    const fetchWordPressPosts = async () => {
      try {
        isLoading.value = true;
        error.value = null;

        // Fetch posts with featured media and categories
        const response = await fetch(
          `${wpBaseUrl}/posts?_embed=true&per_page=5&page=${currentPage.value}`
        );

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const posts = (await response.json()) as WordPressPost[];

        // Process the posts to extract media URLs and category names
        const processedPosts = posts.map((post) => {
          // Extract featured media URL if available
          const featuredMedia = post._embedded?.["wp:featuredmedia"]?.[0];
          if (featuredMedia) {
            post.featured_media_url = featuredMedia.source_url;
          }

          // Extract category names if available
          const categoryTerms = post._embedded?.["wp:term"]?.[0];
          if (categoryTerms) {
            post.categories_names = categoryTerms.map((term) => term.name);
          }

          return post;
        });

        // If first page, replace existing posts, otherwise append
        if (currentPage.value === 1) {
          newsItems.value = processedPosts;
        } else {
          newsItems.value = [...newsItems.value, ...processedPosts];
        }

        // Check if there are more posts to load
        const totalPages = response.headers.get("X-WP-TotalPages");
        hasMorePosts.value = totalPages
          ? currentPage.value < parseInt(totalPages)
          : false;

        debug.log("WordPress posts loaded:", processedPosts);
      } catch (err) {
        error.value = `Failed to load news: ${err instanceof Error ? err.message : "Unknown error"
          }`;
        debug.error("Error fetching WordPress posts:", err);
      } finally {
        isLoading.value = false;
      }
    };

    const loadMorePosts = async (event: CustomEvent) => {
      currentPage.value++;
      await fetchWordPressPosts();

      // Complete the infinite scroll event
      // eslint-disable-next-line no-undef
      (event.target as HTMLIonInfiniteScrollElement).complete();
    };

    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(date);
    };

    const openPost = (url: string) => {
      window.open(url, "_blank");
    };

    const groupedEvents = computed(() => {
      // Group events by date
      return events.value.reduce((groups: Record<string, TownEvent[]>, event) => {
        (groups[event.date] ||= []).push(event);
        return groups;
      }, {});
    });
    const hasEvents = computed(() => events.value.length > 0);

    // The clerk takes the errand in the game's own dialog; the board cannot post any of them yet
    const reveal = useRevealPrompt();
    const { voice } = useVoice();
    const talkToClerk = async () => {
      const pick = await reveal.ask(clerkMenuPrompt(voice.value));
      if (pick === "never") return;
      const what = CLERK_ERRANDS[pick as keyof typeof CLERK_ERRANDS];
      if (what) await reveal.ask(comingSoonPrompt(what, voice.value));
    };

    // Fetch WordPress posts when component is mounted
    onMounted(() => {
      fetchWordPressPosts();
      loadQuestBoard();
    });

    return {
      isLoading,
      error,
      selectedTab,
      newsItems,
      hasMorePosts,
      groupedEvents,
      hasEvents,
      stats,
      updates,
      fetchWordPressPosts,
      loadMorePosts,
      formatDate,
      openPost,
      talkToClerk,
      prompt: reveal.prompt,
      respond: reveal.respond,
      // Icons
      businessOutline,
      newspaperOutline,
      calendarOutline,
      megaphoneOutline,
      addOutline,
      arrowForwardOutline,
      sanitizeHtml,
    };
  },
});
</script>

<style lang="scss" scoped>
.stats-card {
  margin-bottom: 1rem;
}

.patch-notes {
  margin-bottom: 4rem;
}

ion-segment {
  --background: var(--ion-color-primary);

  ion-segment-button {
    --color: var(--ion-color-light);
    --color-checked: var(--ion-color-primary);
    --background-checked: var(--ion-color-light);
  }
}

ion-card {
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

ion-chip {
  margin: 4px;
}

.news-image-container {
  width: 100%;
  height: 200px;
  overflow: hidden;

  ion-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.categories-container {
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
}

:deep(.wp-block-image img) {
  max-width: 100%;
  height: auto;
}
</style>

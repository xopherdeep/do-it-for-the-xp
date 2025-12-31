<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button :default-href="`/my-portal/${userId}/my-home`"></ion-back-button>
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
              <ion-card-title v-html="news.title.rendered"></ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <div v-html="news.excerpt.rendered"></div>
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

        <!-- Events Tab -->
        <div v-if="selectedTab === 'events'">
          <ion-list>
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
                <ion-badge :color="event.type === 'special' ? 'warning' : 'primary'" slot="end">
                  {{ event.type }}
                </ion-badge>
              </ion-item>
            </ion-item-group>
          </ion-list>
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
                  <ion-label>Active Players</ion-label>
                  <ion-badge color="success" slot="end">{{
                    stats.activePlayers
                    }}</ion-badge>
                </ion-item>
                <ion-item>
                  <ion-label>Total XP Earned Today</ion-label>
                  <ion-badge color="warning" slot="end">{{
                    stats.dailyXP
                    }}</ion-badge>
                </ion-item>
                <ion-item>
                  <ion-label>Active Quests</ion-label>
                  <ion-badge color="tertiary" slot="end">{{
                    stats.activeQuests
                    }}</ion-badge>
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
        <ion-fab-button color="primary" @click="presentActionSheet">
          <ion-icon :icon="addOutline"></ion-icon>
        </ion-fab-button>
      </ion-fab>
    </ion-content>
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
  IonBackButton,
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
  actionSheetController,
} from "@ionic/vue";
import {
  businessOutline,
  newspaperOutline,
  calendarOutline,
  megaphoneOutline,
  addOutline,
  bugOutline,
  bulbOutline,
  arrowForwardOutline,
} from "ionicons/icons";
import XpLoading from "@/components/molecules/Loading/XpLoading.vue";
import debug from "@/lib/utils/debug";
import Ionic from "@/lib/mixins/ionic";

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
    IonBackButton,
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
  },
  mixins: [Ionic],
  props: {
    userId: {
      type: String,
      required: true,
    },
  },
  setup() {
    const isLoading = ref(false);
    const error = ref<string | null>(null);
    const selectedTab = ref("news");
    const newsItems = ref<WordPressPost[]>([]);
    const currentPage = ref(1);
    const hasMorePosts = ref(true);
    const wpBaseUrl = "https://doit.forthexp.com/wp-json/wp/v2";

    // Event and update data - Replace with actual API calls in the future
    const events = ref([
      {
        id: 1,
        title: "Double XP Weekend",
        description: "Earn double XP on all activities!",
        date: "2025-04-13",
        time: "All Day",
        type: "special",
      },
      // Add more events...
    ]);

    const stats = ref({
      activePlayers: 1234,
      dailyXP: "150,000",
      activeQuests: 45,
    });

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
          if (
            post._embedded &&
            post._embedded["wp:featuredmedia"] &&
            post._embedded["wp:featuredmedia"][0]
          ) {
            post.featured_media_url =
              post._embedded["wp:featuredmedia"][0].source_url;
          }

          // Extract category names if available
          if (
            post._embedded &&
            post._embedded["wp:term"] &&
            post._embedded["wp:term"][0]
          ) {
            post.categories_names = post._embedded["wp:term"][0].map(
              (term) => term.name
            );
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
      return events.value.reduce((groups: any, event) => {
        const date = event.date;
        if (!groups[date]) {
          groups[date] = [];
        }
        groups[date].push(event);
        return groups;
      }, {});
    });

    const submitAnnouncement = () => {
      // Implement announcement submission
      debug.log("Submit announcement");
    };

    const reportBug = () => {
      // Implement bug reporting
      debug.log("Report bug");
    };

    const suggestFeature = () => {
      // Implement feature suggestion
      debug.log("Suggest feature");
    };

    const presentActionSheet = async () => {
      const actionSheet = await actionSheetController.create({
        header: "Town Hall Actions",
        mode: "ios",
        buttons: [
          {
            text: "Submit Announcement",
            icon: megaphoneOutline,
            handler: submitAnnouncement,
          },
          {
            text: "Report Bug",
            icon: bugOutline,
            handler: reportBug,
          },
          {
            text: "Suggest Feature",
            icon: bulbOutline,
            handler: suggestFeature,
          },
          {
            text: "Cancel",
            icon: "close",
            role: "cancel",
          },
        ],
      });

      await actionSheet.present();
    };

    // Fetch WordPress posts when component is mounted
    onMounted(() => {
      fetchWordPressPosts();
    });

    return {
      isLoading,
      error,
      selectedTab,
      newsItems,
      hasMorePosts,
      groupedEvents,
      stats,
      updates,
      fetchWordPressPosts,
      loadMorePosts,
      formatDate,
      openPost,
      submitAnnouncement,
      reportBug,
      suggestFeature,
      presentActionSheet,
      // Icons
      businessOutline,
      newspaperOutline,
      calendarOutline,
      megaphoneOutline,
      addOutline,
      bugOutline,
      bulbOutline,
      arrowForwardOutline,
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

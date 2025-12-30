<template>
  <xp-rpg-page
    :title="'Quests (' + achievements?.length + ')'"
    header-icon="fa-hand-holding-seedling"
  >
    <template #actions>
      <!-- <ion-button @click="clickFilter">
            <i class="fad fa-filter fa-lg" />
          </ion-button> -->
      <ion-button
        fill="clear"
        :color="viewMode === 'list' ? 'primary' : 'medium'"
        @click="setViewMode('list')"
      >
        <i class="fad fa-list fa-lg" />
      </ion-button>
      <ion-button
        fill="clear"
        :color="viewMode === 'grid' ? 'primary' : 'medium'"
        @click="setViewMode('grid')"
      >
        <i class="fal fa-th-large fa-lg" />
      </ion-button>
      <ion-button @click="clickSettings">
        <i class="fad fa-cog fa-2x" />
      </ion-button>
      <ion-button id="popover-button">
        <i class="fad fa-eye fa-2x" />
      </ion-button>
      <ion-popover
        trigger="popover-button"
        :dismiss-on-select="true"
      >
        <ion-content>
          <ion-list>
            <ion-item
              :button="true"
              :detail="false"
              @click="showPoints = !showPoints"
            >
              <i
                class="fad fa-ring fa-lg mr-3"
                slot="start"
              />

              <ion-label slot="start"> Points </ion-label>
              <ion-checkbox
                v-model="showPoints"
                @click.stop
                slot="end"
              >
              </ion-checkbox>
            </ion-item>
            <ion-item
              :button="true"
              :detail="false"
              @click="showPoints = !showPoints"
            >
              <i
                class="fad fa-clipboard-check fa-lg mr-3"
                slot="start"
              />
              <ion-label> Requires Approval </ion-label>
              <ion-checkbox
                slot="end"
                @click.stop
              > </ion-checkbox>
            </ion-item>
            <ion-item
              :button="true"
              :detail="false"
              @click="showPoints = !showPoints"
            >
              <i
                class="fad fa-gift fa-lg mr-3"
                slot="start"
              />

              <ion-label> Bonus Chore </ion-label>

              <ion-checkbox
                slot="end"
                @click.stop
              > </ion-checkbox>
            </ion-item>
            <ion-popover
              trigger="nested-trigger"
              :dismiss-on-select="true"
              side="end"
            >
              <ion-content>
                <ion-list>
                  <ion-item
                    :button="true"
                    :detail="false"
                  >
                    Nested option
                  </ion-item>
                </ion-list>
              </ion-content>
            </ion-popover>
          </ion-list>
        </ion-content>
      </ion-popover>
    </template>

    <template #secondary-toolbar>
      <ion-toolbar color="light">
        <ion-grid>
          <ion-row>
            <ion-col class="ion-no-padding">
              <ion-searchbar
                color="light"
                v-model="searchText"
              ></ion-searchbar>
            </ion-col>
          </ion-row>
        </ion-grid>
        <ion-buttons slot="end">
        </ion-buttons>
      </ion-toolbar>
    </template>

    <!-- Empty State -->
    <div
      v-if="!hasAchievements"
      class="empty-state-wrapper"
    >
      <div class="glass-card empty-state">
        <i
          :class="emptyStateIcon"
          class="empty-icon"
        ></i>
        <h2>{{ emptyStateTitle }}</h2>
        <p>{{ emptyStateMessage }}</p>
        <ion-button
          v-if="groupBy === 'category' || groupBy === 'asNeeded'"
          fill="outline"
          color="rpg"
          @click="clickAdd"
        >
          <i class="fad fa-plus mr-2" />
          Create Quest
        </ion-button>
      </div>
    </div>

    <!-- Grid View -->
    <div
      v-else-if="viewMode === 'grid'"
      class="quest-grid"
    >
      <ion-grid>
        <ion-row>
          <ion-col
            size="6"
            size-md="4"
            size-lg="3"
            v-for="achievement in flatAchievements"
            :key="achievement.id"
          >
            <div
              class="quest-card glass-card"
              :class="{ 'is-expired': new Date(achievement.endsOn) < new Date() }"
              @click="clickEdit(achievement.id)"
            >
              <div class="quest-card-avatar">
                <!-- Beast Preview -->
                <template v-if="achievement.adventureType === 'beast'">
                  <ion-img
                    v-if="getBeastAvatar(achievement)"
                    :src="getBeastAvatar(achievement)"
                  />
                  <i
                    v-else
                    class="fad fa-paw-claws fa-3x fallback-icon"
                  />
                </template>

                <!-- Custom/Achievement Image -->
                <ion-img
                  v-else-if="achievement.imageUrl"
                  :src="achievement.imageUrl"
                />

                <!-- Combo Icon Fallback -->
                <i
                  v-else
                  :class="getAchievementTypeIcon(achievement)"
                  class="fallback-icon"
                />
              </div>
              <div class="quest-card-content">
                <h3 v-html="formatQuestName(achievement.achievementName)" />
                <p class="category-label">{{ getCategoryById(achievement.categoryId)?.name || 'Uncategorized' }}</p>
              </div>
              <div class="quest-card-rewards">
                <ion-badge
                  color="danger"
                  v-if="achievement.ap > 0"
                >
                  <i class="fad fa-hand-holding-magic mr-1" />{{ achievement.ap }}
                </ion-badge>
                <ion-badge
                  color="warning"
                  v-if="achievement.gp > 0"
                >
                  <i class="fad fa-hand-holding-usd mr-1" /><xp-gp :gp="achievement.gp" />
                </ion-badge>
                <ion-badge
                  color="success"
                  v-if="achievement.xp > 0"
                >
                  <i class="fad fa-hand-holding-seedling mr-1" />{{ achievement.xp }}
                </ion-badge>
              </div>
            </div>
          </ion-col>
        </ion-row>
      </ion-grid>
    </div>

    <!-- List View -->
    <div
      v-else
      class="quest-list-wrapper"
    >
      <!-- Accordion View for By Assignee -->
      <ion-accordion-group
        v-if="groupBy === 'assignee'"
        :multiple="true"
      >
        <ion-accordion
          v-for="(group, index) in groupedAchievements"
          :key="index"
          :value="`assignee-${index}`"
          class="assignee-accordion"
        >
          <ion-item
            slot="header"
            class="assignee-header"
          >
            <ion-avatar class="assignee-avatar">
              <ion-img :src="$getUserAvatar(getAssigneeById(group.assignee))" />
            </ion-avatar>
            <ion-label>
              <h2>{{ getAssigneeById(group.assignee)?.name.full || 'Unassigned' }}</h2>
              <p>{{ group.achievements.length }} quest{{ group.achievements.length !== 1 ? 's' : '' }}</p>
            </ion-label>
          </ion-item>

          <div
            slot="content"
            class="accordion-content"
          >
            <ion-list>
              <ion-item-sliding
                v-for="(achievement, idx) in group.achievements"
                :key="idx"
              >
                <xp-achievement-item
                  :achievement="achievement"
                  :categories="categories"
                  :beasts="beasts"
                  :show-points="showPoints"
                  :disabled="new Date(achievement.endsOn) < new Date()"
                />
                <ion-item-options side="start">
                  <ion-item-option
                    color="danger"
                    @click="clickDeleteAchievement(achievement)"
                  >
                    <i class="fad fa-fire fa-lg mx-1"></i>
                    Remove
                  </ion-item-option>
                </ion-item-options>
                <ion-item-options side="end">
                  <ion-item-option @click="clickEdit(achievement.id)">
                    <i class="fa fad fa-treasure-chest fa-lg mx-2"></i>
                    Edit
                  </ion-item-option>
                  <ion-item-option @click="clickCloneAchievement(achievement)">
                    <i class="fa fad fa-swords fa-lg mx-2"></i>
                    Copy
                  </ion-item-option>
                </ion-item-options>
              </ion-item-sliding>
            </ion-list>
          </div>
        </ion-accordion>
      </ion-accordion-group>

      <!-- Regular List View for Other Groupings -->
      <ion-list v-else>
        <ion-item-group
          v-for="(group, index) in groupedAchievements"
          :key="index"
        >
          <ion-item-divider>
            <ion-label>
              {{ getCategoryById(group.categoryId)?.name || 'Uncategorized' }}
            </ion-label>
          </ion-item-divider>
          <ion-item-sliding
            v-for="(achievement, idx) in group.achievements"
            :key="idx"
          >
            <xp-achievement-item
              :achievement="achievement"
              :categories="categories"
              :beasts="beasts"
              :show-points="showPoints"
              :disabled="new Date(achievement.endsOn) < new Date()"
            />
            <ion-item-options side="start">
              <ion-item-option
                color="danger"
                @click="clickDeleteAchievement(achievement)"
              >
                <i class="fad fa-fire fa-lg mx-1"></i>
                Remove
              </ion-item-option>
            </ion-item-options>
            <ion-item-options side="end">
              <ion-item-option @click="clickEdit(achievement.id)">
                <i class="fa fad fa-treasure-chest fa-lg mx-2"></i>
                Edit
              </ion-item-option>
              <ion-item-option @click="clickCloneAchievement(achievement)">
                <i class="fa fad fa-swords fa-lg mx-2"></i>
                Copy
              </ion-item-option>
            </ion-item-options>
          </ion-item-sliding>
        </ion-item-group>
      </ion-list>
    </div>
    <ion-fab
      slot="fixed"
      vertical="bottom"
      horizontal="center"
    >
      <ion-fab-button
        @click="presentActionSheet"
        color="rpg"
      >
        <i class="fad fa-hand-holding-seedling fa-2x" />
      </ion-fab-button>
    </ion-fab>
    <ion-footer
      class="quest-footer"
      slot="footer"
    >
      <ion-segment v-model="groupBy">
        <ion-segment-button value="category"> By Category </ion-segment-button>
        <ion-segment-button value="assignee"> By Assignee </ion-segment-button>
        <ion-segment-button value="asNeeded"> Bounties </ion-segment-button>
        <ion-segment-button value="expired"> Expired </ion-segment-button>
      </ion-segment>
    </ion-footer>
  </xp-rpg-page>
</template>

<script src="./XpAchievements" lang="ts" />
<style src="./_XpAchievements.scss" lang="scss" scoped />
<style lang="scss" scoped>
  .transparent-content {
    --background: transparent;
    background: transparent;
  }
</style>

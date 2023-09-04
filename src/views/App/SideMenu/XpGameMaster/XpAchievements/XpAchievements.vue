<template>
  <ion-page :class="$options.name">
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/game-master" />
        </ion-buttons>
        <ion-title> {{ achievements?.length }} Achievements </ion-title>
        <ion-buttons slot="end">
          <!-- <ion-button @click="clickFilter">
            <i class="fad fa-filter fa-lg" />
          </ion-button> -->
          <ion-button id="popover-button">
            <i class="fad fa-eye fa-2x" />
          </ion-button>
        </ion-buttons>
        <ion-popover trigger="popover-button" :dismiss-on-select="true">
          <ion-content>
            <ion-list>
              <ion-item
                :button="true"
                :detail="false"
                @click="showPoints = !showPoints"
              >
                <i class="fad fa-ring fa-lg mr-3" slot="start" />

                <ion-label slot="start"> Points </ion-label>
                <ion-checkbox v-model="showPoints" @click.stop slot="end">
                </ion-checkbox>
              </ion-item>
              <ion-item
                :button="true"
                :detail="false"
                @click="showPoints = !showPoints"
              >
                <i class="fad fa-clipboard-check fa-lg mr-3" slot="start" />
                <ion-label> Requires Approval </ion-label>
                <ion-checkbox slot="end" @click.stop> </ion-checkbox>
              </ion-item>
              <ion-item
                :button="true"
                :detail="false"
                @click="showPoints = !showPoints"
              >
                <i class="fad fa-gift fa-lg mr-3" slot="start" />

                <ion-label> Bonus Chore </ion-label>

                <ion-checkbox slot="end" @click.stop> </ion-checkbox>
              </ion-item>
              <ion-popover
                trigger="nested-trigger"
                :dismiss-on-select="true"
                side="end"
              >
                <ion-content>
                  <ion-list>
                    <ion-item :button="true" :detail="false">
                      Nested option
                    </ion-item>
                  </ion-list>
                </ion-content>
              </ion-popover>
            </ion-list>
          </ion-content>
        </ion-popover>
      </ion-toolbar>
      <!-- <ion-toolbar v-if="showFilters">
        <ion-select
          label="Stacked label"
          label-placement="stacked"
          placeholder="Group by..."
          v-model="groupBy"
        >
          <ion-select-option value="category">
            Category
          </ion-select-option>
        </ion-select>
      </ion-toolbar> -->
      <ion-segment v-model="groupBy" mode="ios">
        <ion-segment-button value="category"> By Category </ion-segment-button>
        <ion-segment-button value="assignee"> By Assignee </ion-segment-button>
        <ion-segment-button value="asNeeded"> As Needed </ion-segment-button>
        <ion-segment-button value="expired"> Expired </ion-segment-button>
      </ion-segment>
    </ion-header>

    <ion-content>
      <xp-loading v-if="isLoading" />
      <ion-list v-else>
        <ion-item-group
          v-for="(group, index) in groupedAchievements"
          :key="index"
        >
          <ion-item-divider>
            <ion-label v-if="groupBy === 'assignee'">
              {{ getAssigneeById(group.assignee)?.name.full }}
            </ion-label>
            <ion-label v-else>
              {{ getCategoryById(group.categoryId)?.name }}
            </ion-label>
          </ion-item-divider>
          <ion-item-sliding
            v-for="(achievement, index) in group.achievements"
            :key="index"
          >
            <xp-achievement-item
              :achievement="achievement"
              :categories="categories"
              :show-points="showPoints"
            >
              <template #end>
                <i class="fad fa-grip-vertical ml-2" slot="end" />
              </template>
            </xp-achievement-item>
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
                <!-- Edit -->
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
    </ion-content>

    <ion-fab slot="fixed" vertical="bottom" horizontal="end">
      <ion-fab-button>
        <ion-icon :icon="addOutline" />
      </ion-fab-button>
      <ion-fab-list side="top">
        <ion-fab-button @click="clickAdd">
          <ion-icon :icon="addSharp" />
        </ion-fab-button>
        <ion-fab-button @click="clickDiscover">
          <ion-icon :ios="searchOutline" :md="searchSharp" />
        </ion-fab-button>
        <ion-fab-button>
          <ion-icon :ios="thumbsUpOutline" :md="thumbsUpSharp" />
        </ion-fab-button>
      </ion-fab-list>
    </ion-fab>
    <ion-footer>
      <ion-toolbar color="light">
        <ion-grid>
          <ion-row>
            <ion-col class="ion-no-padding">
              <ion-searchbar color="light" v-model="searchText"></ion-searchbar>
            </ion-col>
          </ion-row>
        </ion-grid>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<script src="./XpAchievements" lang="ts" />
<style src="./_XpAchievements.scss" lang="scss" scoped />

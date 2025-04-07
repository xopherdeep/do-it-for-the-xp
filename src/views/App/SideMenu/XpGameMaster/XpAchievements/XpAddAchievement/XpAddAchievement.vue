<template>
  <ion-page :class="$options.name">
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button :default-href="`/game-master/achievements`"></ion-back-button>
          <!-- <ion-icon :icon="storefrontOutline" slot="icon-only" /> -->
        </ion-buttons>

        <ion-card-title v-if="id">
          Edit Achievement: {{ achievement.achievementName }}
        </ion-card-title>

        <ion-title v-else>
          Create Achievement: {{ achievement.achievementName }}
        </ion-title>
      </ion-toolbar>

      <ion-segment v-model="activeSegment">
        <ion-segment-button v-for="segment in segments" :key="segment.name" :value="segment.name.toLowerCase()">
          {{ segment.name }}
          <i class="fad fa-lg mt-1" :class="segment.icon"></i>
        </ion-segment-button>
      </ion-segment>

    </ion-header>
    <ion-content v-if="activeSegment === 'label'" class="bg-slide p-4">
      <ion-list>
        <ion-item-sliding>
          <ion-item-options side="start">
            <ion-item-option slot="end" @click="openAddCategoryModal" color="success">
              <i class="fad fa-plus fa-lg"></i>
            </ion-item-option>
          </ion-item-options>
          <ion-item>
            <i class="fad fa-grip-vertical my-5 mr-2" slot="start"></i>
            <ion-avatar slot="start">
              <ion-skeleton-text></ion-skeleton-text>
            </ion-avatar>
            <ion-label position="floating"> Category </ion-label>
            <ion-select v-model="achievement.categoryId" placeholder="Choose a category..." mode="ios" :clearInput="true">
              <ion-select-option v-for="(cat, index) in categories" :value="cat.id" :key="index">
                {{ cat.name }}
              </ion-select-option>
            </ion-select>
          </ion-item>
        </ion-item-sliding>
        <ion-item>
          <ion-avatar slot="start">
            <ion-skeleton-text v-if="!achievement.imageUrl">
            </ion-skeleton-text>
            <ion-img :src="achievement?.imageUrl" v-else />
          </ion-avatar>
          <ion-label position="floating"> Name Achievement </ion-label>
          <ion-input v-model="achievement.achievementName" placeholder="Enter Achievement Name"></ion-input>
        </ion-item>
      </ion-list>
    </ion-content>

    <ion-content v-if="activeSegment === 'adventure'" class="bg-slide p-4">
      <ion-card class="hidden">
        <ion-card-content>
          <ion-label>
            <i class="fad fa-map-signs ion-float-right " />
            What type of adventure is this achievement?<br />
            <p class="text-sm">
              {{ activeAdventureType.text }}
            </p>
          </ion-label>
        </ion-card-content>
      </ion-card>
      <ion-list>
        <ion-segment v-model="adventureType">
          <ion-segment-button value="simple" :disabled="achievement.beastId != '' || achievement.subAchievementIds.length
            ">
            Task
          </ion-segment-button>
          <ion-segment-button value="beast" :disabled="achievement.subAchievementIds.length">
            Beast
          </ion-segment-button>
          <ion-segment-button value="quest" :disabled="achievement.beastId != ''">
            Quest
          </ion-segment-button>
        </ion-segment>
        <ion-item v-if="adventureType === 'beast'">
          <i class="fad fa-paw-claws fa-2x mr-3" slot="start"></i>
          <ion-label>
            Choose a Beast
            <p>Attach a beast to this achievement.</p>
          </ion-label>
          <ion-select v-model="achievement.beastId" mode="ios" :clearInput="true">
            <ion-select-option v-for="beast in beasts" :key="beast.id" :value="beast.id">
              {{ beast.name }}
            </ion-select-option>
          </ion-select>
          <ion-buttons slot="end" class="mx-0" v-if="achievement.beastId">
            <ion-button @click="achievement.beastId = ''" color="danger">
              <i class="fad fa-times-circle fa-2x"></i>
            </ion-button>
          </ion-buttons>
        </ion-item>
        <ion-item-sliding v-if="adventureType === 'quest'" :disabled="!achievement.subAchievementIds.length">
          <ion-item-options side="start">
            <ion-item-option @click="clickReorder">
              <i class="fad fa-sort-alt fa-2x mx-2"></i>
            </ion-item-option>
          </ion-item-options>
          <ion-item>
            <i slot="start" class="fad fa-grip-vertical mx-4 mt-5 fa-lg"
              :class="{ hidden: 2 > achievement.subAchievementIds.length }"></i>
            <ion-label position="floating"> Achievement Chain </ion-label>

            <ion-select v-model="achievement.subAchievementIds" :clearInput="true" mode="ios" multiple>
              <ion-select-option v-for="quest in achievements.filter(
                (a) => a.id != achievement.id
              )" :key="quest.id" :value="quest.id">
                {{ quest.achievementName }}
              </ion-select-option>
            </ion-select>
            <ion-buttons v-if="achievement.subAchievementIds.length" slot="end" class="mx-0 mt-4">
              <ion-button @click="achievement.subAchievementIds = []" color="danger">
                <i class="fad fa-times-circle fa-2x"></i>
              </ion-button>
            </ion-buttons>
          </ion-item>
        </ion-item-sliding>
      </ion-list>
    </ion-content>

    <ion-content v-if="activeSegment === 'heros'">
      <ion-card class="hidden">
        <ion-card-content>
          Who are the chosen ones and how shall they embark on this quest?
        </ion-card-content>
      </ion-card>
      <ion-list>
        <ion-item>
          <ion-label position="floating">The Chosen Heros</ion-label>
          <ion-select v-model="achievement.assignee" multiple :disabled="achievement.type === 'asNeeded'" mode="ios">
            <!-- Replace with actual list of users -->
            <ion-select-option v-for="user in users" :key="user.id" :value="user.id">
              {{ user.name.first }}
            </ion-select-option>
          </ion-select>
        </ion-item>
        <ion-list-header> 
          Type of Assignment 
        </ion-list-header>
        <ion-radio-group v-model="achievement.type">
          <ion-item>
            <i slot="end" class="fad fa-2x w-10" :class="achievementTypeIcons['asNeeded']" />
            <ion-label>
              As Needed
              <p>
                For quests open to any brave soul, anytime, <br />
                enjoy the freedom to quickly tackle emerging challenges.
              </p>
            </ion-label>
            <ion-radio value="asNeeded"></ion-radio>
          </ion-item>
          <ion-item>
            <i slot="end" class="fad fa-2x w-10" :class="achievementTypeIcons['collaborate']" />
            <ion-label>
              Collaborate
              <p>
                For quests requiring unity and teamwork.<br />
                Perfect for challenges needing diverse insights.
              </p>
            </ion-label>
            <ion-radio value="collaborate"></ion-radio>
          </ion-item>
          <ion-item>
            <i slot="end" class="fad fa-2x w-10" :class="achievementTypeIcons['compete']" />
            <ion-label>
              Compete
              <p>
                For quests sparking rivalry among heroes.<br />
                Great for boosting performance and involvement.
              </p>
            </ion-label>
            <ion-radio value="compete"></ion-radio>
          </ion-item>
          <ion-item>
            <i slot="end" class="fad fa-2x w-10" :class="achievementTypeIcons['individual']" />
            <ion-label>
              Individual
              <p>
                For quests best tackled alone.<br />
                Ideal for concentrated, solitary endeavors.
              </p>
            </ion-label>
            <ion-radio value="individual"></ion-radio>
          </ion-item>
          <ion-item>
            <i slot="end" class="fad fa-2x w-10" :class="achievementTypeIcons['rotate']" />
            <ion-label>
              Rotate
              <p>
                For quests rotating among heroes.<br />
                Helps share duty and adds diversity.
              </p>
            </ion-label>
            <ion-radio value="rotate"></ion-radio>
          </ion-item>
        </ion-radio-group>
      </ion-list>
    </ion-content>

    <ion-content v-if="activeSegment === 'timer'">
      <ion-card>
        <ion-card-content>
          When shall the quest for this achievement begin and end?
        </ion-card-content>
      </ion-card>
      <ion-list-header> Time Limits </ion-list-header>
      <ion-grid class="ion-no-padding">
        <ion-row>
          <ion-col>
            <ion-item>
              <ion-label>Starts On</ion-label>
              <ion-datetime-button datetime="starts-on" />
            </ion-item>
            <ion-item>
              <ion-label>Ends On</ion-label>
              <ion-buttons slot="end" v-if="!achievement.endsOn">
                <ion-button @click="endsModalOpen = true">
                  Never
                </ion-button>
              </ion-buttons>
              <ion-datetime-button datetime="ends-on" v-else />
            </ion-item>
            <ion-item>
              <ion-label>Due By Time</ion-label>
              <ion-datetime-button display-format="h:mm A" datetime="due-by">
                <!-- <div slot="date-target"><i class="fad fa-clock fa-lg"></i></div> -->
              </ion-datetime-button>
            </ion-item>
          </ion-col>
        </ion-row>
      </ion-grid>
      <ion-list-header> Choose the Occurance </ion-list-header>
      <ion-segment v-model="achievement.basicSchedule" mode="ios">
        <ion-segment-button value="once">
          <i class="fad fa-2x fa-calendar-exclamation my-1" />
          Once
        </ion-segment-button>
        <ion-segment-button value="daily">
          <i class="fad fa-2x fa-calendar-day my-1" />
          Daily
        </ion-segment-button>
        <ion-segment-button value="weekly">
          <i class="fad fa-2x fa-calendar-week my-1" />
          Weekly
        </ion-segment-button>
        <ion-segment-button value="custom">
          <i class="fad fa-2x fa-calendar my-1" />
          Custom
        </ion-segment-button>
      </ion-segment>

      <ion-grid class="ion-no-padding">
        <ion-row v-if="achievement.basicSchedule === 'custom'">
          <ion-col>
            <ion-item>
              <ion-label>Frequency</ion-label>
              <ion-input class="ion-text-right" v-model="achievement.customFrequency" type="number" min="1"></ion-input>
              <ion-label slot="end">time(s)</ion-label>
            </ion-item>
          </ion-col>
          <ion-col>
            <ion-item>
              <ion-label>Every</ion-label>
              <ion-input class="ion-text-right" v-model="achievement.customPeriodNumber" type="number"
                min="1"></ion-input>
              <ion-select label="Interval" placeholder="Interval..." v-model="achievement.customPeriodType" mode="ios">
                <ion-select-option value="day">Day(s)</ion-select-option>
                <ion-select-option value="week">Week(s)</ion-select-option>
                <ion-select-option value="month">Month(s)</ion-select-option>
                <ion-select-option value="year">Year(s)</ion-select-option>
              </ion-select>
            </ion-item>
          </ion-col>
        </ion-row>
      </ion-grid>

      <ion-item v-if="achievement.basicSchedule === 'once'">
        <ion-label>Show daily until complete</ion-label>
        <ion-checkbox v-model="achievement.showDailyUntilComplete"></ion-checkbox>
      </ion-item>
      <ion-item v-if="achievement.basicSchedule === 'weekly'">
        <ion-label>Repeat On:</ion-label>
        <ion-select v-model="achievement.repeatOnDays" placeholder="Which days...?" multiple mode="ios">
          <ion-select-option value="mon">Monday</ion-select-option>
          <ion-select-option value="tue">Tuesday</ion-select-option>
          <ion-select-option value="wed">Wednesday</ion-select-option>
          <ion-select-option value="thu">Thursday</ion-select-option>
          <ion-select-option value="fri">Friday</ion-select-option>
          <ion-select-option value="sat">Saturday</ion-select-option>
          <ion-select-option value="sun">Sunday</ion-select-option>
        </ion-select>
      </ion-item>
    </ion-content>

    <ion-content v-if="activeSegment === 'reward'">
      <ion-card class="hidden">
        <ion-card-content>
          What treasures shall be bestowed for conquering this achievement?
        </ion-card-content>
      </ion-card>
      <ion-list>
        <ion-item>
          <ion-label> Estimated Amount of Effort </ion-label>
          <i slot="end" class="fad fa-2x" :class="difficultyIcon"
            :style="isFibonacci ? { color: 'var(--ion-color-warning)' } : {}" />
          <ion-select v-model="achievement.difficulty" placeholder="Outside Golden Ratio" mode="ios">
            <ion-select-option v-for="effort in efforts" :key="effort.value" :value="effort.value">
              {{ effort.name }}
            </ion-select-option>
          </ion-select>
        </ion-item>
        <ion-item>
          <ion-button :disabled="achievement.difficulty === 1" @click="decreaseDifficulty" color="danger">
            <i class="fas fa-minus"></i>
          </ion-button>
          <ion-range v-model="achievement.difficulty" mode="ios" min="0" max="13" :pin="true" step="1"
            :snaps="isFibonacci" :ticks="isFibonacci" color="warning" @ionChange="updatePoints">
            <ion-label slot="start">
              <p>Min</p>
            </ion-label>
            <ion-label slot="end">
              <p>Max</p>
            </ion-label>
          </ion-range>
          <ion-button :disabled="achievement.difficulty === 13" @click="increaseDifficulty" color="success">
            <i class="fas fa-plus"></i>
          </ion-button>
        </ion-item>
      </ion-list>
      <ion-accordion-group>
        <ion-accordion>
          <ion-item slot="header">
            <ion-label>
              Amount of Points to Award
            </ion-label>
          </ion-item>
          <ion-list slot="content">
            <ion-item-sliding>
              <ion-item-options side="end">
                <ion-item-option color="success">
                  <i class="fad fa-hand-holding-seedling fa-2x" slot="end" />
                  <ion-input slot="end" v-model="achievement.xp" type="number" placeholder="Enter XP"
                    class="ion-text-right"></ion-input>
                  <ion-label slot="end"> XP </ion-label>
                </ion-item-option>
              </ion-item-options>
              <ion-item>
                <i class="fad fa-hand-holding-seedling fa-2x mr-3" slot="start" style="color: var(--ion-color-success)" />
                <ion-label>
                  Experience Points (XP)
                  <p>Motivates and tracks skill growth.</p>
                </ion-label>
                <ion-badge class="ion-float-right text-white px-2" color="success" slot="end">
                  {{ achievement.xp }}
                  <i class="fad fa-hand-holding-seedling ml-2" />
                </ion-badge>
                <i class="fad fa-grip-vertical fa-lg mr-3" slot="end" />
              </ion-item>
            </ion-item-sliding>
            <ion-item-sliding>
              <ion-item-options side="end">
                <ion-item-option color="warning">
                  <i class="fad fa-hand-holding-usd fa-2x" />
                  <ion-input slot="end" v-model="achievement.gp" type="number" class="ion-text-right text-xl"
                    placeholder="Enter GP"></ion-input>
                  <ion-label slot="end"> GP </ion-label>
                </ion-item-option>
              </ion-item-options>
              <ion-item>
                <i class="fad fa-hand-holding-usd fa-2x mr-3" slot="start" style="color: var(--ion-color-warning)" />
                <ion-label>
                  Gold Points (GP)
                  <p>In-app currency, teaching financial literacy.</p>
                </ion-label>
                <ion-badge class="ion-float-right text-sm px-2" color="warning" slot="end">
                  <xp-gp :gp="achievement.gp" />
                  <i class="fad fa-hand-holding-usd ml-2" />
                </ion-badge>
                <i class="fad fa-grip-vertical fa-lg mr-3" slot="end" />
              </ion-item>
            </ion-item-sliding>
            <ion-item-sliding>
              <ion-item-options side="end">
                <ion-item-option color="danger">
                  <i class="fad fa-hand-holding-magic fa-2x" />
                  <ion-input class="ion-text-right text-xl" v-model="achievement.ap" type="number"
                    placeholder="Enter AP"></ion-input>
                  <ion-label slot="end"> AP </ion-label>
                </ion-item-option>
              </ion-item-options>
              <ion-item>
                <i class="fad fa-hand-holding-magic fa-2x mr-3" slot="start" style="color: var(--ion-color-danger)" />
                <ion-label>
                  Ability Points (AP)
                  <p>Unlocks abilities, encourages strategic planning.</p>
                </ion-label>
                <ion-badge class="ion-float-right text-sm px-2" color="danger" slot="end">
                  {{ achievement.ap }}
                  <i class="fad fa-hand-holding-magic ml-2" />
                </ion-badge>
                <i class="fad fa-grip-vertical fa-lg mr-3" slot="end" />
              </ion-item>
            </ion-item-sliding>
          </ion-list>
        </ion-accordion>

        <ion-accordion>
          <ion-item slot="header">
            <ion-label>
              Requirements
            </ion-label>
          </ion-item>
          <ion-list slot="content">
            <ion-item>
              <i class="fad fa-clipboard-check fa-2x w-10 mx-2" slot="start" />
              <ion-label>
                Requires Approval
                <p>
                  Should this achievement require approval before any points <br />
                  are awarded?
                </p>
              </ion-label>
              <ion-checkbox v-model="achievement.requiresApproval"></ion-checkbox>
            </ion-item>
            <ion-item>
              <ion-label>
                Bonus Achievement
                <p>Is this a bonus achievement? I.E. Not a required achievement.</p>
              </ion-label>
              <ion-checkbox v-model="achievement.bonusAchievement"></ion-checkbox>
              <i class="fad fa-gift fa-2x w-10 mx-2" slot="start" />
            </ion-item>
          </ion-list>
        </ion-accordion>
      </ion-accordion-group>
    </ion-content>

    <ion-modal :keep-contents-mounted="true" mode="ios">
      <ion-datetime id="due-by" v-model="achievement.dueByTime" presentation="time">
      </ion-datetime>
      <ion-button @click="dismissModal" expand="full"> OK </ion-button>
    </ion-modal>

    <ion-modal trigger="ok-button" ref="starts" :keep-contents-mounted="true" mode="ios">
      <ion-datetime v-model="achievement.startsOn" id="starts-on" presentation="date" />
      <ion-button @click="dismissModal" expand="full"> OK </ion-button>
    </ion-modal>

    <ion-modal ref="ends" :keep-contents-mounted="true" mode="ios" :is-open="endsModalOpen"
      @didDismiss="endsModalOpen = false">
      <ion-datetime id="ends-on" v-model="achievement.endsOn" presentation="date" />
      <ion-button @click="setNever" expand="full"> Never </ion-button>
      <ion-button @click="dismissModal" expand="full"> OK </ion-button>
    </ion-modal>

    <xp-add-category-modal :is-open="addCategoryModalOpen" :categories="categories"
      @dismiss="addCategoryModalOpen = false" @add-category="addCategory" @edit-categories="editCategories"
      @delete-category="deleteCategory" />

    <ion-footer>
      <!-- <ion-card>
      </ion-card> -->
      <!-- <ion-segment v-model="activeSegment">
        <ion-segment-button v-for="segment in segments" :key="segment.name" :value="segment.name.toLowerCase()">
          {{ segment.name }}
          <i class="fad fa-lg mt-1" :class="segment.icon"></i>
        </ion-segment-button>
      </ion-segment> -->
      <ion-item>
        <ion-buttons slot="start">
          <ion-button @click="activeSegment = prevButton.text.toLowerCase()" color="primary" size="small">
            <i class="fas fa-chevron-left fa-lg mx-2" slot="start"></i>
            {{ prevButton.text }}
            <i class="fas fa-lg mx-2" :class="prevButton.icon"></i>
          </ion-button>
        </ion-buttons>
        <ion-buttons slot="end">
          <ion-button @click="activeSegment = nextButton.text.toLowerCase()" color="primary" size="small">
            <i class="fas mx-2 fa-lg" :class="nextButton.icon"></i>
            {{ nextButton.text }}
            <i class="fas fa-chevron-right fa-lg mx-2" slot="end"></i>
          </ion-button>
        </ion-buttons>

      </ion-item>

      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button @click="$router.go(-1)">
            <i class="fad fa-times fa-lg mr-2" />
            Cancel
          </ion-button>
        </ion-buttons>
        <ion-buttons slot="end">
          <ion-button id="preview-achivement">
            <i class="fad fa-eye fa-lg mr-2" />
            Preview
          </ion-button>
          <ion-button @click="saveAchievement">
            <i class="fad fa-save fa-lg mr-2" />
            Save
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-footer>
    <ion-modal trigger="preview-achivement" :keep-contents-mounted="true" :backdrop-dismiss="true" mode="ios">
      <ion-card>
        <ion-list>
          <ion-item-sliding lines="none">
            <ion-item-options side="start">
              <ion-item-option color="success">
                <i class="fad fa-flag mr-1" />
                <ion-datetime-button datetime="starts-on" />
              </ion-item-option>
              <ion-item-option color="danger">
                <i class="fad fa-flag-checkered mr-1" />
                <ion-datetime-button datetime="ends-on" />
              </ion-item-option>
              <ion-item-option color="warning">
                <i class="fad fa-stopwatch mr-1" />
                <ion-datetime-button datetime="due-by" />
              </ion-item-option>
            </ion-item-options>
            <xp-achievement-item :achievement="achievement" :categories="categories" />
          </ion-item-sliding>
          <ion-item lines="none" v-if="achievement.type !== 'asNeeded' && achievement.assignee.length">
            <ion-label position="stacked"> The Chosen Heros </ion-label>
            <ion-select label="" v-model="achievement.assignee" multiple mode="ios">
              <ion-select-option v-for="user in users" :key="user.id" :value="user.id">
                {{ user.name.first }}
              </ion-select-option>
            </ion-select>
          </ion-item>
          <ion-item lines="none" v-if="achievement.basicSchedule === 'weekly'">
            <ion-label position="floating"> Weekly - Repeat On </ion-label>
            <ion-select v-model="achievement.repeatOnDays" label="Repeat On:" placeholder="Which days...?" multiple
              mode="ios">
              <ion-select-option value="mon">Monday</ion-select-option>
              <ion-select-option value="tue">Tuesday</ion-select-option>
              <ion-select-option value="wed">Wednesday</ion-select-option>
              <ion-select-option value="thu">Thursday</ion-select-option>
              <ion-select-option value="fri">Friday</ion-select-option>
              <ion-select-option value="sat">Saturday</ion-select-option>
              <ion-select-option value="sun">Sunday</ion-select-option>
            </ion-select>
          </ion-item>
          <ion-item lines="none" v-if="achievement.basicSchedule === 'custom'">
            <ion-label position="stacked"> Custom Frequency </ion-label>
            <ion-grid class="ion-no-padding">
              <ion-row v-if="achievement.basicSchedule === 'custom'">
                <ion-col>
                  <ion-item lines="none">
                    <ion-input class="ion-text-right w-5" v-model="achievement.customFrequency" type="number" cols="3"
                      min="1"></ion-input>
                    <ion-label slot="end">time(s)</ion-label>
                  </ion-item>
                </ion-col>
                <ion-col>
                  <ion-item lines="none">
                    <ion-label> Every </ion-label>
                    <ion-input class="ion-text-right" v-model="achievement.customPeriodNumber" type="number"
                      min="1"></ion-input>
                    <ion-select label="Interval" placeholder="Interval..." v-model="achievement.customPeriodType"
                      mode="ios" slot="end">
                      <ion-select-option value="day">Day(s)</ion-select-option>
                      <ion-select-option value="week">Week(s)</ion-select-option>
                      <ion-select-option value="month">Month(s)</ion-select-option>
                      <ion-select-option value="year">Year(s)</ion-select-option>
                    </ion-select>
                  </ion-item>
                </ion-col>
              </ion-row>
            </ion-grid>
          </ion-item>
          <ion-chip color="danger" expand="full" v-if="achievementExpired">
            <i class="fad fa-siren-on mr-2"></i>
            Achievement Expired
          </ion-chip>
        </ion-list>

        <ion-buttons class="ion-float-right">
          <ion-button @click="dismissModal">
            Dismiss
            <i class="fad fa-times fa-lg ml-2" />
          </ion-button>
        </ion-buttons>
      </ion-card>
    </ion-modal>
  </ion-page>
</template>

<script src="./XpAddAchievement" lang="ts" />
<style lang="scss" src="./_XpAddAchievement.scss" />

<template>
  <ion-page :class="$options.name">
    <ion-header>
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <ion-back-button :default-href="`/game-master/achievements`"></ion-back-button>
        </ion-buttons>

        <ion-card-title v-if="id">
          Edit Achievement: {{ achievement.achievementName }}
        </ion-card-title>

        <ion-title v-else>
          Create Achievement: {{ achievement.achievementName }}
        </ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="bg-slide p-4">
      <!-- Tabs Card with Helper Text -->
      <ion-card class="tabs-card">
        <ion-card-header>
          <ion-segment v-model="activeSegment">
            <ion-segment-button
              v-for="segment in segments"
              :key="segment.name"
              :value="segment.name.toLowerCase()"
            >
              {{ segment.name }}
              <i
                class="fad fa-lg mt-1"
                :class="segment.icon"
              ></i>
            </ion-segment-button>
          </ion-segment>
        </ion-card-header>
        <ion-card-content>
          <!-- Dynamic helper text based on active segment -->
          <ion-label>
            <i class="fad ion-float-right" :class="activeSegmentIcon" />
            <span v-if="activeSegment === 'adventure' && !adventureType">Choose your quest type, brave Game Master!</span>
            <span v-else-if="activeSegment === 'adventure' && adventureType">{{ activeAdventureType.text }}</span>
            <span v-else-if="activeSegment === 'heros'">Who are the chosen ones and how shall they embark on this quest?</span>
            <span v-else-if="activeSegment === 'timer'">When shall the quest for this achievement begin and end?</span>
            <span v-else-if="activeSegment === 'reward'">What treasures shall be bestowed for conquering this achievement?</span>
          </ion-label>
        </ion-card-content>
      </ion-card>

      <!-- Content Card - Adventure -->
      <ion-card v-if="activeSegment === 'adventure'" class="content-card">
        <ion-card-content>
          <ion-list>
            <!-- Name and Category Section -->
            <ion-item-group class="mb-4">
              <ion-item>
                <ion-avatar slot="start">
                  <ion-skeleton-text v-if="!achievement.imageUrl"></ion-skeleton-text>
                  <ion-img
                    :src="achievement?.imageUrl"
                    v-else
                  />
                </ion-avatar>
                <ion-label position="floating">Name Your Quest</ion-label>
                <ion-input
                  v-model="achievement.achievementName"
                  placeholder="Enter a name worthy of legend..."
                  :class="{ 'ion-invalid': !achievement.achievementName?.trim() && saveBtnDisabled }"
                ></ion-input>
              </ion-item>

              <ion-item-sliding>
                <ion-item-options side="start">
                  <ion-item-option
                    @click="openAddCategoryModal"
                    color="success"
                  >
                    <i class="fad fa-plus fa-lg"></i>
                  </ion-item-option>
                </ion-item-options>
                <ion-item>
                  <i
                    class="fad fa-scroll-old fa-2x mr-3"
                    slot="start"
                  ></i>
                  <ion-label position="floating">Quest Category</ion-label>
                  <ion-select
                    v-model="achievement.categoryId"
                    placeholder="Choose a category..."
                    mode="ios"
                    :clearInput="true"
                    :class="{ 'ion-invalid': !achievement.categoryId && saveBtnDisabled }"
                  >
                    <ion-select-option
                      v-for="(cat, index) in categories"
                      :value="cat.id"
                      :key="index"
                    >
                      {{ cat.name }}
                    </ion-select-option>
                  </ion-select>
                </ion-item>
              </ion-item-sliding>
            </ion-item-group>

            <!-- Quest Type Selection -->
            <ion-item-group class="mb-4">
              <ion-item-divider>
                <ion-label>Quest Type</ion-label>
              </ion-item-divider>

              <ion-segment
                v-model="adventureType"
                mode="ios"
              >
                <ion-segment-button
                  value="simple"
                  :disabled="achievement.beastId != '' || achievement.subAchievementIds.length"
                >
                  <i class="fad fa-tasks fa-lg mb-1"></i>
                  <ion-label>Simple Quest</ion-label>
                </ion-segment-button>
                <ion-segment-button
                  value="beast"
                  :disabled="achievement.subAchievementIds.length"
                >
                  <i class="fad fa-dragon fa-lg mb-1"></i>
                  <ion-label>Beast Hunt</ion-label>
                </ion-segment-button>
                <ion-segment-button
                  value="quest"
                  :disabled="achievement.beastId != ''"
                >
                  <i class="fad fa-crown fa-lg mb-1"></i>
                  <ion-label>Epic Quest</ion-label>
                </ion-segment-button>
              </ion-segment>

              <div class="ion-padding-vertical">
                <ion-item
                  v-if="adventureType === 'beast'"
                  lines="none"
                >
                  <i
                    class="fad fa-dragon fa-2x mr-3"
                    slot="start"
                    style="color: var(--ion-color-danger)"
                  ></i>
                  <ion-label>
                    Choose Your Beast
                  </ion-label>
                  <ion-select
                    v-model="achievement.beastId"
                    mode="ios"
                    :clearInput="true"
                    interface="action-sheet"
                    placeholder="Select a beast..."
                  >
                    <ion-select-option
                      v-for="beast in beasts"
                      :key="beast.id"
                      :value="beast.id"
                    >
                      {{ beast.name }}
                    </ion-select-option>
                  </ion-select>
                  <ion-buttons
                    slot="end"
                    class="mx-0"
                    v-if="achievement.beastId"
                  >
                    <ion-button
                      @click="achievement.beastId = ''"
                      color="danger"
                    >
                      <i class="fad fa-times-circle fa-2x"></i>
                    </ion-button>
                  </ion-buttons>
                </ion-item>

                <ion-item-sliding
                  v-if="adventureType === 'quest'"
                  :disabled="!achievement.subAchievementIds.length"
                >
                  <ion-item-options side="start">
                    <ion-item-option
                      @click="clickReorder"
                      color="warning"
                    >
                      <i class="fad fa-sort-alt fa-2x mx-2"></i>
                    </ion-item-option>
                  </ion-item-options>
                  <ion-item lines="none">
                    <i
                      class="fad fa-scroll-old fa-2x mr-3"
                      slot="start"
                      style="color: var(--ion-color-warning)"
                    ></i>
                    <ion-label position="stacked">
                      Quest Chain
                    </ion-label>
                    <ion-select
                      v-model="achievement.subAchievementIds"
                      :clearInput="true"
                      mode="ios"
                      multiple
                      interface="action-sheet"
                      placeholder="Select achievements..."
                    >
                      <ion-select-option
                        v-for="quest in achievements.filter(
                          (a) => a.id != achievement.id
                        )"
                        :key="quest.id"
                        :value="quest.id"
                      >
                        {{ quest.achievementName }}
                      </ion-select-option>
                    </ion-select>
                    <ion-buttons
                      v-if="achievement.subAchievementIds.length"
                      slot="end"
                      class="mx-0"
                    >
                      <ion-button
                        @click="achievement.subAchievementIds = []"
                        color="danger"
                      >
                        <i class="fad fa-times-circle fa-2x"></i>
                      </ion-button>
                    </ion-buttons>
                  </ion-item>
                </ion-item-sliding>

                <ion-item
                  v-if="adventureType === 'simple'"
                  lines="none"
                >
                  <i
                    class="fad fa-scroll fa-2x mr-3"
                    slot="start"
                    style="color: var(--ion-color-success)"
                  ></i>
                  <ion-label>
                    Simple Quest
                  </ion-label>
                </ion-item>
              </div>
            </ion-item-group>
          </ion-list>
        </ion-card-content>
      </ion-card>

      <!-- Content Card - Heroes -->
      <ion-card v-if="activeSegment === 'heros'" class="content-card">
        <ion-card-content>
          <ion-list>
            <ion-item>
              <ion-label position="floating">The Chosen Heros</ion-label>
              <ion-select
                v-model="achievement.assignee"
                multiple
                :disabled="achievement.type === 'asNeeded'"
                mode="ios"
              >
                <!-- Replace with actual list of users -->
                <ion-select-option
                  v-for="user in users"
                  :key="user.id"
                  :value="user.id"
                >
                  {{ user.name.first }}
                </ion-select-option>
              </ion-select>
            </ion-item>
            <ion-list-header>
              Type of Assignment
            </ion-list-header>
            <ion-radio-group v-model="achievement.type">
              <ion-item>
                <i
                  slot="end"
                  class="fad fa-2x w-10"
                  :class="achievementTypeIcons['asNeeded']"
                />
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
                <i
                  slot="end"
                  class="fad fa-2x w-10"
                  :class="achievementTypeIcons['collaborate']"
                />
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
                <i
                  slot="end"
                  class="fad fa-2x w-10"
                  :class="achievementTypeIcons['compete']"
                />
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
                <i
                  slot="end"
                  class="fad fa-2x w-10"
                  :class="achievementTypeIcons['individual']"
                />
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
                <i
                  slot="end"
                  class="fad fa-2x w-10"
                  :class="achievementTypeIcons['rotate']"
                />
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
        </ion-card-content>
      </ion-card>

      <!-- Content Card - Timer -->
      <ion-card v-if="activeSegment === 'timer'" class="content-card">
        <ion-card-content>
          <ion-list>
            <ion-list-header>Time Limits</ion-list-header>
            <ion-grid class="ion-no-padding">
              <ion-row>
                <ion-col>
                  <ion-item>
                    <ion-label>Starts On</ion-label>
                    <ion-datetime-button datetime="starts-on" />
                  </ion-item>
                  <ion-item>
                    <ion-label>Ends On</ion-label>
                    <ion-buttons
                      slot="end"
                      v-if="!achievement.endsOn"
                    >
                      <ion-button @click="endsModalOpen = true">
                        Never
                      </ion-button>
                    </ion-buttons>
                    <ion-datetime-button
                      datetime="ends-on"
                      v-else
                    />
                  </ion-item>
                  <ion-item>
                    <ion-label>Due By Time</ion-label>
                    <ion-datetime-button
                      display-format="h:mm A"
                      datetime="due-by"
                    />
                  </ion-item>
                </ion-col>
              </ion-row>
            </ion-grid>
            
            <ion-list-header>Choose the Occurance</ion-list-header>
            <ion-segment
              v-model="achievement.basicSchedule"
              mode="ios"
            >
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

            <ion-grid class="ion-no-padding" v-if="achievement.basicSchedule === 'custom'">
              <ion-row>
                <ion-col>
                  <ion-item>
                    <ion-label>Frequency</ion-label>
                    <ion-input
                      class="ion-text-right"
                      v-model="achievement.customFrequency"
                      type="number"
                      min="1"
                    ></ion-input>
                    <ion-label slot="end">time(s)</ion-label>
                  </ion-item>
                </ion-col>
                <ion-col>
                  <ion-item>
                    <ion-label>Every</ion-label>
                    <ion-input
                      class="ion-text-right"
                      v-model="achievement.customPeriodNumber"
                      type="number"
                      min="1"
                    ></ion-input>
                    <ion-select
                      label="Interval"
                      placeholder="Interval..."
                      v-model="achievement.customPeriodType"
                      mode="ios"
                    >
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
              <ion-select
                v-model="achievement.repeatOnDays"
                placeholder="Which days...?"
                multiple
                mode="ios"
              >
                <ion-select-option value="mon">Monday</ion-select-option>
                <ion-select-option value="tue">Tuesday</ion-select-option>
                <ion-select-option value="wed">Wednesday</ion-select-option>
                <ion-select-option value="thu">Thursday</ion-select-option>
                <ion-select-option value="fri">Friday</ion-select-option>
                <ion-select-option value="sat">Saturday</ion-select-option>
                <ion-select-option value="sun">Sunday</ion-select-option>
              </ion-select>
            </ion-item>
          </ion-list>
        </ion-card-content>
      </ion-card>

      <!-- Content Card - Reward -->
      <ion-card v-if="activeSegment === 'reward'" class="content-card">
        <ion-card-content>
          <ion-list>
            <ion-item>
              <ion-label class="ion-text-wrap">
                Estimated Amount of Effort
                <p class="text-sm">Choose wisely - the golden sequence determines the rewards!</p>
              </ion-label>
              <div class="difficulty-range">
                <ion-button
                  :disabled="achievement.difficulty === 1"
                  @click="decreaseDifficulty"
                  color="danger"
                  size="small"
                >
                  <i class="fas fa-minus"></i>
                </ion-button>
                <ion-range
                  v-model="achievement.difficulty"
                  mode="ios"
                  min="1"
                  max="13"
                  :pin="true"
                  step="1"
                  :snaps="true"
                  :ticks="true"
                  color="warning"
                  @ionChange="updatePoints"
                >
                  <div
                    v-for="value in fibonacciArray"
                    :key="value"
                    class="fibonacci-marker"
                    :style="{ left: ((value - 1) / 12 * 100) + '%' }"
                    :data-value="value"
                  >
                  </div>
                  <ion-label slot="start">Novice</ion-label>
                  <ion-label slot="end">Master</ion-label>
                </ion-range>
                <ion-button
                  :disabled="achievement.difficulty === 13"
                  @click="increaseDifficulty"
                  color="success"
                  size="small"
                >
                  <i class="fas fa-plus"></i>
                </ion-button>
              </div>
              <i
                slot="end"
                class="fad fa-2x"
                :class="difficultyIcon"
                :style="isFibonacci ? { color: 'var(--ion-color-warning)' } : {}"
              />
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
                      <i
                        class="fad fa-hand-holding-seedling fa-2x"
                        slot="end"
                      />
                      <ion-input
                        slot="end"
                        v-model="achievement.xp"
                        type="number"
                        placeholder="Enter XP"
                        class="ion-text-right"
                      ></ion-input>
                      <ion-label slot="end"> XP </ion-label>
                    </ion-item-option>
                  </ion-item-options>
                  <ion-item>
                    <i
                      class="fad fa-hand-holding-seedling fa-2x mr-3"
                      slot="start"
                      style="color: var(--ion-color-success)"
                    />
                    <ion-label>
                      Experience Points (XP)
                      <p>Motivates and tracks skill growth.</p>
                    </ion-label>
                    <ion-badge
                      class="ion-float-right text-white px-2"
                      color="success"
                      slot="end"
                    >
                      {{ achievement.xp }}
                      <i class="fad fa-hand-holding-seedling ml-2" />
                    </ion-badge>
                    <i
                      class="fad fa-grip-vertical fa-lg mr-3"
                      slot="end"
                    />
                  </ion-item>
                </ion-item-sliding>
                <ion-item-sliding>
                  <ion-item-options side="end">
                    <ion-item-option color="warning">
                      <i class="fad fa-hand-holding-usd fa-2x" />
                      <ion-input
                        slot="end"
                        v-model="achievement.gp"
                        type="number"
                        class="ion-text-right text-xl"
                        placeholder="Enter GP"
                      ></ion-input>
                      <ion-label slot="end">GP</ion-label>
                    </ion-item-option>
                  </ion-item-options>
                  <ion-item>
                    <i
                      class="fad fa-hand-holding-usd fa-2x mr-3"
                      slot="start"
                      style="color: var(--ion-color-warning)"
                    />
                    <ion-label>
                      Gold Points (GP)
                      <p>In-app currency, teaching financial literacy.</p>
                    </ion-label>
                    <ion-badge
                      class="ion-float-right text-sm px-2"
                      color="warning"
                      slot="end"
                    >
                      <xp-gp :gp="achievement.gp" />
                      <i class="fad fa-hand-holding-usd ml-2" />
                    </ion-badge>
                    <i
                      class="fad fa-grip-vertical fa-lg mr-3"
                      slot="end"
                    />
                  </ion-item>
                </ion-item-sliding>
                <ion-item-sliding>
                  <ion-item-options side="end">
                    <ion-item-option color="danger">
                      <i class="fad fa-hand-holding-magic fa-2x" />
                      <ion-input
                        class="ion-text-right text-xl"
                        v-model="achievement.ap"
                        type="number"
                        placeholder="Enter AP"
                      ></ion-input>
                      <ion-label slot="end"> AP </ion-label>
                    </ion-item-option>
                  </ion-item-options>
                  <ion-item>
                    <i
                      class="fad fa-hand-holding-magic fa-2x mr-3"
                      slot="start"
                      style="color: var(--ion-color-danger)"
                    />
                    <ion-label>
                      Ability Points (AP)
                      <p>Unlocks abilities, encourages strategic planning.</p>
                    </ion-label>
                    <ion-badge
                      class="ion-float-right text-sm px-2"
                      color="danger"
                      slot="end"
                    >
                      {{ achievement.ap }}
                      <i class="fad fa-hand-holding-magic ml-2" />
                    </ion-badge>
                    <i
                      class="fad fa-grip-vertical fa-lg mr-3"
                      slot="end"
                    />
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
                  <i
                    class="fad fa-clipboard-check fa-2x w-10 mx-2"
                    slot="start"
                  />
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
                  <i
                    class="fad fa-gift fa-2x w-10 mx-2"
                    slot="start"
                  />
                </ion-item>
              </ion-list>
            </ion-accordion>
          </ion-accordion-group>
        </ion-card-content>
      </ion-card>
    </ion-content>

    <!-- Keep modals the same -->
    <ion-modal
      :keep-contents-mounted="true"
      mode="ios"
    >
      <ion-datetime
        id="due-by"
        v-model="achievement.dueByTime"
        presentation="time"
      >
      </ion-datetime>
      <ion-button
        @click="dismissModal"
        expand="full"
      > OK </ion-button>
    </ion-modal>

    <ion-modal
      trigger="ok-button"
      ref="starts"
      :keep-contents-mounted="true"
      mode="ios"
    >
      <ion-datetime
        v-model="achievement.startsOn"
        id="starts-on"
        presentation="date"
      />
      <ion-button
        @click="dismissModal"
        expand="full"
      > OK </ion-button>
    </ion-modal>

    <ion-modal
      ref="ends"
      :keep-contents-mounted="true"
      mode="ios"
      :is-open="endsModalOpen"
      @didDismiss="endsModalOpen = false"
    >
      <ion-datetime
        id="ends-on"
        v-model="achievement.endsOn"
        presentation="date"
      />
      <ion-button
        @click="setNever"
        expand="full"
      > Never </ion-button>
      <ion-button
        @click="dismissModal"
        expand="full"
      > OK </ion-button>
    </ion-modal>

    <xp-add-category-modal
      :is-open="addCategoryModalOpen"
      :categories="categories"
      @dismiss="addCategoryModalOpen = false"
      @add-category="addCategory"
      @edit-categories="editCategories"
      @delete-category="deleteCategory"
    />

    <ion-footer>
      <ion-item>
        <ion-buttons slot="start">
          <ion-button
            @click="activeSegment = prevButton.text.toLowerCase()"
            color="primary"
            size="small"
          >
            <i
              class="fas fa-chevron-left fa-lg mx-2"
              slot="start"
            ></i>
            {{ prevButton.text }}
            <i
              class="fas fa-lg mx-2"
              :class="prevButton.icon"
            ></i>
          </ion-button>
        </ion-buttons>
        <ion-buttons slot="end">
          <ion-button
            @click="activeSegment = nextButton.text.toLowerCase()"
            color="primary"
            size="small"
          >
            <i
              class="fas mx-2 fa-lg"
              :class="nextButton.icon"
            ></i>
            {{ nextButton.text }}
            <i
              class="fas fa-chevron-right fa-lg mx-2"
              slot="end"
            ></i>
          </ion-button>
        </ion-buttons>
      </ion-item>

      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <ion-button @click="$router.go(-1)">
            <i class="fad fa-times fa-lg mr-2" />
            Cancel
          </ion-button>
        </ion-buttons>
        <ion-buttons slot="end">
          <ion-button id="preview-achievement">
            <i class="fad fa-eye fa-lg mr-2" />
            Preview
          </ion-button>
          <ion-button
            @click="saveAchievement"
            :disabled="saveBtnDisabled"
          >
            <i
              class="fad"
              :class="isValidAdventure ? 'fa-scroll-old' : 'fa-scroll'"
            />
            {{ isValidAdventure ? 'Complete Quest' : 'Quest Incomplete' }}
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-footer>

    <!-- Keep preview modal the same -->
    <ion-modal
      trigger="preview-achievement"
      :keep-contents-mounted="true"
      :backdrop-dismiss="true"
      mode="ios"
    >
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
            <xp-achievement-item
              :achievement="achievement"
              :categories="categories"
            />
          </ion-item-sliding>
          <!-- ...rest of the preview modal content... -->
          <ion-item
            lines="none"
            v-if="achievement.type !== 'asNeeded' && achievement.assignee.length"
          >
            <ion-label position="stacked"> The Chosen Heros </ion-label>
            <ion-select
              label=""
              v-model="achievement.assignee"
              multiple
              mode="ios"
            >
              <ion-select-option
                v-for="user in users"
                :key="user.id"
                :value="user.id"
              >
                {{ user.name.first }}
              </ion-select-option>
            </ion-select>
          </ion-item>
          
          <!-- ...rest of preview modal items... -->
          <!-- Points Preview -->
          <ion-list>
            <ion-item
              lines="none"
              v-if="achievement.xp"
            >
              <i
                class="fad fa-hand-holding-seedling fa-2x mr-3"
                slot="start"
                style="color: var(--ion-color-success)"
              />
              <ion-label>Experience Points (XP)</ion-label>
              <ion-badge
                color="success"
                slot="end"
              >
                {{ achievement.xp }}
                <i class="fad fa-hand-holding-seedling ml-2" />
              </ion-badge>
            </ion-item>
            <ion-item
              lines="none"
              v-if="achievement.gp"
            >
              <i
                class="fad fa-hand-holding-usd fa-2x mr-3"
                slot="start"
                style="color: var(--ion-color-warning)"
              />
              <ion-label>Gold Points (GP)</ion-label>
              <ion-badge
                color="warning"
                slot="end"
              >
                <xp-gp :gp="achievement.gp" />
                <i class="fad fa-hand-holding-usd ml-2" />
              </ion-badge>
            </ion-item>
            <ion-item
              lines="none"
              v-if="achievement.ap"
            >
              <i
                class="fad fa-hand-holding-magic fa-2x mr-3"
                slot="start"
                style="color: var(--ion-color-danger)"
              />
              <ion-label>Ability Points (AP)</ion-label>
              <ion-badge
                color="danger"
                slot="end"
              >
                {{ achievement.ap }}
                <i class="fad fa-hand-holding-magic ml-2" />
              </ion-badge>
            </ion-item>
          </ion-list>
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

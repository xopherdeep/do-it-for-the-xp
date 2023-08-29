<template>
  <ion-page :class="$options.name">
    <ion-header>
      <ion-toolbar class="rpg-box">
        <ion-buttons slot="start">
          <ion-back-button :default-href="`/game-master/achievements`"></ion-back-button>

          <!-- <ion-icon :icon="storefrontOutline" slot="icon-only" /> -->
        </ion-buttons>
        <ion-title v-if="id">
          Edit Achievement: {{ achievement.achievementName }}
        </ion-title>
        <ion-title v-else>
          Create Achievement: {{ achievement.achievementName }}
        </ion-title>
        <ion-buttons slot="end">
          <ion-button
            expand="full"
            @click="submitForm"
            color="primary"
            size="large"
          >
            <i class="fad fa-save fa-lg"></i>
            Save Achievement
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
      <ion-segment v-model="activeSegment">
        <ion-segment-button
          v-for="segment in segments"
          :key="segment.name"
          :value="segment.name.toLowerCase()"
        >
          {{ segment.name }}
          <i
            class="fad"
            :class="segment.icon"
          ></i>
        </ion-segment-button>
      </ion-segment>
    </ion-header>
    <ion-content v-if="activeSegment === 'classify'">
      <ion-card>
        <ion-card-content>
          Unveil the secrets of this achievement...
        </ion-card-content>
      </ion-card>
      <ion-list>
        <ion-item>
          <ion-label>
            Name
            <p>
            </p>
          </ion-label>
          <ion-input
            v-model="achievement.achievementName"
            placeholder="Enter Achievement Name"
          ></ion-input>
        </ion-item>
        <ion-item>
          <ion-label>
            Category
            <p>
              Organize your achievements.

            </p>
          </ion-label>
          <ion-select
            slot="end"
            v-model="achievement.categoryId"
            placeholder="Choose a category..."
          >
            <ion-select-option
              v-for="(cat, index) in categories"
              :value="cat.id"
              :key="index"
            >
              {{ cat.name }}
            </ion-select-option>
          </ion-select>
          <ion-button
            slot="end"
            @click="openAddCategoryModal"
            color="success"
          >
            <i class="fad fa-plus fa-lg"></i>
          </ion-button>
        </ion-item>
        <ion-item>
          <ion-label>
            Requires Approval
            <p>
              Should this achievement require approval before
              any points are awarded?
            </p>
          </ion-label>
          <ion-checkbox v-model="achievement.requiresApproval"></ion-checkbox>
          <i
            class="fad fa-clipboard-check fa-2x w-8 mr-3"
            slot="start"
          />
        </ion-item>
        <ion-item>
          <ion-label>
            Bonus Achievement
            <p>
              Is this a bonus achievement? I.E. Not a required
              achievement.

            </p>
          </ion-label>
          <ion-checkbox v-model="achievement.bonusAchievement"></ion-checkbox>
          <i
            class="fad fa-gift fa-2x w-8 mr-3"
            slot="start"
          />
        </ion-item>
      </ion-list>
    </ion-content>

    <ion-content v-if="activeSegment === 'assign'">
      <ion-card>
        <ion-card-content>
          Who are the chosen ones and how shall they embark on this quest?
        </ion-card-content>
      </ion-card>
      <ion-list>
        <ion-item>
          <ion-label>Who</ion-label>
          <ion-select
            v-model="achievement.assignee"
            multiple
            :disabled="achievement.type === 'asNeeded'"
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
          Quest Type
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

    </ion-content>

    <ion-content v-if="activeSegment === 'xp'">
      <ion-card>
        <ion-card-content>
          What treasures shall be bestowed for conquering this achievement?
        </ion-card-content>
      </ion-card>
      <ion-list-header>
        Amount of Effort
      </ion-list-header>
      <ion-list>
        <ion-item>
          <ion-range
            min="1"
            max="13"
            :pin="true"
            mode="ios"
            step="1"
            snaps
            ticks
            color="primary"
            v-model="achievement.difficulty"
            @ionChange="updatePoints"
          >
            <ion-label slot="start">Minimum</ion-label>
            <ion-label slot="end">Maximum </ion-label>
          </ion-range>
        </ion-item>
      </ion-list>
      <ion-list-header>
        Points
      </ion-list-header>
      <ion-list>
        <ion-item-sliding>
          <ion-item-options side="start">
            <ion-item-option color="success">
              <i class="fad fa-hand-holding-seedling fa-2x" />
              <ion-input
                v-model="achievement.xp"
                type="number"
                placeholder="Enter XP"
                class="ion-text-right w-2 w-10/12"
              ></ion-input>
            </ion-item-option>
          </ion-item-options>
          <ion-item>
            <ion-label position="">
              <ion-badge
                class="ion-float-right text-white"
                color="success"
              >
                {{ achievement.xp }}
                <i class="fad fa-hand-holding-seedling" />
              </ion-badge>
              Experience Points (XP)
              <p>
                Points earned for task completion, motivating and tracking skill growth.
              </p>
            </ion-label>
          </ion-item>
        </ion-item-sliding>
        <ion-item-sliding>
          <ion-item-options side="start">
            <ion-item-option color="warning">
              <i class="fad fa-hand-holding-usd fa-2x" />
              <ion-input
                slot="end"
                v-model="achievement.gp"
                type="number"
                class="ion-text-right text-xl"
                placeholder="Enter GP"
              ></ion-input>
            </ion-item-option>
          </ion-item-options>
          <ion-item>
            <ion-label>
              Gold Points (GP)
              <ion-badge
                class="ion-float-right"
                color="warning"
              >
                <xp-gp :gp="achievement.gp" />
                <i class="fad fa-hand-holding-usd ml-1" />
              </ion-badge>
              <p>
                In-app currency for tasks, teaching financial literacy through rewards.
              </p>
            </ion-label>
          </ion-item>
        </ion-item-sliding>
        <ion-item-sliding>
          <ion-item-options side="start">
            <ion-item-option color="danger">
              <i class="fad fa-hand-holding-magic fa-2x" />
              <ion-input
                class="ion-text-right text-xl"
                v-model="achievement.ap"
                type="number"
                placeholder="Enter AP"
              ></ion-input>
            </ion-item-option>
          </ion-item-options>
          <ion-item>
            <ion-label>
              <ion-badge
                class="ion-float-right"
                color="danger"
              >
                {{ achievement.ap }}
                <i class="fad fa-hand-holding-magic" />
              </ion-badge>
              Ability Points (AP)
              <p>
                Special points for unlocking abilities, encouraging strategic planning.
              </p>
            </ion-label>
          </ion-item>
        </ion-item-sliding>
      </ion-list>
    </ion-content>

    <ion-content v-if="activeSegment === 'schedule'">
      <ion-card>
        <ion-card-content>
          When shall the quest for this achievement begin and end?
        </ion-card-content>
      </ion-card>
      <ion-segment v-model="achievement.scheduleType">
        <ion-segment-button value="basic">
          <ion-label>Basic</ion-label>
        </ion-segment-button>
        <ion-segment-button value="custom">
          <ion-label>Custom</ion-label>
        </ion-segment-button>
      </ion-segment>
      <ion-grid class="ion-no-padding">
        <ion-radio-group
          v-model="achievement.basicSchedule"
          v-if="achievement.scheduleType === 'basic'"
        >
          <ion-row>
            <ion-col>
              <ion-item>
                <ion-label>Once</ion-label>
                <ion-radio value="once"></ion-radio>
              </ion-item>
            </ion-col>
            <ion-col>
              <ion-item>
                <ion-label>Daily</ion-label>
                <ion-radio value="daily"></ion-radio>
              </ion-item>
            </ion-col>
            <ion-col>
              <ion-item>
                <ion-label>Weekly</ion-label>
                <ion-radio value="weekly"></ion-radio>
              </ion-item>
            </ion-col>
          </ion-row>
        </ion-radio-group>
        <ion-row v-if="achievement.scheduleType === 'custom'">
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
              >
                <ion-select-option value="day">Day(s)</ion-select-option>
                <ion-select-option value="week">Week(s)</ion-select-option>
                <ion-select-option value="month">Month(s)</ion-select-option>
                <ion-select-option value="year">Year(s)</ion-select-option>
              </ion-select>
            </ion-item>
          </ion-col>
        </ion-row>
        <ion-row v-if="achievement.scheduleType === 'basic'">
          <ion-col>
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
          </ion-col>
        </ion-row>
      </ion-grid>
      <ion-grid class="ion-no-padding">
        <ion-row>
          <ion-col>
            <ion-item>
              <ion-label>Starts On</ion-label>
              <ion-datetime-button datetime="starts-on" />
            </ion-item>
            <ion-item>
              <ion-label>Ends On</ion-label>
              <ion-datetime-button datetime="ends-on" />
            </ion-item>
            <ion-item>
              <ion-label>Due By Time</ion-label>
              <ion-datetime-button
                display-format="h:mm A"
                datetime="due-by"
              >
                <!-- <div slot="date-target"><i class="fad fa-clock fa-lg"></i></div> -->
              </ion-datetime-button>
            </ion-item>
          </ion-col>
        </ion-row>
      </ion-grid>

    </ion-content>
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
      >
        OK
      </ion-button>
    </ion-modal>

    <ion-modal
      trigger="ok-button"
      ref="starts"
      :keep-contents-mounted="true"
    >
      <ion-datetime
        v-model="achievement.startsOn"
        id="starts-on"
        presentation="date"
      />
      <ion-button
        @click="dismissModal"
        expand="full"
      >
        OK
      </ion-button>
    </ion-modal>

    <ion-modal
      ref="ends"
      :keep-contents-mounted="true"
      mode="ios"
    >
      <ion-datetime
        id="ends-on"
        v-model="achievement.endsOn"
        presentation="date"
      />
      <ion-button
        @click="setNever"
        expand="full"
      >
        Never
      </ion-button>
      <ion-button
        @click="dismissModal"
        expand="full"
      >
        OK
      </ion-button>
    </ion-modal>
    <xp-add-category-modal
      :is-open="addCategoryModalOpen"
      :categories="categories"
      @dismiss="addCategoryModalOpen = false"
      @add-category="addCategory"
    />

    <ion-footer>
      <ion-card>
        <ion-list>
          <ion-item lines="none">
            <!-- requires approval icon -->
            <ion-label>
              <i
                v-if="achievement.difficulty == 1"
                class="fad fa-dice-d4 ion-float-right text-xl ml-2"
              />
              <i
                v-else-if="achievement.difficulty == 2"
                class="fad fa-dice-d6 fa-2x ion-float-right text-xl ml-2"
              />
              <i
                v-else-if="achievement.difficulty == 3"
                class="fad fa-dice-d8 fa-2x ion-float-right text-xl ml-2"
              />
              <i
                v-else-if="achievement.difficulty == 5"
                class="fad fa-dice-d10 fa-2x ion-float-right text-xl ml-2"
              />
              <i
                v-else-if="achievement.difficulty == 8"
                class="fad fa-dice-d12 fa-2x ion-float-right text-xl ml-2"
              />
              <i
                v-else-if="achievement.difficulty == 13"
                class="fad fa-dice-d20 fa-2x ion-float-right text-xl ml-2"
              />
              <i
                v-else
                class="fad fa-dice fa-2x"
              />
              <i
                v-if="achievement.type"
                class="fad ion-float-right text-xl mx-2"
                :class="achievementTypeIcons[achievement.type]"
                slot="end"
              ></i>
              <i
                v-if="achievement.requiresApproval"
                class="fad fa-clipboard-check ion-float-right text-xl mx-2"
              ></i>
              <i
                v-if="achievement.bonusAchievement"
                class="fad fa-gift ion-float-right text-xl mx-2"
                slot="end"
              ></i>
              <h1>
                {{ achievement.achievementName }}
              </h1>
              <p>
                {{ category?.name }}
                <ion-badge
                  color="success"
                  class="ion-float-right"
                >
                  XP: {{ achievement.xp }}
                </ion-badge>
                <ion-badge
                  color="warning"
                  class="ion-float-right mx-2"
                >
                  <xp-gp :gp="achievement.gp"></xp-gp>
                </ion-badge>
                <ion-badge
                  color="danger"
                  class="ion-float-right"
                >
                  AP: {{ achievement.ap }}
                </ion-badge>
              </p>
            </ion-label>
          </ion-item>
          <ion-item lines='none'>
            <ion-label v-if="achievement.scheduleType === 'custom'">
              Frequency: {{ achievement.customFrequency }}
              time(s)

              every
              {{ achievement.customPeriodNumber }}
              {{ achievement.customPeriodType }}

            </ion-label>
            <ion-select
              v-model="achievement.assignee"
              multiple
              disabled
              slot="end"
            >
              <ion-select-option
                v-for="user in users"
                :key="user.id"
                :value="user.id"
              >
                {{ user.name.first }}
              </ion-select-option>
            </ion-select>
            <ion-select
              v-if="achievement.scheduleType === 'basic' && achievement.basicSchedule === 'weekly'"
              v-model="achievement.repeatOnDays"
              label="Repeat On:"
              placeholder="Which days...?"
              multiple
              slot="start"
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
          <ion-item lines="none">
            <ion-label
              slot="start"
              placement="stacked"
            >
              Starts:
              <ion-datetime-button datetime="starts-on" />
            </ion-label>
            <ion-label
              slot="start"
              placement="stacked"
            >
              Ends:
              <ion-datetime-button datetime="ends-on" />
            </ion-label>
            <ion-label slot="end">
              Due By:
              <ion-datetime-button datetime="due-by" />
            </ion-label>
          </ion-item>
        </ion-list>
      </ion-card>
      <ion-grid>
        <ion-row>
          <ion-col>
            <ion-button
              expand="block"
              @click="activeSegment = prevButton.text.toLowerCase()"
            >
              <i
                class="fas fa-chevron-left"
                slot="start"
              ></i>
              {{
                prevButton.text
              }}
            </ion-button>
          </ion-col>
          <ion-col>
          </ion-col>
          <ion-col>
            <ion-button
              expand="block"
              @click="activeSegment = nextButton.text.toLowerCase()"
            >
              {{ nextButton.text }}
              <i
                class="fas fa-chevron-right"
                slot="end"
              ></i>
            </ion-button>
          </ion-col>
        </ion-row>
      </ion-grid>
    </ion-footer>
  </ion-page>
</template>

<script src="./XpAddAchievement" lang="ts" />
<style lang="scss" src="./_XpAddAchievement.scss" />

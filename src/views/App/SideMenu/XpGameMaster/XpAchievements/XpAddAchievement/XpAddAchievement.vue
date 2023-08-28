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
          <i
            class="fad fa-lg"
            :icon="segment.icon"
          ></i>
          {{ segment.name }}
        </ion-segment-button>
      </ion-segment>
    </ion-header>
    <ion-content v-if="activeSegment === 'class'">
      <ion-card>
        <ion-card-content>
          Tell us about this achievement...
        </ion-card-content>
      </ion-card>
      <ion-list>
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
            Achievement Name
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
            Requires Approval
            <p>
              Should this achievement require approval before
              any points are awarded?
            </p>
          </ion-label>
          <ion-checkbox v-model="achievement.requiresApproval"></ion-checkbox>
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
        </ion-item>
      </ion-list>
    </ion-content>

    <ion-content v-if="activeSegment === 'loot'">
      <ion-card>
        <ion-card-content>
          What should be awarded for this achievement?
        </ion-card-content>
      </ion-card>
      <ion-list>
        <ion-grid>
          <ion-row>
            <ion-col>
              <ion-radio-group
                @ionChange="updatePoints"
                v-model="achievement.difficulty"
              >
                <ion-item>
                  <ion-grid>
                    <ion-row>
                      <ion-col size="4">
                        <ion-item>
                          <ion-label>
                            <i class="fad fa-dice-d4 fa-lg"></i>
                            Easy
                          </ion-label>
                          <ion-radio value="1"></ion-radio>
                        </ion-item>
                      </ion-col>
                      <ion-col size="4">
                        <ion-item>
                          <ion-label><i class="fad fa-dice-d6 fa-lg"></i></ion-label>
                          <ion-radio value="2"></ion-radio>
                        </ion-item>
                      </ion-col>
                      <ion-col size="4">
                        <ion-item>
                          <ion-label><i class="fad fa-dice-d8 fa-lg"></i></ion-label>
                          <ion-radio value="3"></ion-radio>
                        </ion-item>
                      </ion-col>
                      <ion-col size="4">
                        <ion-item>
                          <ion-label><i class="fad fa-dice-d10 fa-lg"></i></ion-label>
                          <ion-radio value="5"></ion-radio>
                        </ion-item>
                      </ion-col>
                      <ion-col size="4">
                        <ion-item>
                          <ion-label><i class="fad fa-dice-d12 fa-lg"></i></ion-label>
                          <ion-radio value="8"></ion-radio>
                        </ion-item>
                      </ion-col>
                      <ion-col size="4">
                        <ion-item>
                          <ion-label><i class="fad fa-dice-d20 fa-lg"></i></ion-label>
                          <ion-radio value="13"></ion-radio>
                        </ion-item>
                      </ion-col>
                    </ion-row>
                  </ion-grid>
                </ion-item>
              </ion-radio-group>
            </ion-col>
          </ion-row>
          <ion-row>
            <ion-col>
              <ion-item>
                <ion-label>XP</ion-label>
                <ion-input
                  v-model="achievement.xp"
                  type="number"
                  placeholder="Enter XP"
                ></ion-input>
              </ion-item>
            </ion-col>
            <ion-col>
              <ion-item>
                <ion-label>GP</ion-label>
                <ion-input
                  v-model="achievement.gp"
                  type="number"
                  placeholder="Enter GP"
                ></ion-input>
              </ion-item>
            </ion-col>
            <ion-col>
              <ion-item>
                <ion-label>AP</ion-label>
                <ion-input
                  v-model="achievement.ap"
                  type="number"
                  placeholder="Enter AP"
                ></ion-input>
              </ion-item>
            </ion-col>
          </ion-row>
        </ion-grid>
      </ion-list>
    </ion-content>

    <ion-content v-if="activeSegment === 'assign'">
      <ion-card>
        <ion-card-content>
          Who is this for?
        </ion-card-content>
      </ion-card>
      <ion-list>
        <ion-item>
          <ion-label>Assignment Type</ion-label>
          <ion-select v-model="achievement.type">
            <ion-select-option value="compete">Compete</ion-select-option>
            <ion-select-option value="collaborate">Collaborate</ion-select-option>
            <ion-select-option value="rotate">Rotate</ion-select-option>
            <ion-select-option value="asNeeded">As Needed</ion-select-option>
            <ion-select-option value="individual">Individual</ion-select-option>
          </ion-select>
        </ion-item>
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
      </ion-list>

    </ion-content>

    <ion-content v-if="activeSegment === 'schedule'">
      <ion-card>
        <ion-card-content>
          What is the schedule for this achievement?
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
              <ion-select v-model="achievement.customPeriodType">
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
              <ion-datetime-button
                v-model="achievement.startsOn"
                datetime="starts-on"
              />
              <ion-modal
                trigger="ok-button"
                ref="starts"
                :keep-contents-mounted="true"
              >
                <ion-datetime
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
            </ion-item>
            <ion-item>
              <ion-label>Ends On</ion-label>
              <ion-datetime-button
                v-model="achievement.endsOn"
                datetime="ends-on"
              />
              <ion-modal
                ref="ends"
                :keep-contents-mounted="true"
              >
                <ion-datetime
                  id="ends-on"
                  presentation="date"
                />
                <ion-button
                  @click="dismissModal"
                  expand="full"
                >
                  OK
                </ion-button>
              </ion-modal>
            </ion-item>
            <ion-item>
              <ion-label>Due By Time</ion-label>
              <ion-datetime-button
                v-model="achievement.dueByTime"
                display-format="h:mm A"
                datetime="due-by"
              >
                <!-- <div slot="date-target"><i class="fad fa-clock fa-lg"></i></div> -->
              </ion-datetime-button>
              <ion-modal :keep-contents-mounted="true">
                <ion-datetime
                  id="due-by"
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
            </ion-item>
          </ion-col>
        </ion-row>
      </ion-grid>

    </ion-content>


    <xp-add-category-modal
      :is-open="addCategoryModalOpen"
      @dismiss="addCategoryModalOpen = false"
      @add-category="addCategory"
    />

    <ion-footer>
      <ion-grid>
        <ion-row>
          <ion-col>
            <ion-button
              expand="block"
              @click="activeSegment = prevButton.text.toLowerCase()"
            >
              {{ prevButton.text }}
            </ion-button>
          </ion-col>
          <ion-col>
            <ion-button
              expand="full"
              @click="activeSegment = nextButton.text.toLowerCase()"
            >
              {{ nextButton.text }}
            </ion-button>
          </ion-col>
        </ion-row>
      </ion-grid>
    </ion-footer>
  </ion-page>
</template>

<script src="./XpAddAchievement" lang="ts" />
<style lang="scss" src="./_XpAddAchievement.scss" />

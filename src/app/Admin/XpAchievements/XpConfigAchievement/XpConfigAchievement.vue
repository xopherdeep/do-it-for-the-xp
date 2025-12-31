<template>
  <ion-page
    :class="$options.name"
    class="bg-transparent"
  >
    <ion-tabs>
      <XpWizardCoach :active-tab="activeTab" />
      <ion-router-outlet></ion-router-outlet>

      <!-- Single bottom tab bar -->
      <ion-tab-bar
        slot="bottom"
        class="icon-colors"
      >
        <ion-tab-button
          v-for="segment in segments"
          :key="segment.name"
          :tab="segment.path"
          :href="`/game-master/compendium/setup/achievements/config/${achievement.id}/${segment.path}`"
          :selected="activeTab === segment.path"
        >
          <i
            v-if="segment.name === 'Quest'"
            :class="activeLoreCombo.icon"
            class="fad fa-2x mb-1"
          />
          <i
            v-else-if="segment.name === 'Heros'"
            :class="activePartyType.icon"
            class="fad fa-2x mb-1"
          />
          <i
            v-else-if="segment.name === 'When'"
            :class="activeScheduleIcon"
            class="fad fa-2x mb-1"
          />
          <i
            v-else
            :class="segment.icon"
            class="fad fa-2x mb-1"
          />
          <ion-label>{{ segment.name }}</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>

    <!-- Shared Modals (moved inside ion-page but outside ion-tabs if they are truly global) -->
    <!-- Or keep them in the parent so children can trigger them via the shared state -->

    <!-- DateTime Modals -->
    <ion-modal
      :is-open="dueModalOpen"
      @didDismiss="dueModalOpen = false"
      :keep-contents-mounted="true"
      class="date-picker-modal"
    >
      <ion-datetime
        id="due-by"
        v-model="achievement.dueByTime"
        presentation="time"
        :show-default-buttons="true"
      >
        <div
          slot="buttons"
          style="display: flex; width: 100%; justify-content: flex-end;"
        >
          <ion-button
            fill="clear"
            @click="dueModalOpen = false"
          >Done</ion-button>
        </div>
      </ion-datetime>
    </ion-modal>

    <ion-modal
      :is-open="startsModalOpen"
      @didDismiss="startsModalOpen = false"
      :keep-contents-mounted="true"
      class="date-picker-modal"
    >
      <ion-datetime
        id="starts-on"
        v-model="achievement.startsOn"
        presentation="date"
        :show-default-buttons="true"
      >
        <div
          slot="buttons"
          style="display: flex; width: 100%; justify-content: flex-end;"
        >
          <ion-button
            fill="clear"
            @click="startsModalOpen = false"
          >Done</ion-button>
        </div>
      </ion-datetime>
    </ion-modal>

    <ion-modal
      :is-open="endsModalOpen"
      @didDismiss="endsModalOpen = false"
      :keep-contents-mounted="true"
      class="date-picker-modal"
    >
      <ion-datetime
        id="ends-on"
        v-model="achievement.endsOn"
        presentation="date"
      >
        <div
          slot="buttons"
          style="display: flex; width: 100%; justify-content: space-between; padding: 0 16px;"
        >
          <ion-button
            color="danger"
            fill="clear"
            @click="setNever"
          >Never</ion-button>
          <div style="display: flex; gap: 8px;">
            <ion-button
              color="primary"
              fill="clear"
              @click="endsModalOpen = false"
            >Done</ion-button>
          </div>
        </div>
      </ion-datetime>
    </ion-modal>

    <!-- Type Selector Modals -->


    <xp-type-selector-modal
      :is-open="showPartyTypeSelector"
      title="Quest Assignment"
      :options="assignmentTypes"
      :current-selection="achievement.type"
      @close="showPartyTypeSelector = false"
      @select="(val) => achievement.type = val"
    />

    <xp-add-category-modal
      :is-open="addCategoryModalOpen"
      :categories="categories"
      @dismiss="addCategoryModalOpen = false"
      @add-category="addCategory"
      @edit-categories="editCategories"
      @delete-category="deleteCategory"
    />

    <!-- Approval Info Modal -->
    <XpInfoToggleModal
      :is-open="showApprovalModal"
      title="Quest Verification"
      description="Decide how completion is verified. Choose between strict oversight or the path of integrity."
      icon="fa-clipboard-list-check"
      variant="approval"
      :current-value="achievement.requiresApproval"
      on-label="GM Review"
      off-label="Honor System"
      on-icon="fa-clipboard-list-check"
      off-icon="fa-trophy-alt"
      on-description="You must manually verify completion before rewards are distributed."
      off-description="Rewards are granted automatically. Trust your hero to mark their progress honestly."
      on-note="Reserved for high-stakes tasks. Beware: Manual review creates bottlenecks that can kill the game's momentum and the 'snappy' reward loop."
      off-note="The Honor System builds integrity. Doing the work honestly creates a far more satisfying character growth than 'God Mode' ever could."
      @close="showApprovalModal = false"
      @save="(val) => { toggleApproval(val); showApprovalModal = false }"
    />

    <!-- Bonus Info Modal -->
    <XpInfoToggleModal
      :is-open="showBonusModal"
      title="Quest Priority"
      description="Determine if this quest is a mandatory part of the hero's agenda or a special bonus opportunity."
      icon="fa-exclamation-circle"
      variant="bonus"
      :current-value="achievement.bonusAchievement"
      on-label="Bonus (Optional)"
      off-label="Required (!)"
      on-icon="fa-question-square"
      off-icon="fa-exclamation"
      on-description="An optional adventure for extra glory and rewards."
      off-description="Mandatory tasks that act as recurring enemies, nagging the hero and draining HP."
      on-note="Bonus Bounties provide variety and extra side-quests without the threat of HP loss."
      off-note="Required quests act like monsters that constantly attack. If left incomplete, they will chip away at the hero's health until defeated."
      @close="showBonusModal = false"
      @save="(val) => { toggleBonus(val); showBonusModal = false }"
    />

    <!-- Preview Modal -->
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

          <ion-item
            lines="none"
            v-if="achievement.type !== 'asNeeded' && achievement.assignee.length"
          >
            <ion-label position="stacked">The Chosen Heros</ion-label>
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
                {{ achievement.gp }}
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

<script lang="ts" src="./XpConfigAchievement.ts"></script>

<style lang="scss" scoped src="./_XpConfigAchievement.scss"></style>

<style lang="scss">
  ion-modal.date-picker-modal {
    --height: auto;
    --width: 100%;
    --max-width: 350px;
    --border-radius: 16px;
    --backdrop-opacity: 0.6;
    
    align-items: center;
    justify-content: center;

    &::part(content) {
      position: relative;
      width: 100%;
      margin: auto;
      border-radius: 16px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
      overflow: hidden;
    }
  }
</style>

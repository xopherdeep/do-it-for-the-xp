<template>
  <ion-page
    :class="[$options.name, rootClass]"
    :style="rootStyle"
  >
    <!-- The Game Master's quest config as steps (docs: compendium-wizards-design, W4). The header, dots, guide line,
         Back / Next and the verb are the shared XpWizardShell; the rules and the words of each step live in
         ../questConfigWizard.ts; each step's body is one of the old tabs. Autosave stays the draft mechanism. -->
    <xp-wizard-shell
      v-if="isOpen"
      v-model:index="position"
      :steps="steps"
      :draft="achievement"
      icon="scroll"
      verb="Ready"
      verb-icon="shield-check"
      :busy="isFinishing"
      @close="leave"
      @submit="makeReady"
    >
      <!-- 1. WHAT'S THE CHORE: the category, what the kind means, the beast or the chain -->
      <template #chore>
        <quest-type-tab />
      </template>

      <!-- 2. WHO DOES IT: the heroes (the five ways to share are at the bottom) -->
      <template #who>
        <quest-heros-tab />
      </template>

      <!-- 3. WHEN: start, end, due time, times of day, repeat -->
      <template #when>
        <quest-schedule-tab />
      </template>

      <!-- 4. HOW HARD: what the difficulty decides, the pay, approval and priority (the slider is at the bottom) -->
      <template #hard>
        <quest-rewards-tab />
      </template>

      <!-- 5. READY: the quest as the heroes will meet it; a tile jumps back to the step that owns it -->
      <template #ready>
        <quest-dashboard-tab @go="goToStep" />
      </template>

      <!-- The step's field sits at the bottom, above Back / Next, in thumb reach -->
      <template #above-nav="{ step }">
        <!-- Autosave state; a draft is saved but hidden from heroes until the quest is complete -->
        <button
          v-if="saveChip"
          type="button"
          class="save-chip"
          :class="`save-chip--${saveState}`"
          :aria-label="`${saveChip.label}: tap for details`"
          data-test="save-chip"
          @click="clickSaveChip"
        >
          <i :class="['fad', saveChip.icon]" aria-hidden="true"></i>
          <span>{{ saveChip.label }}</span>
        </button>

        <template v-if="step.id === 'chore'">
          <div
            class="xp-app-segments qc-segments"
            role="group"
            aria-label="Kind of chore"
          >
            <button
              v-for="kind in QUEST_KINDS"
              :key="kind.value"
              type="button"
              class="xp-app-segment"
              :class="{ 'is-active': adventureType === kind.value }"
              :aria-pressed="adventureType === kind.value"
              :data-test="`kind-${kind.value}`"
              @click="pickKind(kind.value)"
            >
              <i
                :class="['fad', `fa-${kind.icon}`]"
                aria-hidden="true"
              ></i>
              {{ kind.label }}
            </button>
          </div>
          <label class="xp-app-search">
            <i
              class="fad fa-scroll"
              aria-hidden="true"
            ></i>
            <input
              v-model="achievement.achievementName"
              type="text"
              autocomplete="off"
              enterkeyhint="done"
              maxlength="80"
              placeholder="Name of the chore"
              aria-label="Name of the chore"
              data-test="name"
              @keyup.enter="closeKeyboard"
            />
          </label>
        </template>

        <div
          v-else-if="step.id === 'who'"
          class="xp-app-segments qc-segments"
          role="group"
          aria-label="How the quest is shared"
        >
          <button
            v-for="choice in ASSIGNMENT_CHOICES"
            :key="choice.value"
            type="button"
            class="xp-app-segment"
            :class="{ 'is-active': achievement.type === choice.value }"
            :aria-pressed="achievement.type === choice.value"
            :data-test="`assignment-${choice.value}`"
            @click="pickAssignment(choice.value)"
          >
            {{ choice.label }}
          </button>
        </div>

        <!-- The one difficulty control: the Fibonacci steps, 1 to 144 -->
        <div
          v-else-if="step.id === 'hard'"
          class="qc-difficulty"
        >
          <ion-range
            class="qc-range"
            aria-label="Difficulty"
            :value="fibonacciIndex"
            :min="0"
            :max="fibonacciArray.length - 1"
            :snaps="true"
            :ticks="true"
            :pin="true"
            :pin-formatter="displayFibonacciValue"
            data-test="difficulty-range"
            @ionChange="handleDifficultyChange"
          >
            <span slot="start">{{ fibonacciArray[0] }}</span>
            <span slot="end">{{ fibonacciArray[fibonacciArray.length - 1] }}</span>
          </ion-range>
        </div>
      </template>
    </xp-wizard-shell>

    <ion-content v-else>
      <xp-loading />
    </ion-content>

    <!-- A new quest is ready: the fanfare, then the quest list -->
    <xp-hero-fanfare
      :open="showFanfare"
      :name="achievement.achievementName"
      :subtitle="fanfareSubtitle"
      title="A new quest appears!"
      action-text="To the quest list"
      :portrait="beastAvatarUrl || ''"
      @done="finishFanfare"
    />

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
        :first-day-of-week="weekStart"
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
        :first-day-of-week="weekStart"
        :min="minEndDate"
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

    <!-- The category list: a tap files the quest under it, a typed name that exists is picked, not added twice -->
    <xp-add-category-modal
      :is-open="addCategoryModalOpen"
      :categories="categories"
      :quest-counts="categoryQuestCounts"
      :current="achievement.categoryId"
      @dismiss="addCategoryModalOpen = false"
      @pick-category="pickCategory"
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

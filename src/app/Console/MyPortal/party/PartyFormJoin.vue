<template>
  <div class="party-formjoin" data-cy="party-formjoin">
    <p v-if="isReadOnly" class="party-formjoin__note">Only a Game Master can form a party or ask to join one.</p>

    <section class="party-formjoin__card">
      <h2>Join a party</h2>
      <p class="party-formjoin__note">Ask a friend's Game Master for their party code.</p>
      <input
        class="party-formjoin__input"
        data-cy="party-join-code"
        type="text"
        maxlength="20"
        autocapitalize="characters"
        placeholder="Party code"
        aria-label="Party code"
        :value="code"
        :disabled="isReadOnly"
        @input="code = ($event.target as HTMLInputElement).value"
      />
      <div class="party-formjoin__choices" role="group" aria-label="Which hero joins">
        <button
          v-for="hero in heroes"
          :key="hero.id"
          type="button"
          class="party-formjoin__choice"
          :class="{ 'is-chosen': isJoinHero(hero.id) }"
          :aria-pressed="isJoinHero(hero.id)"
          :disabled="cannotPick(hero)"
          :data-cy="`party-join-hero-${hero.id}`"
          @click="joinHero = hero.id"
        >
          {{ hero.name }}
        </button>
      </div>
      <p v-if="joinError" class="party-formjoin__error" data-cy="party-join-error">{{ joinError }}</p>
      <p v-if="joinResult" class="party-formjoin__ok" data-cy="party-join-result">{{ joinResult }}</p>
      <button type="button" class="party-formjoin__send is-primary" data-cy="party-join-send" :disabled="cannotJoin" @click="sendJoin">
        Ask to join
      </button>
    </section>

    <section class="party-formjoin__card">
      <h2>Form a party</h2>
      <input
        class="party-formjoin__input"
        data-cy="party-form-name"
        type="text"
        maxlength="40"
        placeholder="Party name"
        aria-label="Party name"
        :value="name"
        :disabled="isReadOnly"
        @input="name = ($event.target as HTMLInputElement).value"
      />
      <div class="party-formjoin__choices" role="group" aria-label="Banner emblem">
        <button
          v-for="emblem in PARTY_EMBLEMS"
          :key="emblem.id"
          type="button"
          class="party-formjoin__choice"
          :class="{ 'is-chosen': isEmblem(emblem.id) }"
          :aria-pressed="isEmblem(emblem.id)"
          :disabled="isReadOnly"
          :data-cy="`party-form-emblem-${emblem.id}`"
          @click="chosenEmblem = emblem.id"
        >
          {{ emblem.label }}
        </button>
      </div>
      <div class="party-formjoin__choices" role="group" aria-label="Who may share the code">
        <button
          type="button"
          class="party-formjoin__choice"
          :class="{ 'is-chosen': isRule('leader') }"
          :aria-pressed="isRule('leader')"
          :disabled="isReadOnly"
          data-cy="party-form-rule-leader"
          @click="rule = 'leader'"
        >
          Only the leader shares the code
        </button>
        <button
          type="button"
          class="party-formjoin__choice"
          :class="{ 'is-chosen': isRule('members') }"
          :aria-pressed="isRule('members')"
          :disabled="isReadOnly"
          data-cy="party-form-rule-members"
          @click="rule = 'members'"
        >
          Any member may share it
        </button>
      </div>
      <div class="party-formjoin__choices" role="group" aria-label="Who leads">
        <button
          v-for="hero in heroes"
          :key="hero.id"
          type="button"
          class="party-formjoin__choice"
          :class="{ 'is-chosen': isLeader(hero.id) }"
          :aria-pressed="isLeader(hero.id)"
          :disabled="cannotPick(hero)"
          :data-cy="`party-form-leader-${hero.id}`"
          @click="leaderHero = hero.id"
        >
          {{ hero.name }} leads
        </button>
      </div>
      <p v-if="formError" class="party-formjoin__error" data-cy="party-form-error">{{ formError }}</p>
      <p v-if="formedCode" class="party-formjoin__ok" data-cy="party-form-code">Your party code: {{ formedCode }}</p>
      <button type="button" class="party-formjoin__send is-primary" data-cy="party-form-send" :disabled="cannotForm" @click="sendForm">
        Form the party
      </button>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { usePartyMembership } from "@/hooks/usePartyMembership";
import { problemText } from "@/lib/services/party/partyProblemText";
import { PARTY_EMBLEMS, type HeroChoice } from "./partyEmblems";

const props = defineProps<{ heroes: HeroChoice[]; canManage: boolean }>();
const emit = defineEmits<{ (event: "formed", partyId: string): void }>();

const { createParty, requestJoin } = usePartyMembership();

const firstFree = props.heroes.find((hero) => !hero.staysHome)?.id ?? "";
const code = ref("");
const joinHero = ref(firstFree);
const joinError = ref("");
const joinResult = ref("");
const name = ref("");
const chosenEmblem = ref(PARTY_EMBLEMS[0].id);
const rule = ref<"leader" | "members">("leader");
const leaderHero = ref(firstFree);
const formError = ref("");
const formedCode = ref("");
const isBusy = ref(false);

const isReadOnly = computed(() => !props.canManage);
const cannotJoin = computed(() => isReadOnly.value || isBusy.value || code.value.trim() === "" || joinHero.value === "");
const cannotForm = computed(() => isReadOnly.value || isBusy.value || name.value.trim() === "" || leaderHero.value === "");

const cannotPick = (hero: HeroChoice): boolean => hero.staysHome || isReadOnly.value;
const isJoinHero = (id: string): boolean => id === joinHero.value;
const isLeader = (id: string): boolean => id === leaderHero.value;
const isEmblem = (id: string): boolean => id === chosenEmblem.value;
const isRule = (value: string): boolean => value === rule.value;

async function sendJoin(): Promise<void> {
  isBusy.value = true;
  joinError.value = "";
  joinResult.value = "";
  const result = await requestJoin(code.value, joinHero.value);
  isBusy.value = false;
  if (result.ok) {
    joinResult.value = `Asked to join ${result.value.partyName}. The party leader will answer.`;
    code.value = "";
  } else {
    joinError.value = problemText(result.problem);
  }
}

async function sendForm(): Promise<void> {
  isBusy.value = true;
  formError.value = "";
  formedCode.value = "";
  const result = await createParty({ name: name.value.trim(), emblem: chosenEmblem.value, inviteRule: rule.value, leaderId: leaderHero.value });
  isBusy.value = false;
  if (result.ok) {
    formedCode.value = result.value.code;
    emit("formed", result.value.party.id);
  } else {
    formError.value = problemText(result.problem);
  }
}
</script>

<style scoped lang="scss">
@use "./partyUi" as *;

.party-formjoin__card {
  @include party-window();
}

.party-formjoin__note {
  margin: 0 20px;
  color: var(--gs-text-dim);
}

.party-formjoin__input {
  width: 100%;
  min-height: 44px;
  margin: 8px 0;
  padding: 8px 12px;
  font-family: var(--gs-font);
  font-size: 1rem;
  color: var(--gs-text);
  background: var(--gs-bar);
  border: 2px solid var(--gs-button-edge);
  border-radius: var(--gs-radius);
}

.party-formjoin__choices {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 8px 0;
}

.party-formjoin__choice,
.party-formjoin__send {
  @include party-button();
}

.party-formjoin__send {
  width: 100%;
  margin-top: 8px;
}

.party-formjoin__error {
  color: var(--gs-danger);
}

.party-formjoin__ok {
  color: var(--gs-good);
}
</style>

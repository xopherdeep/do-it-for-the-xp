<template>
  <div class="party-outside" data-cy="party-outside">
    <p v-if="feedProblem" class="party-outside__problem" data-cy="party-outside-problem">{{ feedProblem }}</p>
    <p v-if="actionError" class="party-outside__problem" data-cy="party-outside-error">{{ actionError }}</p>

    <ion-card class="max-w-2xl" data-cy="party-requests">
      <ion-card-header>
        <ion-card-title>Join requests</ion-card-title>
        <ion-card-subtitle>Heroes who want into your parties, and the ones yours asked for</ion-card-subtitle>
      </ion-card-header>
      <ion-card-content>
        <p v-if="hasNoRequests">No requests waiting.</p>
        <ul class="party-outside__list">
          <li v-for="request in store.incoming" :key="request.id" :data-cy="`party-request-in-${request.id}`">
            <span>{{ request.card.nickname }} (Lv.{{ request.card.level }} {{ request.card.jobClass }}) wants to join {{ request.partyName }}</span>
            <button type="button" class="party-outside__button is-primary" :data-cy="`party-accept-${request.id}`" @click="answer(request, 'approve')">Accept</button>
            <button type="button" class="party-outside__button" :data-cy="`party-decline-${request.id}`" @click="answer(request, 'decline')">Decline</button>
          </li>
          <li v-for="request in store.outgoing" :key="request.id" :data-cy="`party-request-out-${request.id}`">
            <span>{{ request.card.nickname }} asked to join {{ request.partyName }}</span>
            <button type="button" class="party-outside__button" :data-cy="`party-withdraw-${request.id}`" @click="answer(request, 'decline')">Withdraw</button>
          </li>
        </ul>
      </ion-card-content>
    </ion-card>

    <ion-card class="max-w-2xl" data-cy="party-my-parties">
      <ion-card-header>
        <ion-card-title>Parties with other families</ion-card-title>
      </ion-card-header>
      <ion-card-content>
        <p v-if="hasNoParties">None yet. Form one or join one from My Party.</p>
        <section v-for="party in store.outside" :key="party.id" class="party-outside__party">
          <h3>{{ party.name }}</h3>
          <ul class="party-outside__list">
            <li v-for="member in ourMembers(party)" :key="member.heroId">
              <span>{{ member.card.nickname }}</span>
              <button type="button" class="party-outside__button" :data-cy="`party-leave-${party.id}-${member.heroId}`" @click="leaveParty(party.id, member.heroId)">
                Leave
              </button>
            </li>
          </ul>

          <div v-if="hasCode(party)" class="party-outside__code" :data-cy="`party-my-code-${party.id}`">
            <p>Party code: <strong :data-cy="`party-code-${party.id}`">{{ party.code }}</strong></p>
            <img v-if="qr[party.id]" :src="qr[party.id]" alt="QR code of the party code" :data-cy="`party-qr-${party.id}`" />
            <button type="button" class="party-outside__button" :data-cy="`party-rotate-${party.id}`" @click="newCode(party.id)">
              Make a new code
            </button>
          </div>
        </section>
      </ion-card-content>
    </ion-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle } from "@ionic/vue";
import QRCode from "qrcode";
import { usePartyControls } from "@/hooks/usePartyControls";
import type { ActionResult } from "@/hooks/usePartyCall";
import { usePartyFeed } from "@/hooks/usePartyFeed";
import { usePartyMembership } from "@/hooks/usePartyMembership";
import { problemText } from "@/lib/services/party/partyProblemText";
import type { WireParty, WireRequest } from "@/lib/services/party/partyWire";
import { usePartyStore } from "@/lib/store/stores/party";
import { useProStore } from "@/lib/store/stores/pro";

const store = usePartyStore();
const pro = useProStore();
const feed = usePartyFeed();
const { resolveRequest, removeHero } = usePartyMembership();
const { rotateCode } = usePartyControls();

const actionError = ref("");
const qr = ref<Record<string, string>>({});

const feedProblem = computed(() => {
  const problem = feed.problem.value;
  return problem ? problemText(problem) : "";
});
const hasNoRequests = computed(() => store.incoming.length === 0 && store.outgoing.length === 0);
const hasNoParties = computed(() => store.outside.length === 0);

/** Our own heroes in a party (hero ids are only unique inside a family, so the family id says which) */
const ourMembers = (party: WireParty) => party.members.filter((member) => member.familyId === pro.familyId);
const hasCode = (party: WireParty): boolean => typeof party.code === "string" && party.code !== "";

/** Runs one action and keeps its refusal, in words, where the page can show it */
async function settle(result: Promise<ActionResult<unknown>>): Promise<void> {
  const answer = await result;
  actionError.value = answer.ok ? "" : problemText(answer.problem);
}

const answer = (request: WireRequest, decision: "approve" | "decline") => settle(resolveRequest(request.partyId, request.id, decision));
const leaveParty = (partyId: string, heroId: string) => settle(removeHero(partyId, heroId));
const newCode = (partyId: string) => settle(rotateCode(partyId));

/** A QR of each code the site handed us, redrawn whenever a code changes */
async function drawCodes(): Promise<void> {
  const coded = store.outside.filter(hasCode);
  const drawn = await Promise.all(coded.map(async (party) => [party.id, await QRCode.toDataURL(String(party.code), { margin: 1, width: 200 })] as const));
  qr.value = Object.fromEntries(drawn);
}

watch(() => store.outside.map((party) => party.code), drawCodes, { immediate: true });
onMounted(() => feed.start());
</script>

<style scoped lang="scss">
.party-outside__problem {
  margin: 12px 16px;
  color: var(--gs-danger);
}

.party-outside__list {
  margin: 0;
  padding: 0;
  list-style: none;

  li {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    padding: 6px 0;
  }
}

.party-outside__button {
  min-height: 44px;
  padding: 6px 12px;
  font-family: var(--gs-font);
  color: var(--gs-text);
  background: var(--gs-button);
  border: 2px solid var(--gs-button-edge);
  border-radius: var(--gs-radius);

  &.is-primary {
    color: var(--gs-accent);
  }
}

.party-outside__code img {
  display: block;
  margin: 8px 0;
}
</style>

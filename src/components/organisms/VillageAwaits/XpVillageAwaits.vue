<template>
  <!-- The Game Master's prompt: an Earthbound text box that opens the approvals when chores wait on their word -->
  <button v-if="count > 0" type="button" class="village-awaits" data-test="village-awaits" @click="open">
    <span class="village-awaits__head">
      <i class="fad fa-clipboard-check" aria-hidden="true"></i>
      The village awaits your word
    </span>
    <span class="village-awaits__line">{{ line }}</span>
    <span class="village-awaits__go">Check them <i class="fad fa-caret-right" aria-hidden="true"></i></span>
  </button>
</template>

<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { play$fx } from "@/assets/fx";
import debug from "@/lib/utils/debug";
import { APPROVALS_LINK } from "@/lib/services/notifications/Notifications";
import { waitingClaims, refreshWaitingClaims } from "@/lib/services/quests/waitingClaims";
import { villageLine } from "./villageAwaits";
import { useUserStore } from "@/lib/store/stores/user";

const router = useRouter();
const userStore = useUserStore();
const claims = waitingClaims;
const count = computed(() => claims.value.length);

const nickOf = (heroId: string): string => {
  const hero = userStore.users[heroId];
  return hero?.name?.nick || hero?.name?.first || "A hero";
};
const line = computed(() => villageLine(claims.value, nickOf));

onMounted(() => {
  refreshWaitingClaims().catch((error) => debug.warn("[VillageAwaits] could not count the waiting claims", error));
});

const open = () => {
  play$fx("openMenu");
  void router.push(APPROVALS_LINK);
};
</script>

<style lang="scss" scoped src="./_XpVillageAwaits.scss" />

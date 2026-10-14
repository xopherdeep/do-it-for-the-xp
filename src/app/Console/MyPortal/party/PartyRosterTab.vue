<template>
  <div class="party-roster" data-cy="party-roster">
    <ion-list>
      <ion-item-group>
        <ion-item-divider>
          <ion-label>
            <i class="fad fa-crown text-yellow-500 mr-2"></i>
            Party Members
          </ion-label>
        </ion-item-divider>

        <ion-item
          v-for="member in members"
          :key="member.id"
          button
          :detail="true"
          data-cy="party-member-item"
          @click="emit('openProfile', member)"
        >
          <ion-avatar slot="start">
            <img :src="getMemberAvatar(member)" :alt="displayNameOf(member)" />
          </ion-avatar>

          <ion-label>
            <h2>
              {{ displayNameOf(member) }}
              <ion-badge v-if="isLeader(member)" color="warning">
                <i class="fad fa-crown"></i>
              </ion-badge>
            </h2>
            <h3>
              <ion-chip size="small" outline>
                <i class="fad fa-swords"></i>
                {{ member.jobClass || "Adventurer" }}
              </ion-chip>
              <ion-chip v-if="Boolean(member.race)" size="small" outline color="medium">
                {{ member.race }}
              </ion-chip>
            </h3>
            <p>
              <span class="text-success">Lv.{{ levelOf(member) }}</span>
            </p>
          </ion-label>

          <!-- Quick Actions -->
          <ion-buttons slot="end">
            <ion-button
              v-if="canManage"
              fill="clear"
              color="primary"
              aria-label="Link phone"
              data-cy="party-link-phone"
              @click.stop="emit('linkPhone', member)"
            >
              <i class="fad fa-mobile-alt"></i>
            </ion-button>
            <ion-button
              fill="clear"
              color="success"
              aria-label="Cheer member"
              @click.stop="emit('cheer', member)"
            >
              <ion-icon :icon="heartOutline"></ion-icon>
            </ion-button>
            <ion-button
              fill="clear"
              color="warning"
              aria-label="Poke member"
              @click.stop="emit('poke', member)"
            >
              <ion-icon :icon="handRightOutline"></ion-icon>
            </ion-button>
          </ion-buttons>
        </ion-item>

        <!-- Add Hero / Invite Family -->
        <ion-item
          button
          lines="none"
          class="add-member-item"
          data-cy="party-add-member"
          @click="emit('inviteMember')"
        >
          <ion-icon :icon="personAddOutline" slot="start" color="primary" class="text-xl" />
          <ion-label color="primary">
            <h2><strong>Add Hero / Invite Family</strong></h2>
            <p>Create a hero profile or link a kid's phone</p>
          </ion-label>
        </ion-item>
      </ion-item-group>
    </ion-list>

    <!-- Party Roles Legend -->
    <ion-card>
      <ion-card-header>
        <ion-card-title>
          <i class="fad fa-users-class mr-2"></i>
          Party Roles
        </ion-card-title>
      </ion-card-header>
      <ion-card-content>
        <ion-list lines="none">
          <ion-item>
            <ion-chip color="warning" slot="start">
              <i class="fad fa-crown"></i>
            </ion-chip>
            <ion-label>
              <h3>Leader</h3>
              <p>Creates quests, manages party settings</p>
            </ion-label>
          </ion-item>
          <ion-item>
            <ion-chip color="danger" slot="start">
              <i class="fad fa-medal"></i>
            </ion-chip>
            <ion-label>
              <h3>Champion</h3>
              <p>High XP earners who motivate others</p>
            </ion-label>
          </ion-item>
          <ion-item>
            <ion-chip color="success" slot="start">
              <i class="fad fa-heart"></i>
            </ion-chip>
            <ion-label>
              <h3>Support</h3>
              <p>Sends encouragement, helps with reminders</p>
            </ion-label>
          </ion-item>
          <ion-item>
            <ion-chip color="tertiary" slot="start">
              <i class="fad fa-binoculars"></i>
            </ion-chip>
            <ion-label>
              <h3>Scout</h3>
              <p>Discovers new quests/challenges</p>
            </ion-label>
          </ion-item>
        </ion-list>
      </ion-card-content>
    </ion-card>
  </div>
</template>

<script setup lang="ts">
import {
  IonAvatar,
  IonBadge,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonChip,
  IonIcon,
  IonItem,
  IonItemDivider,
  IonItemGroup,
  IonLabel,
  IonList,
} from "@ionic/vue";
import { heartOutline, handRightOutline, personAddOutline } from "ionicons/icons";
import appConfig from "@/app.config";
import type { PartyMember } from "@/lib/services/party/partyStats";

interface PartyRosterProps {
  members: PartyMember[];
  canManage?: boolean;
}

interface PartyRosterEmits {
  (event: "cheer", member: PartyMember): void;
  (event: "poke", member: PartyMember): void;
  (event: "openProfile", member: PartyMember): void;
  (event: "inviteMember"): void;
  (event: "linkPhone", member: PartyMember): void;
}

withDefaults(defineProps<PartyRosterProps>(), {
  canManage: true,
});

const emit = defineEmits<PartyRosterEmits>();

const isLeader = (member: PartyMember): boolean => member.role === "leader";

const levelOf = (member: PartyMember): number => member.stats?.level || 1;

const displayNameOf = (member: PartyMember): string => {
  return member.name?.nick || member.name?.full || "Hero";
};

const getMemberAvatar = (member: PartyMember): string => {
  return appConfig.$getUserAvatar(member);
};
</script>

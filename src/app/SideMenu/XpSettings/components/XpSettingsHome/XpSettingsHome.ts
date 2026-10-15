import { defineComponent } from 'vue'
import ionic from "@/lib/mixins/ionic";
const requireIconImg = require.context("@/assets/icons/", false, /\.svg$/);

import {
  arrowBack,
  pizzaOutline,
  pizzaSharp
} from "ionicons/icons"

interface SettingsItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  route: string;
  /** Nothing on the page works yet: the tile wears a Soon badge */
  soon?: boolean;
}

export default defineComponent({
  name: 'xp-settings-home',
  mixins: [ionic],
  setup() {
    // code

    // In the order a Game Master sets things up (who plays, what to play, how the app behaves), then what's coming
    const settingsItems: SettingsItem[] = [
      {
        id: 'family',
        title: 'Family',
        description: 'Add Game Masters and heroes, link phones, set item rules.',
        icon: require('@/assets/icons/team.png'),
        route: '/xp-settings/family'
      },
      {
        id: 'packs',
        title: 'Packs',
        description: 'Ready-made quests, beasts and rewards for any group.',
        icon: require('@/assets/icons/target.png'),
        route: '/xp-settings/packs'
      },
      {
        id: 'notifications',
        title: 'Alerts',
        description: 'Get a heads-up when a beast ambushes your hero.',
        icon: require('@/assets/icons/notification.png'),
        route: '/xp-settings/notifications'
      },
      {
        id: 'sound',
        title: 'Sound',
        description: 'Volume for music, sound effects and menus.',
        icon: require('@/assets/icons/listener.png'),
        route: '/xp-settings/sound'
      },
      {
        id: 'theme',
        title: 'Theme',
        description: 'The game style the app wears and its menu sounds.',
        icon: require('@/assets/icons/innovation.png'),
        route: '/xp-settings/theme'
      },
      {
        id: 'general',
        title: 'General',
        description: 'Back up everything to a file, or restore from one.',
        icon: require('@/assets/icons/settings.png'),
        route: '/xp-settings/general'
      },
      {
        id: 'pro',
        title: 'XP Pro',
        description: 'Your plan and key, or restore Pro on this device.',
        icon: require('@/assets/icons/new.png'),
        route: '/xp-settings/pro'
      },
      {
        id: 'account',
        title: 'Account',
        description: "The family's Town Hall account, plan and sign-in options.",
        icon: require('@/assets/icons/014-individual.svg'),
        route: '/xp-settings/account'
      },
      {
        id: 'chore',
        title: 'Chores',
        description: 'Family-wide chore rules, like late penalties and photo proof.',
        icon: require('@/assets/icons/innovation.png'),
        route: '/xp-settings/chore',
        soon: true
      },
      {
        id: 'reward',
        title: 'Rewards',
        description: 'Cash out GP and more reward rules.',
        icon: require('@/assets/icons/target.png'),
        route: '/xp-settings/reward',
        soon: true
      },
      {
        id: 'party',
        title: 'Party',
        description: 'Play together with other families.',
        icon: require('@/assets/icons/collaboration.png'),
        route: '/xp-settings/party',
        soon: true
      }
    ];

    // Two cards per row; an odd card out at the end takes the whole row.
    const isFullRow = (index: number) =>
      index === settingsItems.length - 1 && settingsItems.length % 2 === 1;

    return {
      arrowBack,
      requireIconImg,
      pizzaOutline,
      pizzaSharp,
      settingsItems,
      isFullRow
    };
  },
})
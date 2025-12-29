import { defineComponent } from 'vue';
import ionic from "@/lib/mixins/ionic";
const requireIconImg = require.context("@/assets/icons/");
import { arrowBack, pizzaOutline, pizzaSharp } from "ionicons/icons";
export default defineComponent({
    name: 'xp-settings-home',
    mixins: [ionic],
    setup() {
        // code
        const settingsItems = [
            {
                id: 'general',
                title: 'General',
                description: 'Customize your family setup and general preferences from here.',
                icon: require('@/assets/icons/settings.png'),
                route: '/xp-settings/general'
            },
            {
                id: 'family',
                title: 'Family Settings',
                description: 'Add kids, invite adults and manage your family settings from here.',
                icon: require('@/assets/icons/team.png'),
                route: '/xp-settings/family'
            },
            {
                id: 'chore',
                title: 'Chore',
                description: 'From photo proof to late penalty, everything to personalize your chore system',
                icon: require('@/assets/icons/innovation.png'),
                route: '/xp-settings/chore'
            },
            {
                id: 'notifications',
                title: 'Notifications',
                description: 'Setup who gets notified and when they get notified here',
                icon: require('@/assets/icons/notification.png'),
                route: '/xp-settings/notifications'
            },
            {
                id: 'reward',
                title: 'Reward',
                description: 'Your Gold Point to current conversion, cast-out and reward approval can be found here',
                icon: require('@/assets/icons/new.png'),
                route: '/xp-settings/reward'
            },
            {
                id: 'party',
                title: 'Party',
                description: 'All settings pertaining to your party can be found here...',
                icon: require('@/assets/icons/collaboration.png'),
                route: '/xp-settings/party'
            },
            {
                id: 'sound',
                title: 'Sound',
                description: 'Adjust your sound settings here.',
                icon: require('@/assets/icons/listener.png'),
                route: '/xp-settings/sound'
            },
            {
                id: 'theme',
                title: 'Theme',
                description: 'Customize app appearance, UI style, and game theme',
                icon: require('@/assets/icons/settings.png'),
                route: '/xp-settings/theme'
            }
        ];
        return {
            arrowBack,
            requireIconImg,
            pizzaOutline,
            pizzaSharp,
            settingsItems
        };
    },
});
//# sourceMappingURL=XpSettingsHome.js.map
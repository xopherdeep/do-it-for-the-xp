import SettingsMenu from './components/SettingsMenu.vue';
import GeneralSettings from './components/GeneralSettings.vue';
import FamilySettings from './components/FamilySettings.vue';
import SoundSettings from './components/SoundSettings.vue';
import PrivacySettings from './components/PrivacySettings.vue';
import AccountSettings from './components/AccountSettings.vue';

export default [
  {
    path: '',
    component: SettingsMenu,
    props: (route) => ({ menuItems: route.meta.menuItems })
  },
  {
    path: 'general',
    component: GeneralSettings
  },
  {
    path: 'family',
    component: FamilySettings
  },
  {
    path: 'sound',
    component: SoundSettings
  },
  {
    path: 'privacy',
    component: PrivacySettings
  },
  {
    path: 'account',
    component: AccountSettings
  }
];

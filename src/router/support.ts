import { RouteRecordRaw } from 'vue-router';

const supportRoutes: Array<RouteRecordRaw> = [
  {
    path: '/support',
    name: 'support',
    component: () => import('@/views/App/SideMenu/XpSupport/XpSupport.vue')
  },
  {
    path: '/support/faq',
    name: 'SupportFAQ',
    component: () => import('@/views/App/SideMenu/XpSupport/FAQ/FAQ.vue')
  },
  {
    path: '/support/help-videos',
    name: 'SupportHelpVideos',
    component: () => import('@/views/App/SideMenu/XpSupport/HelpVideos/HelpVideos.vue')
  },
  {
    path: '/support/user-manual',
    name: 'SupportUserManual',
    component: () => import('@/views/App/SideMenu/XpSupport/UserManual/UserManual.vue')
  },
  {
    path: '/support/feature-request',
    name: 'SupportFeatureRequest',
    component: () => import('@/views/App/SideMenu/XpSupport/FeatureRequest/FeatureRequest.vue')
  },
  {
    path: '/support/contact',
    name: 'SupportContact',
    component: () => import('@/views/App/SideMenu/XpSupport/Contact/Contact.vue')
  }
];

export default supportRoutes;

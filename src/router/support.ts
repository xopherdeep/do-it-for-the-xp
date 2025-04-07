import { RouteRecordRaw } from 'vue-router';

const supportRoutes: Array<RouteRecordRaw> = [
  {
    path: '/support',
    name: 'XpSupport',
    component: () => import('@/views/App/SideMenu/XpSupport/XpSupport.vue')
  },
  {
    path: '/support/faq',
    name: 'FAQ',
    component: () => import('@/views/App/SideMenu/XpSupport/FAQ/FAQ.vue')
  },
  {
    path: '/support/help-videos',
    name: 'HelpVideos',
    component: () => import('@/views/App/SideMenu/XpSupport/HelpVideos/HelpVideos.vue')
  },
  {
    path: '/support/user-manual',
    name: 'UserManual',
    component: () => import('@/views/App/SideMenu/XpSupport/UserManual/UserManual.vue')
  },
  {
    path: '/support/feature-request',
    name: 'FeatureRequest',
    component: () => import('@/views/App/SideMenu/XpSupport/FeatureRequest/FeatureRequest.vue')
  },
  {
    path: '/support/contact',
    name: 'Contact',
    component: () => import('@/views/App/SideMenu/XpSupport/Contact/Contact.vue')
  }
];

export default supportRoutes;

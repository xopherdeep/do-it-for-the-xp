import { RouteRecordRaw } from 'vue-router';

const supportRoutes: Array<RouteRecordRaw> = [
  {
    path: '/xp-support', // Changed path to match the side menu link
    name: 'support',
    component: () => import('@/app/SideMenu/XpSupport/XpSupport.vue')
  },
  {
    path: '/support/faq',
    name: 'support-faq',
    component: () => import('@/app/SideMenu/XpSupport/FAQ/FAQ.vue')
  },
  {
    path: '/support/help-videos',
    name: 'support-help-videos',
    component: () => import('@/app/SideMenu/XpSupport/HelpVideos/HelpVideos.vue')
  },
  {
    path: '/support/user-manual',
    name: 'support-user-manual',
    component: () => import('@/app/SideMenu/XpSupport/UserManual/UserManual.vue')
  },
  {
    path: '/support/feature-request',
    name: 'support-feature-request',
    component: () => import('@/app/SideMenu/XpSupport/FeatureRequest/FeatureRequest.vue')
  },
  {
    path: '/support/contact',
    name: 'support-contact',
    component: () => import('@/app/SideMenu/XpSupport/ContactPage/ContactPage.vue')
  },
  {
    path: '/support/dev-tools',
    name: 'dev-tools',
    component: () => import('@/app/SideMenu/XpSupport/DevTools/DevTools.vue')
  }
];

export default supportRoutes;

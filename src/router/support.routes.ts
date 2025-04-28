import { RouteRecordRaw } from 'vue-router';

const supportRoutes: Array<RouteRecordRaw> = [
  {
    path: '/xp-support', // Changed path to match the side menu link
    name: 'support',
    component: () => import('@/views/App/SideMenu/XpSupport/XpSupport.vue')
  },
  {
    path: '/support/faq',
    name: 'support-faq',
    component: () => import('@/views/App/SideMenu/XpSupport/FAQ/FAQ.vue')
  },
  {
    path: '/support/help-videos',
    name: 'support-help-videos',
    component: () => import('@/views/App/SideMenu/XpSupport/HelpVideos/HelpVideos.vue')
  },
  {
    path: '/support/user-manual',
    name: 'support-user-manual',
    component: () => import('@/views/App/SideMenu/XpSupport/UserManual/UserManual.vue')
  },
  {
    path: '/support/feature-request',
    name: 'support-feature-request',
    component: () => import('@/views/App/SideMenu/XpSupport/FeatureRequest/FeatureRequest.vue')
  },
  {
    path: '/support/contact',
    name: 'support-contact',
    component: () => import('@/views/App/SideMenu/XpSupport/ContactPage/ContactPage.vue')
  },
  {
    path: '/support/dev-tools',
    name: 'support-dev-tools',
    component: () => import('@/views/App/SideMenu/XpSupport/DevTools/DevTools.vue')
  }
];

export default supportRoutes;

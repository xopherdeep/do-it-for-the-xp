import { RouteRecordRaw } from 'vue-router';

const supportRoutes: Array<RouteRecordRaw> = [
  {
    path: '/xp-support',
    name: 'support',
    component: () => import('@/app/SideMenu/XpSupport/XpSupport.vue')
  },
  {
    path: '/support/faq',
    name: 'support-faq',
    component: () => import('@/app/SideMenu/XpSupport/FAQ/FAQ.vue')
  },
  {
    // There are no help videos yet: the old link opens the manual
    path: '/support/help-videos',
    redirect: { name: 'support-user-manual' }
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

// Dev Tools is only registered outside production builds
export default process.env.NODE_ENV === 'production'
  ? supportRoutes.filter(route => route.name !== 'dev-tools')
  : supportRoutes;

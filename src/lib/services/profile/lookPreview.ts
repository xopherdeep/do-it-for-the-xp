import { ref } from "vue";

/**
 * True while a screen is only trying a look on (the new-hero wizard's Style step): the app wears it, but the hero who
 * is signed in must not have it written onto their profile. The two sync hooks (useHeroSkinSync, useHeroThemeSync)
 * skip their write-back while this is on.
 */
export const isPreviewingLook = ref(false);

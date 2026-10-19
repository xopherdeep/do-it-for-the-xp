/**
 * Ionic keeps a visited page alive, so coming back to the Beast Log shows what it showed when the hero left (a beast
 * beaten in a battle would still read as due). The handler for the page's ionViewWillEnter: it reloads on every visit
 * after the first, because the first visit has just mounted and loaded the page itself.
 */
export const reloadOnReturn = (reload: () => void): (() => void) => {
  let hasEntered = false;
  return () => {
    const isFirstVisit = !hasEntered;
    hasEntered = true;
    if (isFirstVisit) return;
    reload();
  };
};

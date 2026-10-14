// The camera push for the building doors: the page under the transition (the router outlet) scales up around the
// building's door while the door grows to fill the screen, so the hero seems to walk right into it. Transforms only,
// on one element, so the phone's compositor does the work. The effect lives outside the outlet, so it never scales.

/** Where the hero is heading: a point on screen (CSS pixels) and the door's rough width there. */
export interface DoorFocus {
  x: number;
  y: number;
  size: number;
}

const OUTLET_ID = "main-content";

const outlet = (): HTMLElement | null => (typeof document === "undefined" ? null : document.getElementById(OUTLET_ID));

/** Drop every style the push set, so the page is exactly as it was. */
export const resetCamera = (): void => {
  const el = outlet();
  if (!el) return;
  el.style.removeProperty("transform");
  el.style.removeProperty("transform-origin");
  el.style.removeProperty("transition");
  el.style.removeProperty("will-change");
};

/** Start from `from` with no transition, then ease to `to` over `ms`. */
const animate = (el: HTMLElement, origin: string, from: string, to: string, ms: number, easing: string): void => {
  el.style.willChange = "transform";
  el.style.transformOrigin = origin;
  el.style.transition = "none";
  el.style.transform = from;
  void el.offsetWidth; // commit the start before the transition begins
  el.style.transition = `transform ${ms}ms ${easing}`;
  el.style.transform = to;
};

/** Push the camera in toward the door: the page grows around the focus point. */
export const pushCamera = (focus: DoorFocus, scale: number, ms: number): void => {
  const el = outlet();
  if (!el) return;
  const box = el.getBoundingClientRect();
  const origin = `${focus.x - box.left}px ${focus.y - box.top}px`;
  animate(el, origin, "none", `scale(${scale})`, ms, "cubic-bezier(0.55, 0, 0.9, 0.55)");
};

/** The last step of the push once inside (or the pull back on the way out): the new page settles from `scale`. */
export const settleCamera = (scale: number, ms: number): void => {
  const el = outlet();
  if (!el) return;
  animate(el, "50% 50%", `scale(${scale})`, "none", ms, "cubic-bezier(0.2, 0.7, 0.3, 1)");
};

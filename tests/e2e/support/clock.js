// A live offset on the page's Date for the e2e specs: the "next day", or a strike clock run out, without cy.clock.
// cy.clock freezes Date, and the battle's own guards read Date.now (the 250 ms double-tap guard on Done!, the strike
// clock), so a frozen Date would swallow taps and stop the clock. The offset keeps time moving: set `clock.shiftMs` and
// the open page's Date moves with it (it is read live, on every call).

/** How far the page's Date is ahead of the real one. */
export const clock = { shiftMs: 0 };

/** Replaces `win.Date` with one that reports real time plus `clock.shiftMs`. Run it in window:before:load, before the page's own scripts. */
export const installClock = (win) => {
  const RealDate = win.Date;
  if (RealDate.isShifted) return;
  function ShiftedDate() {
    const isCalledAsFunction = !(this instanceof ShiftedDate);
    if (isCalledAsFunction) return new RealDate(RealDate.now() + clock.shiftMs).toString();
    const args = arguments.length ? Array.prototype.slice.call(arguments) : [RealDate.now() + clock.shiftMs];
    return Reflect.construct(RealDate, args, ShiftedDate);
  }
  ShiftedDate.prototype = RealDate.prototype;
  Object.setPrototypeOf(ShiftedDate, RealDate);
  ShiftedDate.now = () => RealDate.now() + clock.shiftMs;
  ShiftedDate.isShifted = true;
  win.Date = ShiftedDate;
};

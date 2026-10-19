import { reloadOnReturn } from "../reloadOnReturn";

describe("reloadOnReturn", () => {
  it("skips the first visit, because the page loads itself when it mounts", () => {
    const reload = jest.fn();
    const onEnter = reloadOnReturn(reload);

    onEnter();

    expect(reload).not.toHaveBeenCalled();
  });

  it("reloads every time the hero comes back to the page", () => {
    const reload = jest.fn();
    const onEnter = reloadOnReturn(reload);

    onEnter();
    onEnter();
    onEnter();

    expect(reload).toHaveBeenCalledTimes(2);
  });

  it("keeps separate visit counts for separate pages", () => {
    const first = jest.fn();
    const second = jest.fn();
    const enterFirst = reloadOnReturn(first);
    const enterSecond = reloadOnReturn(second);

    enterFirst();
    enterFirst();
    enterSecond();

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).not.toHaveBeenCalled();
  });
});

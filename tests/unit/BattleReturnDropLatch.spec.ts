/**
 * The battle return offers a won fight's drop once per room, and a room is a floor plus a row and column: the floor
 * rides in the route's ?level, and two floors share their x and y. Pure: no Vue, no storage.
 */
import { isReturnRoom, returnRoomKey, shouldRevealReturnDrop } from "@/lib/services/temples/battleReturnDrop";

const standing = (level: string, position: [number, number]) => ({ level, position });

describe("returnRoomKey", () => {
  it("keeps the same row and column on two floors apart", () => {
    expect(returnRoomKey("1F", [0, 1])).not.toBe(returnRoomKey("2F", [0, 1]));
  });

  it("is the same for the same floor, row and column", () => {
    expect(returnRoomKey("2F", [3, 4])).toBe(returnRoomKey("2F", [3, 4]));
  });
});

describe("isReturnRoom", () => {
  it("is the room the route names, on the floor it names", () => {
    expect(isReturnRoom([0, 1], "2F", standing("2F", [0, 1]))).toBe(true);
  });

  it("is not the same row and column on another floor", () => {
    expect(isReturnRoom([0, 1], "2F", standing("1F", [0, 1]))).toBe(false);
  });

  it("is not another room on the named floor", () => {
    expect(isReturnRoom([0, 1], "2F", standing("2F", [1, 1]))).toBe(false);
  });

  it("goes by the room alone when the route names no floor", () => {
    expect(isReturnRoom([0, 1], undefined, standing("3F", [0, 1]))).toBe(true);
    expect(isReturnRoom([0, 1], undefined, standing("3F", [0, 2]))).toBe(false);
  });
});

describe("shouldRevealReturnDrop", () => {
  const base = { returnsTo: [0, 1] as [number, number], returnsLevel: "1F" as string | undefined, offered: new Set<string>(), isDropWaiting: true };

  it("reveals a drop waiting in the room the battle returned to", () => {
    expect(shouldRevealReturnDrop({ ...base, standing: standing("1F", [0, 1]) })).toBe(true);
  });

  it("reveals nothing when no drop waits there", () => {
    expect(shouldRevealReturnDrop({ ...base, standing: standing("1F", [0, 1]), isDropWaiting: false })).toBe(false);
  });

  it("reveals nothing in a room the battle did not return to", () => {
    expect(shouldRevealReturnDrop({ ...base, standing: standing("1F", [0, 2]) })).toBe(false);
  });

  it("reveals nothing once this room's drop was offered", () => {
    const offered = new Set([returnRoomKey("1F", [0, 1])]);
    expect(shouldRevealReturnDrop({ ...base, standing: standing("1F", [0, 1]), offered })).toBe(false);
  });

  it("still reveals a second drop at the same row and column on another floor", () => {
    const offered = new Set([returnRoomKey("1F", [0, 1])]);
    const second = { ...base, returnsLevel: "2F", offered };
    expect(shouldRevealReturnDrop({ ...second, standing: standing("2F", [0, 1]) })).toBe(true);
  });

  it("does not reveal on the old floor when the route now names another", () => {
    const second = { ...base, returnsLevel: "2F" };
    expect(shouldRevealReturnDrop({ ...second, standing: standing("1F", [0, 1]) })).toBe(false);
  });

  it("still offers each floor's drop once", () => {
    const offered = new Set([returnRoomKey("1F", [0, 1]), returnRoomKey("2F", [0, 1])]);
    const second = { ...base, returnsLevel: "2F", offered };
    expect(shouldRevealReturnDrop({ ...second, standing: standing("2F", [0, 1]) })).toBe(false);
  });
});

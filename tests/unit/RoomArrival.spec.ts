import { nextTick, ref } from "vue";
import { useRoomArrival } from "@/app/Console/TempleGrounds/templeGrounds/useRoomArrival";

describe("stepping to the next room", () => {
  const walk = async (from: [number, number], to: [number, number]) => {
    const position = ref<[number, number]>(from);
    const room = useRoomArrival(position);
    position.value = to;
    await nextTick();
    return room;
  };

  it("knows the way the hero walked", async () => {
    const { arrival } = await walk([2, 2], [2, 3]);
    expect(arrival.value).toEqual({ key: 1, dx: 1, dy: 0 });
  });

  it("reads north as up", async () => {
    expect((await walk([2, 2], [1, 2])).arrival.value).toMatchObject({ dx: 0, dy: -1 });
  });

  it("replays on every step, even the same way twice", async () => {
    const position = ref<[number, number]>([0, 0]);
    const { arrival } = useRoomArrival(position);
    position.value = [0, 1];
    await nextTick();
    position.value = [0, 2];
    await nextTick();
    expect(arrival.value?.key).toBe(2);
  });

  it("does nothing for a jump that is not one step", async () => {
    const { arrival } = await walk([0, 0], [3, 4]);
    expect(arrival.value).toBeNull();
  });
});

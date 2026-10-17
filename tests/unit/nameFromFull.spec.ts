import { nameFromFull } from "@/lib/utils/User/user";

/** The name box takes "First M. Last a.k.a. Nickname": the middle name and the nickname are both optional. */
describe("nameFromFull", () => {
  it("reads first, middle and last, and the nickname after a.k.a.", () => {
    const name = nameFromFull({ full: "Sam J. Smith a.k.a. Sammy" });
    expect(name).toMatchObject({ first: "Sam", middle: "J.", last: "Smith", nick: "Sammy" });
  });

  it("still reads the older spelling, aka, in any case", () => {
    expect(nameFromFull({ full: "Alex Kim aka Lex" })).toMatchObject({ first: "Alex", last: "Kim", nick: "Lex" });
    expect(nameFromFull({ full: "Alex Kim AKA Lex" }).nick).toBe("Lex");
    expect(nameFromFull({ full: "Alex Kim A.K.A Lex" }).nick).toBe("Lex");
  });

  it("takes a nickname with spaces, and a name with no nickname falls back to the first name", () => {
    expect(nameFromFull({ full: "Max Power a.k.a. Mad Max" }).nick).toBe("Mad Max");
    expect(nameFromFull({ full: "Max Power" })).toMatchObject({ first: "Max", last: "Power", nick: "Max" });
  });

  it("does not mistake a name that merely contains the letters for the marker", () => {
    expect(nameFromFull({ full: "Aka Tanaka" })).toMatchObject({ first: "Aka", last: "Tanaka", nick: "Aka" });
    expect(nameFromFull({ full: "Hakata Maki" }).nick).toBe("Hakata");
  });
});

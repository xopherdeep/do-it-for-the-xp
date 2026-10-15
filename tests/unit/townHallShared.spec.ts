import { plainText } from "@/app/Console/MyPortal/HomeTown/TownHall/components/townHallShared";

describe("plainText", () => {
  it("reads the words of a title WordPress rendered, entities and all", () => {
    expect(plainText("Ideas &amp; Suggestions")).toBe("Ideas & Suggestions");
    expect(plainText("It&#8217;s <em>big</em> news")).toBe("It’s big news");
  });

  it("drops tags and scripts instead of passing them on", () => {
    expect(plainText('Hi<script>alert(1)</script><img src="x" onerror="alert(2)"> there')).toBe("Hi there");
  });

  it("gives nothing for nothing", () => {
    expect(plainText("")).toBe("");
    expect(plainText(null)).toBe("");
    expect(plainText(undefined)).toBe("");
  });
});

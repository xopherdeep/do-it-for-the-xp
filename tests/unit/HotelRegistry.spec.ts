import {
  HOTEL_METADATA,
  getAllHotels,
  getHotelByWorld,
  getHotelMetadata,
} from "@/lib/engine/core/hotelRegistry";
import { WORLD_METADATA, getAllWorlds } from "@/lib/engine/core/worldRegistry";
import { parentOf } from "@/router/parentOf";

describe("HotelRegistry & World Lodging", () => {
  const REGIONAL_WORLDS = [
    "plains",
    "islands",
    "forest",
    "mountains",
    "desert",
    "swamps",
    "ice",
    "clouds",
    "moon",
  ];

  describe("HOTEL_METADATA definitions", () => {
    it("defines entries for all 9 regional worlds plus hometown", () => {
      const allHotels = getAllHotels();
      expect(allHotels.length).toBe(10);

      const worldsWithHotels = allHotels.map((h) => h.world);
      expect(worldsWithHotels).toContain("hometown");
      REGIONAL_WORLDS.forEach((world) => {
        expect(worldsWithHotels).toContain(world);
      });
    });

    it("includes valid metadata fields for every hotel", () => {
      getAllHotels().forEach((hotel) => {
        expect(hotel.id).toBeTruthy();
        expect(hotel.name).toBeTruthy();
        expect(hotel.description).toBeTruthy();
        expect(hotel.world).toBeTruthy();
        expect(hotel.icon).toBe("hotel");
        expect(hotel.clerkName).toBeTruthy();
        expect(hotel.badgeLabel).toBeTruthy();
      });
    });

    it("provides thematic unique names and clerks per world", () => {
      const forestHotel = getHotelByWorld("forest");
      expect(forestHotel?.name).toBe("Canopy Lodge");
      expect(forestHotel?.clerkName).toBe("Lodge Keeper Bramble");

      const plainsHotel = getHotelByWorld("plains");
      expect(plainsHotel?.name).toBe("Windward Inn");
      expect(plainsHotel?.clerkName).toBe("Innkeeper Zephyr");

      const islandsHotel = getHotelByWorld("islands");
      expect(islandsHotel?.name).toBe("Coral Cove Resort");
      expect(islandsHotel?.clerkName).toBe("Concierge Marina");

      const moonHotel = getHotelByWorld("moon");
      expect(moonHotel?.name).toBe("Lunar Orbital Suites");
      expect(moonHotel?.clerkName).toBe("Steward Astra");
    });
  });

  describe("Lookup helpers", () => {
    it("resolves hotel by world (case-insensitive)", () => {
      expect(getHotelByWorld("FOREST")?.id).toBe("forest-hotel");
      expect(getHotelByWorld("mountains")?.id).toBe("mountains-hotel");
      expect(getHotelByWorld("desert")?.id).toBe("desert-hotel");
      expect(getHotelByWorld("ice")?.id).toBe("ice-hotel");
      expect(getHotelByWorld("clouds")?.id).toBe("clouds-hotel");
      expect(getHotelByWorld("swamps")?.id).toBe("swamps-hotel");
    });

    it("falls back to hometown hotel for unknown or empty world", () => {
      expect(getHotelByWorld(undefined)?.id).toBe("hometown-hotel");
      expect(getHotelByWorld(null)?.id).toBe("hometown-hotel");
      expect(getHotelMetadata("unknown-world")?.id).toBe("hometown-hotel");
    });

    it("resolves hotel by ID via getHotelMetadata", () => {
      expect(getHotelMetadata("forest-hotel")?.name).toBe("Canopy Lodge");
      expect(getHotelMetadata("plains-hotel")?.name).toBe("Windward Inn");
    });
  });

  describe("World Registry Integration", () => {
    it("associates hotelId with each world in WORLD_METADATA", () => {
      getAllWorlds().forEach((world) => {
        expect(world.hotelId).toBeTruthy();
        const hotel = getHotelMetadata(world.hotelId);
        expect(hotel.world).toBe(world.id);
      });
    });
  });

  describe("Parent routing resolution for hotel pages", () => {
    const heroId = "hero-777";

    it("resolves Hometown as parent when visiting hotel in hometown or with no world param", () => {
      const hometownHotel = { name: "hotel", params: { userId: heroId } };
      expect(parentOf(hometownHotel)).toBe(`/my-portal/${heroId}/home-town`);

      const explicitHometown = { name: "hotel", params: { userId: heroId, world: "hometown" } };
      expect(parentOf(explicitHometown)).toBe(`/my-portal/${heroId}/home-town`);
    });

    it("resolves the respective regional world page when visiting a regional hotel", () => {
      expect(parentOf({ name: "hotel", params: { userId: heroId, world: "plains" } })).toBe(
        `/my-portal/${heroId}/plains`
      );
      expect(parentOf({ name: "hotel", params: { userId: heroId, world: "forest" } })).toBe(
        `/my-portal/${heroId}/forest`
      );
      expect(parentOf({ name: "hotel", params: { userId: heroId, world: "islands" } })).toBe(
        `/my-portal/${heroId}/islands`
      );
      expect(parentOf({ name: "hotel", params: { userId: heroId, world: "mountains" } })).toBe(
        `/my-portal/${heroId}/mountains`
      );
      expect(parentOf({ name: "hotel", params: { userId: heroId, world: "desert" } })).toBe(
        `/my-portal/${heroId}/sands`
      );
      expect(parentOf({ name: "hotel", params: { userId: heroId, world: "swamps" } })).toBe(
        `/my-portal/${heroId}/swamps`
      );
      expect(parentOf({ name: "hotel", params: { userId: heroId, world: "ice" } })).toBe(
        `/my-portal/${heroId}/world-ice`
      );
      expect(parentOf({ name: "hotel", params: { userId: heroId, world: "clouds" } })).toBe(
        `/my-portal/${heroId}/clouds`
      );
      expect(parentOf({ name: "hotel", params: { userId: heroId, world: "moon" } })).toBe(
        `/my-portal/${heroId}/the-moon`
      );
    });
  });
});

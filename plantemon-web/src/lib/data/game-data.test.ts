import { afterEach, describe, expect, it } from "vitest";

import { moveBase, getMove } from "./move-base";
import { getMoveIdsForTaxonomy, groupNames, resolveGroupId } from "./taxonomy-move-map";
import { toTaxonomy } from "./taxonomy";
import { createFromApi, buildFallbackPlant } from "@/lib/domain/plant-factory";
import { resetRng, setRng } from "@/lib/domain/rng";

describe("move base", () => {
  it("loads every move from moves.json keyed by id", () => {
    expect(moveBase.size).toBe(21);
    expect(getMove(0).getName()).toBe("Photosynthesis");
    expect(getMove(1).getName()).toBe("Tropical Spore");
    // id 11 is listed out of order in the source file, between 8 and 9.
    expect(getMove(11).getName()).toBe("Papery Illusion");
  });

  it("preserves move stats", () => {
    const tropicalSpore = getMove(1);
    expect(tropicalSpore.getAttack()).toBe(12);
    expect(tropicalSpore.getDefense()).toBe(5);
    expect(tropicalSpore.getAccuracy()).toBe(85);
  });
});

describe("taxonomy to move pool", () => {
  const taxonomyFor = (phylum: string, className: string) =>
    toTaxonomy({ phylum, class: className, genus: "", order: "", family: "" });

  it("routes non-vascular plants to the moss pool", () => {
    expect(resolveGroupId(taxonomyFor("Bryophyta", "Bryopsida"))).toBe(0);
    expect(groupNames.get(0)).toBe("Non-Vascular");
  });

  it("routes ferns to the spore-vascular pool", () => {
    expect(resolveGroupId(taxonomyFor("Tracheophyta", "Polypodiopsida"))).toBe(1);
  });

  it("routes conifers to the gymnosperm pool", () => {
    expect(resolveGroupId(taxonomyFor("Tracheophyta", "Pinopsida"))).toBe(2);
  });

  it("falls through to angiosperms", () => {
    expect(resolveGroupId(taxonomyFor("Tracheophyta", "Magnoliopsida"))).toBe(3);
  });

  it("treats missing taxonomy as non-vascular", () => {
    // toTaxonomy defaults phylum to "Unknown", which is not Tracheophyta.
    expect(resolveGroupId(toTaxonomy(null))).toBe(0);
  });

  it("gives every group at least the four moves a plant needs", () => {
    for (const groupId of groupNames.keys()) {
      const pool = getMoveIdsForTaxonomy(
        groupId === 0
          ? toTaxonomy(null)
          : taxonomyFor("Tracheophyta", ["", "Polypodiopsida", "Pinopsida", "Magnoliopsida"][groupId]),
      );
      expect(pool.length).toBeGreaterThanOrEqual(4);
      // Every referenced move id must exist in moves.json.
      for (const id of pool) expect(() => getMove(id)).not.toThrow();
    }
  });
});

describe("plant factory", () => {
  afterEach(() => resetRng());

  it("builds a plant with exactly four moves and a speed in [5, 20]", () => {
    setRng(() => 0.5);
    const plant = createFromApi(
      {
        name: "Monstera deliciosa",
        taxonomy: { phylum: "Tracheophyta", class: "Magnoliopsida", genus: "Monstera" },
        description_value: "A climbing evergreen.",
        best_watering: "Weekly",
      },
      "/sprites/monstera.png",
    );

    expect(plant.getName()).toBe("Monstera deliciosa");
    expect(plant.getMoves()).toHaveLength(4);
    expect(plant.getSpeed()).toBeGreaterThanOrEqual(5);
    expect(plant.getSpeed()).toBeLessThanOrEqual(20);
    expect(plant.getCurrentHealth()).toBe(100);
    expect(plant.description).toBe("A climbing evergreen.");
    // Taxonomy is persisted as a JSON string, matching the Java field type.
    expect(JSON.parse(plant.taxonomy!).genus).toBe("Monstera");
  });

  it("draws moves only from the pool matching the plant's taxonomy", () => {
    setRng(() => 0.5);
    const plant = createFromApi(
      { name: "Fern", taxonomy: { phylum: "Tracheophyta", class: "Polypodiopsida" } },
      null,
    );
    const fernPool = getMoveIdsForTaxonomy(
      toTaxonomy({ phylum: "Tracheophyta", class: "Polypodiopsida" }),
    );
    const allowed = new Set(fernPool.map((id) => getMove(id).getName()));
    for (const move of plant.getMoves()) {
      expect(allowed).toContain(move.getName());
    }
  });

  it("gives hand-named plants the fallback moveset from ScanActivity", () => {
    const plant = buildFallbackPlant("Mystery Plant", null);
    expect(
      plant.getMoves().map((m) => [m.getName(), m.getAttack(), m.getDefense(), m.getAccuracy()]),
    ).toEqual([
      ["Tackle", 15, 0, 90],
      ["Vine Whip", 20, 0, 85],
      ["Leaf Shield", 0, 10, 100],
      ["Solar Blast", 35, -5, 75],
    ]);
  });

  it("rolls fallback speed in [5, 24], the wider ScanActivity range", () => {
    setRng(() => 0); // lowest draw
    expect(buildFallbackPlant("Low", null).getSpeed()).toBe(5);
    setRng(() => 0.999); // highest draw
    expect(buildFallbackPlant("High", null).getSpeed()).toBe(24);
  });
});

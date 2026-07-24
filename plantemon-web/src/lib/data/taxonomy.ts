/** Port of database/Taxonomy.java — the taxonomy block of a Plant.id response. */
export interface Taxonomy {
  class: string;
  genus: string;
  order: string;
  family: string;
  phylum: string;
}

const UNKNOWN = "Unknown";

/**
 * Builds a Taxonomy from raw API JSON, defaulting every rank to "Unknown" when
 * the block is absent — matching the Java null-data constructor.
 */
export function toTaxonomy(data: Record<string, unknown> | null | undefined): Taxonomy {
  if (!data) {
    return { class: UNKNOWN, genus: UNKNOWN, order: UNKNOWN, family: UNKNOWN, phylum: UNKNOWN };
  }
  const str = (key: string) => (typeof data[key] === "string" ? (data[key] as string) : "");
  return {
    class: str("class"),
    genus: str("genus"),
    order: str("order"),
    family: str("family"),
    phylum: str("phylum"),
  };
}

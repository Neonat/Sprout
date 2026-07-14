/**
 * Plant.id v3 proxy. Mirrors PlantApiService.java.
 * Client sends base64 image; we forward to Plant.id with the secret key.
 */
export interface PlantIdResult {
  name: string;
  commonNames: string[];
  description: string | null;
  watering: string | null;
  sunlight: string | null;
  soil: string | null;
  toxicity: string | null;
  culturalSignificance: string | null;
  taxonomy: {
    class?: string;
    genus?: string;
    order?: string;
    family?: string;
    phylum?: string;
  };
}

export async function identify(imageBase64: string): Promise<PlantIdResult> {
  const apiKey = process.env.PLANT_API_KEY;
  if (!apiKey) throw new Error("PLANT_API_KEY not configured");

  const detailFields = [
    "common_names",
    "description",
    "watering",
    "best_light_condition",
    "best_soil_type",
    "toxicity",
    "cultural_significance",
    "taxonomy",
  ].join(",");

  const url = `https://api.plant.id/v3/identification?details=${detailFields}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Api-Key": apiKey,
    },
    body: JSON.stringify({
      images: [imageBase64.startsWith("data:") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`],
      similar_images: false,
    }),
  });

  if (!resp.ok) {
    throw new Error(`Plant.id ${resp.status}: ${await resp.text()}`);
  }
  const json = (await resp.json()) as any;

  const suggestion = json?.result?.classification?.suggestions?.[0];
  if (!suggestion) throw new Error("Plant.id returned no suggestion");

  const details = suggestion.details ?? {};
  const tax = details.taxonomy ?? {};

  return {
    name: suggestion.name,
    commonNames: details.common_names ?? [],
    description: details.description?.value ?? null,
    watering: details.watering?.max ? String(details.watering.max) : null,
    sunlight: details.best_light_condition ?? null,
    soil: details.best_soil_type ?? null,
    toxicity: details.toxicity ?? null,
    culturalSignificance: details.cultural_significance ?? null,
    taxonomy: {
      class: tax.class,
      genus: tax.genus,
      order: tax.order,
      family: tax.family,
      phylum: tax.phylum,
    },
  };
}

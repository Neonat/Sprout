/**
 * The reshaped Plant.id payload, as produced by
 * PlantApiService.extractPlantInfo in the Java original and now by
 * /api/identify. This is the contract between the proxy route and PlantFactory.
 */
export interface PlantIdentification {
  name: string;
  probability?: number;
  common_names?: string[] | null;
  taxonomy?: Record<string, unknown> | null;
  description_value?: string;
  description_citation?: string;
  best_light_condition?: string;
  best_soil_type?: string;
  common_uses?: string;
  cultural_significance?: string;
  toxicity?: string;
  best_watering?: string;
}

export interface IdentificationError {
  error: string;
}

export function isIdentificationError(
  value: PlantIdentification | IdentificationError,
): value is IdentificationError {
  return "error" in value && typeof value.error === "string";
}

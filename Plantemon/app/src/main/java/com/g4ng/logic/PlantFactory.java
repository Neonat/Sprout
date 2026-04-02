package com.g4ng.logic;

import com.g4ng.model.Plant;
import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

public class PlantFactory {
    
    /** 
     * Assembles a Plant using external API data and AI images. 
     */
    public Plant createFromApi(String apiDataJson, Object aiSprite) {
        try {
            JSONObject data = new JSONObject(apiDataJson);
            
            // Check if there was an error in the response
            if (data.has("error")) {
                return null;
            }

            String name = data.optString("name", "Unknown Plant");
            Plant plant = new Plant(name, aiSprite);

            // Extract metadata
            JSONArray commonNamesJson = data.optJSONArray("common_names");
            if (commonNamesJson != null) {
                List<String> commonNames = new ArrayList<>();
                for (int i = 0; i < commonNamesJson.length(); i++) {
                    commonNames.add(commonNamesJson.getString(i));
                }
                plant.setCommonNames(commonNames);
            }

            plant.setDescription(data.optString("description_value"));
            
            JSONObject taxonomy = data.optJSONObject("taxonomy");
            if (taxonomy != null) {
                plant.setTaxonomy(taxonomy.toString());
            }

            plant.setBestLightCondition(data.optString("best_light_condition"));
            plant.setBestSoilType(data.optString("best_soil_type"));
            plant.setCommonUses(data.optString("common_uses"));
            plant.setCulturalSignificance(data.optString("cultural_significance"));
            plant.setToxicity(data.optString("toxicity"));
            plant.setBestWatering(data.optString("best_watering"));

            return plant;

        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }
    }

    public Plant createFromScan(String apiDataJson, Object aiSprite) {
        return createFromApi(apiDataJson, aiSprite);
    }
}
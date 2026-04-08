package com.g4ng.logic;

import com.g4ng.database.MoveBase;
import com.g4ng.database.Taxonomy;
import com.g4ng.database.TaxonomyMoveMapBase;
import com.g4ng.model.Plant;
import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class PlantFactory {

    /** Assembles a Plant from an already-parsed API response and a generated sprite. */
    // TODO: use a link to a saved resource instead of a byte array
    // Ideally, the plants store a link to the sprite within the filesystem and not the entire sprite
    // TODO: non-volatile plant storage
    public Plant createFromApi(JSONObject data, byte[] sprite) {
        if (data.has("error")) return null;

        String name = data.optString("name", "Unknown Plant");
        Plant plant = new Plant(name, 10, sprite); // todo: decide how to handle speed

        JSONArray commonNamesJson = data.optJSONArray("common_names");
        if (commonNamesJson != null) {
            List<String> commonNames = new ArrayList<>();
            for (int i = 0; i < commonNamesJson.length(); i++) {
                commonNames.add(commonNamesJson.optString(i));
            }
            plant.setCommonNames(commonNames);
        }

        plant.setDescription(data.optString("description_value"));

        JSONObject taxonomy = data.optJSONObject("taxonomy");
        if (taxonomy != null) plant.setTaxonomy(taxonomy.toString());

        plant.setBestLightCondition(data.optString("best_light_condition"));
        plant.setBestSoilType(data.optString("best_soil_type"));
        plant.setCommonUses(data.optString("common_uses"));
        plant.setCulturalSignificance(data.optString("cultural_significance"));
        plant.setToxicity(data.optString("toxicity"));
        plant.setBestWatering(data.optString("best_watering"));

        // NOTE: Both bases assumed to be initialized already
        // i.e. .read(InputStream) has already been called for both of them
        var taxonomyBase = TaxonomyMoveMapBase.getInstance();
        var moveBase = MoveBase.getInstance().getData();

        var moveIds = taxonomyBase.getMoves(new Taxonomy(taxonomy));
        ArrayList<Integer> moveIdsCopy = new ArrayList<>(moveIds);
        Collections.shuffle(moveIdsCopy);
        for (int i = 0; i < 4; i++) {
            plant.addMove(moveBase.get(moveIdsCopy.get(i)));
        }
        return plant;
    }

    public Plant createFromScan(JSONObject data, byte[] sprite) {
        return createFromApi(data, sprite);
    }
}

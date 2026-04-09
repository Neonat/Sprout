package com.g4ng.logic;

import android.util.Log;

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

    private static final String TAG = "PlantFactory";

    /** Assembles a Plant from an already-parsed API response and a generated sprite. */
    public static Plant createFromApi(JSONObject data, String spritePath) {
        if (data.has("error")) return null;

        String name = data.optString("name", "Unknown Plant");
        Plant plant = new Plant(name, 10, spritePath); // todo: decide how to handle speed

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
            var move = moveBase.get(moveIdsCopy.get(i));
            Log.i(TAG, "createFromApi: " + plant.getName() + " has move " + move.getName());
            plant.addMove(move);
        }
        return plant;
    }

    public static Plant createFromScan(JSONObject data, String spritePath) {
        return createFromApi(data, spritePath);
    }

    public static Plant createFromSaved(JSONObject data) {
        // get name, speed, spritePath
        String name = data.optString("name");
        int speed = data.optInt("speed");
        String spritePath = data.optString("spritePath");
        // moves to be handled in PlantJsonHandler - not good practice but works for now
        return new Plant(name, speed, spritePath);
    }
}

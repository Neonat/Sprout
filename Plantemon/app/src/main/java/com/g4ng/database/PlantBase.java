package com.g4ng.database;
import org.json.JSONException;
import org.json.JSONObject;
import org.json.JSONArray;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;

import android.util.Log;


// Singleton class to fetch JSON data and turn it into a hash map
// JSON will contain an array of objects
// Example of a plant object
//{
//  id: "3qi83nhg98hg",
//  name: "Iris setosa",
//  moveset: [some array of ids],
//  stats: { some other object here }
//}
public class PlantBase {
    private static PlantBase instance;
    private final HashMap<String, Model> plantData;
    private PlantBase() {
        // Read data from plant.json, get JSON object
        plantData = new HashMap<>();
        File file = new File("plant.json");
        if (!file.exists()) {
            throw new RuntimeException("plant.json not found");
        }
        try {
            var data = new JSONArray(new String(Files.readAllBytes(file.toPath())));
            for (int i = 0; i < data.length(); i++) {
                addPlant(data.getJSONObject(i));
            }
        }
        catch (IOException e) {
            Log.e("PlantBase", "Error reading plant.json", e);
        }
        catch (JSONException e) {
            Log.e("PlantBase", "Error parsing plant.json", e);
        }
    }

    private void addPlant(JSONObject data) throws IOException, JSONException {
        String id = data.optString("id", "0");
        JSONArray moveIdsRaw = data.optJSONArray("moves");
        ArrayList<Integer> moveIds = new ArrayList<>();

        int length = 0;
        if (moveIdsRaw == null) {
            // first four moveIds are for generic moves that can apply to any plant
            // basically the normal type
            moveIds.add(0);
            moveIds.add(1);
            moveIds.add(2);
            moveIds.add(3);
        }
        else {
            length = moveIdsRaw.length();
        }
        for (int i = 0; i < length; i++) {
            moveIds.add(moveIdsRaw.getInt(i));
        }
        Model model = new Model(id, moveIds);
        plantData.put(id, model);
    }

    public static PlantBase getInstance() {
        return instance;
    }

    public HashMap<String, Model> getData() {
        return plantData;
    }

    public static class Model {
        public final String id;
        public final List<Integer> moveIds;

        public Model(String id, List<Integer> moveIds) {
            this.id = id;
            this.moveIds = moveIds;
        }
    }

}
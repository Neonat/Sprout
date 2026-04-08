package com.g4ng.database;
import org.json.JSONException;
import org.json.JSONObject;
import org.json.JSONArray;

import java.util.ArrayList;
import java.util.HashMap;

// Singleton class to fetch JSON data and turn it into a hash map
// JSON will contain an array of objects
// Example of a plant object
//{
//  id: "3qi83nhg98hg",
//  name: "Iris setosa",
//  moves: [some array of ids],
//}
public class PlantBase extends Base<String, PlantInit>{
    private static PlantBase instance;
    private PlantBase() {
        // Read data from plant.json, get JSON object
        data = new HashMap<>();
    }

    @Override
    protected void insert(JSONObject data) throws JSONException {
        String id = data.optString("id", "0");
        JSONArray moveIdsRaw = data.optJSONArray("moves");
        ArrayList<Integer> moveIds = new ArrayList<>();

        int length = 0;
        if (moveIdsRaw != null) {
            length = moveIdsRaw.length();
        }
        for (int i = 0; i < 4; i++) {
            moveIds.add(i);
        }
        if (length != 0) {
            for (int i = 0; i < length; i++) {
                moveIds.add(moveIdsRaw.getInt(i));
            }
        }
        var model = new PlantInit(id, moveIds);
        this.data.put(id, model);
    }

    public static PlantBase getInstance() {
        if (instance == null) {
            instance = new PlantBase();
        }
        return instance;
    }
}
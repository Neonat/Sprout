package com.g4ng.database;
import org.json.JSONException;
import org.json.JSONObject;
import org.json.JSONArray;

import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;

import android.content.Context;

import com.g4ng.ui.R;


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
    private PlantBase(Context context) {
        // Read data from plant.json, get JSON object
        data = new HashMap<>();
        read(context, R.raw.plants);
    }

    @Override
    protected void insert(JSONObject data) throws IOException, JSONException {
        String id = data.optString("id", "0");
        JSONArray moveIdsRaw = data.optJSONArray("moves");
        ArrayList<Integer> moveIds = new ArrayList<>();

        int length = 0;
        if (moveIdsRaw == null || moveIdsRaw.length() == 0) {
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
        var model = new PlantInit(id, moveIds);
        this.data.put(id, model);
    }

    public static PlantBase getInstance(Context context) {
        if (instance == null) {
            instance = new PlantBase(context.getApplicationContext());
        }
        return instance;
    }
}
// Reads and modifies plant json locally on the user's' device
// references:
// https://developer.android.com/reference/org/json/JSONObject
// https://developer.android.com/training/data-storage/app-specific#java

// unused but relevant references (for other implementations):
// Use these for reading and writing objects directly to a json document
// https://developer.android.com/reference/android/util/JsonReader
// https://developer.android.com/reference/android/util/JsonWriter

package com.g4ng.database;

import android.content.Context;
import android.util.Log;

import com.g4ng.logic.Move;
import com.g4ng.logic.PlantFactory;
import com.g4ng.model.Plant;

import java.io.BufferedReader;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
/*
JSON file looks like this
[
    {
        "id": someInt,
        "name": someString,
        "maxHealth": someInt,
        "speed": someInt,
        "moves": [{move}]
        "spritePath": someString,
    },
    {
        "id": someInt,
        "name": someString,
        "maxHealth": someInt,
        "speed": someInt,
        "moves": [{move}]
        "spritePath": someString,
    }
]
 */
public class PlantJsonHandler {
    private final Context context;
    private final String TAG = "PlantJsonHandler";
    private final String filename = "TEMP.json";

    public PlantJsonHandler(Context context) {
        this.context = context;
    }

    private JSONObject convertMoveToJsonObject(Move move) throws JSONException {
        JSONObject moveJson = new JSONObject();
        moveJson.put("name", move.getName());
        moveJson.put("attack", move.getAttack());
        moveJson.put("defense", move.getDefense());
        moveJson.put("accuracy", move.getAccuracy());
        moveJson.put("power", move.getPower());
        return moveJson;
    }
    private JSONObject convertPlantToJsonObject(Plant plant) throws JSONException {
        JSONObject plantJson = new JSONObject();
        plantJson.put("id", plant.getId());
        plantJson.put("name", plant.getName());
        plantJson.put("maxHealth", plant.getMaxHealth());
        plantJson.put("speed", plant.getSpeed());
        plantJson.put("spritePath", plant.getSpritePath());
        plantJson.put("moves", convertMoveListToJsonArray(plant.getMoves()));
        return plantJson;
    }
    private JSONArray convertMoveListToJsonArray(List<Move> moves) throws JSONException {
        JSONArray jsonArray = new JSONArray();
        for (Move move : moves) {
            jsonArray.put(convertMoveToJsonObject(move));
        }
        return jsonArray;
    }

    private JSONArray convertPlantListToJsonArray(List<Plant> plants) throws JSONException {
        JSONArray jsonArray = new JSONArray();
        for (Plant plant : plants) {
            jsonArray.put(convertPlantToJsonObject(plant));
        }
        return jsonArray;
    }

    public List<Plant> convertJsonToPlantList(JSONObject plantsJson) throws JSONException {
        List<Plant> plants = new ArrayList<>();
        JSONArray plantsArray = plantsJson.getJSONArray("plants");
        for (int i = 0; i < plantsArray.length(); i++) {
            JSONObject plantJson = plantsArray.getJSONObject(i);
            Plant plant = PlantFactory.createFromSaved(plantJson);
            JSONArray moves = plantJson.getJSONArray("moves");
            for (int j = 0; j < moves.length(); j++) {
                JSONObject moveJson = moves.getJSONObject(j);
                Move move = new Move(
                        moveJson.getString("name"),
                        moveJson.getInt("attack"),
                        moveJson.getInt("defense"),
                        moveJson.getInt("accuracy"),
                        moveJson.getInt("power")
                );
                plant.addMove(move);
            }
            plants.add(plant);
        }
        return plants;
    }

    public String savePlants(List<Plant> plants) {
        Log.i(TAG, "savePlants: Beginning save");
        JSONObject plantsJson = new JSONObject();
        String filename;
        try {
            plantsJson.put("plants", convertPlantListToJsonArray(plants));
            filename = writeToJson(plantsJson);
        }
        catch (JSONException e) {
            Log.e(TAG, "savePlants: ", e);
            filename = null;
        }
        Log.i(TAG, "savePlants: Finished save");
        return filename;
    }

    public String writeToJson(JSONObject plantJson) {
        Log.i(TAG, "writeToJson: writing file");
        // Returns the name of the file
        String plantJsonStr = plantJson.toString();
        // Yes, this means plantJsonStr got converted from String -> JSONObject -> String, yes

        try (FileOutputStream fos = context.openFileOutput(filename, Context.MODE_PRIVATE)) {
            fos.write(plantJsonStr.getBytes(StandardCharsets.UTF_8));
        }
        catch (IOException e) {
            Log.e(TAG, "writeToJson: ",e);
        }

        Log.i(TAG, "writeToJson: Completed writing");
        return filename;
    }

    public JSONObject readFromJson() throws IOException, JSONException {
        Log.i(TAG, "readFromJson: Beginning read");
        // returns a JSONObject from the filename
        FileInputStream fis = context.openFileInput(filename);
        InputStreamReader inputStreamReader = new InputStreamReader(fis, StandardCharsets.UTF_8);
        StringBuilder stringBuilder = new StringBuilder();
        String line;
        String contents;
        try (BufferedReader reader = new BufferedReader(inputStreamReader)){
            while ((line = reader.readLine()) != null) {
                stringBuilder.append(line);
            }
        } finally {
            contents = stringBuilder.toString();
        }

        JSONObject plantJson = new JSONObject(contents);
        Log.i(TAG, "readFromJson: Finished read");
        Log.i(TAG, "readFromJson: " + contents);
        return plantJson;
    }

    public List<Plant> loadPlants() {
        Log.i(TAG, "loadPlants: Beginning load");
        List<Plant> plants = null;
        try {
            JSONObject plantsJson = readFromJson();
            plants = convertJsonToPlantList(plantsJson);
        }
        catch (IOException | JSONException e) {
            Log.e(TAG, "loadPlants: ", e);
        }
        Log.i(TAG, "loadPlants: Finished load");
        return plants;
    }
}
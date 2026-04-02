package com.g4ng.database;
import org.json.JSONException;
import org.json.JSONObject;
import org.json.JSONArray;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.util.HashMap;
import android.util.Log;
import com.g4ng.logic.Move;

// Singleton class to load JSON data and turn it into a hash map
public class MoveBase {
    private static MoveBase instance;
    private final HashMap<Integer, Move> moveData;

    private MoveBase() {
        // Read data from move.json, get JSON object
        moveData = new HashMap<>();
        File file = new File("move.json");
        if (!file.exists()) {
            throw new RuntimeException("move.json not found");
        }
        try {
            var data = new JSONArray(new String(Files.readAllBytes(file.toPath())));

            for (int i = 0; i < data.length(); i++) {
                addMove(data.getJSONObject(i));
            }
        }
        catch (IOException e) {
            Log.e("MoveBase", "Error reading move.json", e);
        }
        catch (JSONException e) {
            Log.e("MoveBase", "Error parsing move.json", e);
        }
    }

    private void addMove(JSONObject data) throws IOException {
        int id = data.optInt("id", 0);
        String name = data.optString("name", "Unknown Move");
        int attack = data.optInt("attack", 0);
        int defense = data.optInt("defense", 0);
        int accuracy = data.optInt("accuracy", 0);
        int power = data.optInt("power", 0);
        var model = new Move(name, attack, defense, accuracy, power);
        moveData.put(id, model);
    }

    public static MoveBase getInstance() {
        return instance;
    }

    public HashMap<Integer, Move> getData() {
        return moveData;
    }
}

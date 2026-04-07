package com.g4ng.database;
import org.json.JSONObject;

import java.util.HashMap;

import android.content.Context;
import com.g4ng.logic.Move;
import com.g4ng.ui.R;

// Singleton class to load JSON data and turn it into a hash map
// JSON will contain an array of objects
// Example of a move object
//{
//    id: 19i,
//    name: "Thunderbolt",
//    attack: 10,
//    defense: -3
//}
public class MoveBase extends Base<Integer, Move> {
    private static MoveBase instance;

    private MoveBase(Context context) {
        // Read data from move.json, get JSON object
        data = new HashMap<>();
        read(context, R.raw.moves);
    }

    @Override
    protected void insert(JSONObject data) {
        Integer id = data.optInt("id", 0);
        String name = data.optString("name", "Unknown Move");
        int attack = data.optInt("attack", 0);
        int defense = data.optInt("defense", 0);
        int accuracy = data.optInt("accuracy", 0);
        int power = data.optInt("power", 0);
        var model = new Move(name, attack, defense, accuracy, power);
        this.data.put(id, model);
    }

    public static MoveBase getInstance(Context context) {
        if (instance == null) {
            instance = new MoveBase(context.getApplicationContext());
        }
        return instance;
    }
}

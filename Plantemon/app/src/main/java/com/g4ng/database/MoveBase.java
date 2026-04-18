package com.g4ng.database;

import android.util.JsonReader;
import com.g4ng.logic.Move;
import java.io.IOException;
import java.util.HashMap;

// Singleton class to load JSON data and turn it into a hash map
// JSON will contain an array of objects
// Example of a move object
//        "id": 1,
//                "name": "Tropical Spore",
//                "attack": 12,
//                "defense": 5,
//                "accuracy": 85

// HashMap will look something like this:
/*
Key        Value
0         {"Photosynthesis", 0, 15, 100}
1         {"Tropical Spore", 12, 5, 85}
2         {"Humidity Veil", 5, 20, 100}
 */

// Sidenote: by design, higher attacking moves have lower accuracy values
public class MoveBase extends Base<Integer, Move> {
    private static MoveBase instance;

    private MoveBase() {
        data = new HashMap<>();
    }

    @Override
    protected void insert(JsonReader reader) throws IOException {
        // default values
        int id = 0;
        String name = "Unknown Move";
        int attack = 0;
        int defense = 0;
        int accuracy = 100;
        // read values from JSON one by one from the stream
        reader.beginObject();
        while (reader.hasNext()) {
            String field = reader.nextName();
            if (field.equals("id")) id = reader.nextInt();
            else if (field.equals("name")) name = reader.nextString();
            else if (field.equals("attack")) attack = reader.nextInt();
            else if (field.equals("defense") || field.equals("defence")) defense = reader.nextInt();
            else if (field.equals("accuracy")) accuracy = reader.nextInt();
            else reader.skipValue();
        }
        reader.endObject();

        this.data.put(id, new Move(name, attack, defense, accuracy));
    }

    public static MoveBase getInstance() {
        if (instance == null) {
            instance = new MoveBase();
        }
        return instance;
    }
}

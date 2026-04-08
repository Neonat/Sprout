// Reads and modifies plant json locally on the user's' device
// references:
// https://developer.android.com/reference/org/json/JSONObject
// https://developer.android.com/training/data-storage/app-specific#java

// unused but relevant references (for other implementations):
// Use these for reading and writing objects directly to a json document
// https://developer.android.com/reference/android/util/JsonReader
// https://developer.android.com/reference/android/util/JsonWriter

package com.g4ang.database;

import com.google.gson.JsonObject;
import com.google.gson.stream.JsonReader;
import com.google.gson.stream.JsonWriter;
import com.google.protobuf.Message;

import java.io.BufferedReader;
import java.io.File;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.lang.Object;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

import org.json.JSONObject;
/*
Assuming the json file looks like this:
[
    {
        "id": someInt,
        "name": someString,
        "maxHealth": someInt,
        "speed": someInt,
        "sprite": someByte[]
    },
    {
        "id": someInt,
        "name": someString,
        "maxHealth": someInt,
        "speed": someInt,
        "sprite": someByte[]
    }
]
 */
public class PlantJsonHandler {
    public String writeToJson(JSONObject plantJson){
        // Returns the name of the file
        String plantJsonStr = plantJson.toString();
        // Yes, this means plantJsonStr got converted from String -> JSONObject -> String, yes

        String filename = "TEMP.json";
        try (FileOutputStream fos = context.openFileOutput(filename, Context.MODE_PRIVATE)) {
            fos.write(plantJsonStr);
        }

        return filename;
    }

    public JSONObject readFromJson(String filename) throws IOException {
        // returns a JSONObject from the filename
        FileInputStream fis = context.openFileInput(filename);
        InputStreamReader inputStreamReader = new InputStreamReader(fis, StandardCharsets.UTF_8);
        StringBuilder stringBuilder = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(inputStreamReader)){
            String line = reader.readLine();
            while (line != null){
                stringBuilder.append(line.append('\n'));
                line = reader.readLine();
            }
        } catch (IOException e) {
            throw e;
        } finally {
            String contents = stringBuilder.toString();
        }

        JSONObject plantJson = new JSONObject(contents);
        return plantJson;
    }
}
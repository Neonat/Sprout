package com.g4ng.database;

import android.util.Log;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.util.HashMap;

public abstract class Base<K, V> {
    // this is not efficient: as the amount of predefined data grows this will take up more memory
    // ideally we should have the ability to use this class in a try-with
    // and should not fetch all the data - SQL would have been better but this is faster to work with
    protected HashMap<K, V> data;
    public HashMap<K, V> getData() {
        return data;
    }
    public void read(InputStream is) {
        try {
            var reader = new BufferedReader(new InputStreamReader(is));
            var stringBuilder = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                stringBuilder.append(line);
            }
            var data = new JSONArray(stringBuilder.toString());
            for (int i = 0; i < data.length(); i++) {
                insert(data.getJSONObject(i));
            }
        }
        catch (IOException e) {
            Log.e(getClass().getName(), "Error reading json", e);
        }
        catch (JSONException e) {
            Log.e(getClass().getName(), "Error parsing json", e);
        }
    }
    protected abstract void insert(JSONObject object) throws JSONException;

}

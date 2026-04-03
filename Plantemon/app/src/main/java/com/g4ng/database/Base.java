package com.g4ng.database;

import android.content.Context;
import android.util.Log;

import androidx.annotation.RawRes;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;

public abstract class Base<K, V> {
    protected HashMap<K, V> data;
    public HashMap<K, V> getData() {
        return data;
    }
    protected void read(Context context, @RawRes int id) {
        try (InputStream is = context.getResources().openRawResource(id)) {
            var data = new JSONArray(is.toString());
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
    protected abstract void insert(JSONObject object) throws IOException, JSONException;

}

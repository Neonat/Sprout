package com.g4ng.database;

import android.util.JsonReader;
import android.util.Log;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;

public abstract class Base<K, V> {
    protected HashMap<K, V> data;

    public HashMap<K, V> getData() {
        return data;
    }

    public void read(InputStream is) {
        try (JsonReader reader = new JsonReader(new InputStreamReader(is, StandardCharsets.UTF_8))) {
            reader.beginArray();
            while (reader.hasNext()) {
                insert(reader); // this will be implemented in subclasses Movebase and TaxonomyMoveMapBase
            }
            reader.endArray();
        } catch (IOException e) {
            Log.e(getClass().getName(), "Error reading json", e);
        }
    }

    protected abstract void insert(JsonReader reader) throws IOException;
}

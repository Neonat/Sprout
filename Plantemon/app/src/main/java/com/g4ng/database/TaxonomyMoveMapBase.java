package com.g4ng.database;

import android.util.JsonReader;
import android.util.Log;

import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;

// Use taxonomy to acquire a mapping for moves
// Future: map based on region and seasons
// Singleton class to load JSON data and turn it into a hash map

/*
HashMap will look something like this:
Key        Value
0         {[0, 2, 6, 9, 12, 13, 19]} the values correspond to move IDs
1         {[1, 3, 5, 8, 14, 15]}
2         {[20, 11, 16, 17]}
3         {[4, 7, 10, 18]}
 */

public class TaxonomyMoveMapBase extends Base<Integer, List<Integer>> {
    private static TaxonomyMoveMapBase instance;
    private final String TAG = "TaxonomyMoveMapBase";
    private final String VASCULAR = "Tracheophyta";
    private final String[] FERNS = {"Polypodiopsida", "Lycopodiopsida", "Equisetopsida"};
    private final String[] CONIFERS = {"Pinopsida", "Cycadopsida", "Ginkgoopsida", "Gnetopsida"};
    private final HashSet<String> fernSet = new HashSet<>(List.of(FERNS));
    private final HashSet<String> coniferSet = new HashSet<>(List.of(CONIFERS));

    public static TaxonomyMoveMapBase getInstance() {
        if (instance == null) {
            instance = new TaxonomyMoveMapBase();
        }
        return instance;
    }

    private TaxonomyMoveMapBase() {
        data = new HashMap<>();
    }

    @Override
    protected void insert(JsonReader reader) throws IOException {
        int id = 0;
        List<Integer> moveIds = new ArrayList<>();

        reader.beginObject();
        while (reader.hasNext()) {
            String name = reader.nextName();
            if (name.equals("id")) {
                id = reader.nextInt();
            } else if (name.equals("moves")) {
                reader.beginArray();
                while (reader.hasNext()) {
                    moveIds.add(reader.nextInt());
                }
                reader.endArray();
            } else {
                reader.skipValue();
            }
        }
        reader.endObject();

        Log.i(TAG, "insert: " + id + moveIds.toString());
        this.data.put(id, moveIds);
    }

    // decision tree to look up moves in the map based on taxonomy
    public List<Integer> getMoves(Taxonomy taxonomy) {
        if (taxonomy == null) {
            throw new RuntimeException("Taxonomy cannot be null");
        }
        // Non-vascular plants -> moss
        if (!taxonomy.phylum.equals(VASCULAR)) {
            Log.i(TAG, "Non-vascular plant");
            return data.get(0);
        }
        // ferns
        if (fernSet.contains(taxonomy.class_)) {
            Log.i(TAG, "Ferns");
            return data.get(1);
        }
        // gymnosperms -> conifer trees
        if (coniferSet.contains(taxonomy.class_)) {
            Log.i(TAG, "Gymnosperms");
            return data.get(2);
        }
        // angiosperms - flowering plants
        Log.i(TAG, "Angiosperms");
        return data.get(3);
    }
}

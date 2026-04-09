package com.g4ng.database;

import android.util.Log;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;

// Use taxonomy to acquire a mapping for moves
// Future: map based on region and seasons
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
    protected void insert(JSONObject data) throws JSONException {
        int id = data.optInt("id", 0);
        JSONArray moveIdsRaw = data.optJSONArray("moves");
        List<Integer> moveIds = new ArrayList<>();
        int length = 0;
        if (moveIdsRaw != null) {
            length = moveIdsRaw.length();
        }
        if (length != 0) {
            for (int i = 0; i < length; i++) {
                moveIds.add(moveIdsRaw.getInt(i));
            }
        }
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

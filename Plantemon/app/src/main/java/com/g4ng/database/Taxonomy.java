package com.g4ng.database;

import org.json.JSONObject;

public class Taxonomy {
    public final String class_;
    public final String genus;
    public final String order;
    public final String family;
    public final String phylum;

    public Taxonomy(JSONObject data) {
        if (data == null) {
            class_ = "Unknown";
            genus = "Unknown";
            order = "Unknown";
            family = "Unknown";
            phylum = "Unknown";
            return;
        }
        class_ = data.optString("class");
        genus = data.optString("genus");
        order = data.optString("order");
        family = data.optString("family");
        phylum = data.optString("phylum");
    }


}

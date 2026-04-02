package com.g4ng.service;

import android.util.Base64;
import android.util.Log;
import com.g4ng.ui.BuildConfig;
import okhttp3.*;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.IOException;
import java.util.concurrent.TimeUnit;

public class PlantApiService {

    private static final String API_KEY = BuildConfig.PLANT_API_KEY;
    private static final String BASE_URL = "https://api.plant.id/v3/identification";

    private final OkHttpClient client = new OkHttpClient.Builder()
            .connectTimeout(15, TimeUnit.SECONDS)
            .writeTimeout(15, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .build();

    public String fetchPlantDetails(Object photo) {
        try {
            String base64Image;

            if (photo instanceof byte[]) {
                base64Image = Base64.encodeToString((byte[]) photo, Base64.NO_WRAP);
            } else if (photo instanceof String) {
                base64Image = (String) photo;
            } else {
                return createErrorJson("Invalid photo format.");
            }

            // The screenshot shows 'details' and 'language' as QUERY parameters
            HttpUrl.Builder urlBuilder = HttpUrl.parse(BASE_URL).newBuilder();
            urlBuilder.addQueryParameter("details", "common_names,url,description,taxonomy,rank,gbif_id,inaturalist_id,image,synonyms,edible_parts,watering,best_light_condition,best_soil_type,common_uses,cultural_significance,toxicity,best_watering");
            urlBuilder.addQueryParameter("language", "en"); // Standard default

            String urlWithParams = urlBuilder.build().toString();

            // Construct Request JSON Body (only images should be here if details is in the URL)
            JSONObject jsonRequest = new JSONObject();
            JSONArray imagesArray = new JSONArray();
            imagesArray.put(base64Image);
            jsonRequest.put("images", imagesArray);

            RequestBody body = RequestBody.create(
                    jsonRequest.toString(),
                    MediaType.parse("application/json; charset=utf-8")
            );

            Request request = new Request.Builder()
                    .url(urlWithParams)
                    .addHeader("Api-Key", API_KEY)
                    .post(body)
                    .build();

            try (Response response = client.newCall(request).execute()) {
                String responseBody = response.body() != null ? response.body().string() : "";
                
                if (!response.isSuccessful()) {
                    Log.e("PlantApiService", "API Error " + response.code() + ": " + responseBody);
                    return responseBody;
                }

                return extractPlantInfo(responseBody);
            }

        } catch (Exception e) {
            Log.e("PlantApiService", "Execution error", e);
            return createErrorJson(e.getMessage());
        }
    }

    private String extractPlantInfo(String rawJson) {
        try {
            JSONObject root = new JSONObject(rawJson);
            JSONObject result = root.optJSONObject("result");
            if (result == null) return rawJson;

            JSONObject isPlant = result.optJSONObject("is_plant");
            if (isPlant == null || (!isPlant.optBoolean("binary", false) && isPlant.optDouble("probability", 0) < 0.5)) {
                return createErrorJson("Not identified as a plant.");
            }

            JSONObject classification = result.optJSONObject("classification");
            if (classification == null) return createErrorJson("No classification.");

            JSONArray suggestions = classification.optJSONArray("suggestions");
            if (suggestions == null || suggestions.length() == 0) return createErrorJson("No suggestions.");

            JSONObject bestSuggestion = suggestions.getJSONObject(0);
            JSONObject details = bestSuggestion.optJSONObject("details");
            
            JSONObject extracted = new JSONObject();
            extracted.put("name", bestSuggestion.optString("name"));
            extracted.put("probability", bestSuggestion.optDouble("probability"));

            if (details != null) {
                extracted.put("common_names", details.optJSONArray("common_names"));
                extracted.put("taxonomy", details.optJSONObject("taxonomy"));
                
                JSONObject desc = details.optJSONObject("description");
                if (desc != null) {
                    extracted.put("description_value", desc.optString("value"));
                    extracted.put("description_citation", desc.optString("citation"));
                }

                extracted.put("best_light_condition", details.optString("best_light_condition"));
                extracted.put("best_soil_type", details.optString("best_soil_type"));
                extracted.put("common_uses", details.optString("common_uses"));
                extracted.put("cultural_significance", details.optString("cultural_significance"));
                extracted.put("toxicity", details.optString("toxicity"));
                extracted.put("best_watering", details.optString("best_watering"));
            }

            return extracted.toString(4);
//            return extracted;

        } catch (Exception e) {
            return createErrorJson("Extraction error: " + e.getMessage());
        }
    }

    private String createErrorJson(String message) {
        try {
            return new JSONObject().put("error", message).toString();
        } catch (Exception e) {
            return "{\"error\": \"Unknown error\"}";
        }
    }
}
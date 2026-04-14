package com.g4ng.service;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Handler;
import android.os.Looper;
import android.util.Base64;
import android.util.Log;

import com.g4ng.ui.BuildConfig;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.concurrent.TimeUnit;

import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;

public class SpriteGeneratorService {

    public interface SpriteCallback {
        void onSuccess(Bitmap sprite);
        void onError(String error);
    }

    private static final String TAG = "SpriteGeneratorService";
    private static final String NVIDIA_ENDPOINT = "https://integrate.api.nvidia.com/v1/chat/completions";
    private static final String NVIDIA_MODEL = "google/gemma-3-27b-it";
    private static final String FLUX_ENDPOINT = "https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.2-klein-4b";

    private final Context context;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final OkHttpClient client = new OkHttpClient.Builder()
            .connectTimeout(15, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .readTimeout(120, TimeUnit.SECONDS)
            .build();

    public SpriteGeneratorService(Context context) {
        this.context = context.getApplicationContext();
    }

    public void generate(Bitmap photo, String plantName, SpriteCallback callback) {
        new Thread(() -> {
            try {
                Bitmap cached = loadFromCache(plantName);
                if (cached != null) {
                    Log.d(TAG, "Cache hit for: " + plantName);
                    mainHandler.post(() -> callback.onSuccess(cached));
                    return;
                }

                String description = fetchDescription(photo, plantName);
                Log.d(TAG, "NVIDIA description: " + description);

                Bitmap sprite = fetchSprite(description);
                saveToCache(plantName, sprite);

                mainHandler.post(() -> callback.onSuccess(sprite));

            } catch (Exception e) {
                Log.e(TAG, "Sprite generation failed", e);
                mainHandler.post(() -> callback.onError(e.getMessage()));
            }
        }).start();
    }

    private String fetchDescription(Bitmap photo, String plantName) throws Exception {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        photo.compress(Bitmap.CompressFormat.JPEG, 85, baos);
        String base64Image = Base64.encodeToString(baos.toByteArray(), Base64.NO_WRAP);

        String text = "This is a photo of " + plantName + ". Describe it as a single cute chibi "
                + "pixel-art plant monster sprite in the style of Pokémon Black & White, with a "
                + "transparent background, 192x192px, using the plant's real colours and defining "
                + "features as the creature's body parts. Keep it to 2–3 sentences, output only "
                + "the image generation prompt.";

        JSONObject textPart = new JSONObject();
        textPart.put("type", "text");
        textPart.put("text", text);

        JSONObject imageUrlObj = new JSONObject();
        imageUrlObj.put("url", "data:image/jpeg;base64," + base64Image);
        JSONObject imagePart = new JSONObject();
        imagePart.put("type", "image_url");
        imagePart.put("image_url", imageUrlObj);

        JSONArray content = new JSONArray();
        content.put(textPart);
        content.put(imagePart);

        JSONObject message = new JSONObject();
        message.put("role", "user");
        message.put("content", content);

        JSONObject body = new JSONObject();
        body.put("model", NVIDIA_MODEL);
        body.put("messages", new JSONArray().put(message));
        body.put("max_tokens", 256);

        Request request = new Request.Builder()
                .url(NVIDIA_ENDPOINT)
                .addHeader("Authorization", "Bearer " + BuildConfig.NVIDIA_API_KEY)
                .post(RequestBody.create(body.toString(), MediaType.parse("application/json")))
                .build();

        try (Response response = client.newCall(request).execute()) {
            String responseBody = response.body() != null ? response.body().string() : "";
            if (!response.isSuccessful()) {
                throw new IOException("NVIDIA API error " + response.code() + ": " + responseBody);
            }
            return new JSONObject(responseBody)
                    .getJSONArray("choices")
                    .getJSONObject(0)
                    .getJSONObject("message")
                    .getString("content")
                    .trim();
        }
    }

    private Bitmap fetchSprite(String prompt) throws Exception {
        JSONObject body = new JSONObject();
        body.put("prompt", prompt);
        body.put("steps", 4);

        Request request = new Request.Builder()
                .url(FLUX_ENDPOINT)
                .addHeader("Authorization", "Bearer " + BuildConfig.FLUX_API_KEY)
                .post(RequestBody.create(body.toString(), MediaType.parse("application/json")))
                .build();

        try (Response response = client.newCall(request).execute()) {
            String responseBody = response.body() != null ? response.body().string() : "";
            if (!response.isSuccessful()) {
                throw new IOException("Flux API error " + response.code() + ": " + responseBody);
            }
            String b64 = new JSONObject(responseBody)
                    .getJSONArray("artifacts")
                    .getJSONObject(0)
                    .getString("base64");

            // Strip data URL prefix if present
            int comma = b64.indexOf(',');
            if (comma != -1) b64 = b64.substring(comma + 1);

            byte[] bytes = Base64.decode(b64, Base64.DEFAULT);

            // Write to a temp file and decode from disk — avoids HWUI in-memory codec failures
            File tmp = File.createTempFile("sprite_tmp", ".png", context.getCacheDir());
            try {
                try (FileOutputStream fos = new FileOutputStream(tmp)) {
                    fos.write(bytes);
                }
                Bitmap bitmap = BitmapFactory.decodeFile(tmp.getAbsolutePath());
                if (bitmap == null) throw new IOException("Failed to decode sprite image");
                return bitmap;
            } finally {
                tmp.delete();
            }
        }
    }

    // --- Cache ---

    private Bitmap loadFromCache(String plantName) {
        File file = cacheFile(plantName);
        if (!file.exists()) return null;
        return BitmapFactory.decodeFile(file.getAbsolutePath());
    }

    private void saveToCache(String plantName, Bitmap bitmap) {
        try (FileOutputStream fos = new FileOutputStream(cacheFile(plantName))) {
            bitmap.compress(Bitmap.CompressFormat.PNG, 100, fos);
        } catch (IOException e) {
            Log.w(TAG, "Failed to cache sprite for " + plantName, e);
        }
    }

    private File cacheFile(String plantName) {
        String safeName = plantName.toLowerCase().replaceAll("[^a-z0-9]", "_");
        File dir = new File(context.getFilesDir(), "sprite_cache");
        if (!dir.exists()) dir.mkdirs();
        return new File(dir, "sprite_" + safeName + ".png");
    }
}

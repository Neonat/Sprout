package com.g4ng.service;

import com.g4ng.ui.BuildConfig;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

public class AiSpriteGenerator {

    private static final String API_KEY = BuildConfig.FLUX_API_KEY;
    private static final String ENDPOINT = "https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.2-klein-4b";

    public byte[] generateSprite(String plantName) throws Exception {
        String prompt = "pixel art pokemon-style " + plantName + " plant sprite, " +
                "front-facing, pure white background, bold black outlines, " +
                "vibrant saturated colors, cute chibi style, single plant subject, " +
                "game sprite, no text, no shadow";

        JSONObject body = new JSONObject();
        body.put("prompt", prompt);
        body.put("steps", 4);

        HttpURLConnection conn = (HttpURLConnection) new URL(ENDPOINT).openConnection();
        try {
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setRequestProperty("Authorization", "Bearer " + API_KEY);
            conn.setConnectTimeout(15000);
            conn.setReadTimeout(120000); // generation can take a while
            conn.setDoOutput(true);

            byte[] bodyBytes = body.toString().getBytes(StandardCharsets.UTF_8);
            conn.setRequestProperty("Content-Length", String.valueOf(bodyBytes.length));
            try (OutputStream os = conn.getOutputStream()) {
                os.write(bodyBytes);
            }

            int code = conn.getResponseCode();
            String response;
            try (InputStream stream = code < 400 ? conn.getInputStream() : conn.getErrorStream()) {
                response = readString(stream);
            }

            if (code != 200) throw new IOException("API error " + code + ": " + response);

            String b64 = new JSONObject(response)
                    .getJSONArray("artifacts")
                    .getJSONObject(0)
                    .getString("base64");

            return decodeBase64(b64);
        } finally {
            conn.disconnect();
        }
    }

    byte[] decodeBase64(String base64) {
        int commaIndex = base64.indexOf(',');
        if (commaIndex != -1) {
            base64 = base64.substring(commaIndex + 1);
        }
        return Base64.getDecoder().decode(base64);
    }

    private String readString(InputStream is) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        byte[] buf = new byte[8192];
        int n;
        while ((n = is.read(buf)) != -1) out.write(buf, 0, n);
        return out.toString(StandardCharsets.UTF_8.name());
    }
}

package com.g4ng.service;

import android.content.ContentValues;
import android.content.Context;
import android.net.Uri;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Log;

import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;

import org.junit.Test;
import org.junit.runner.RunWith;

import java.io.OutputStream;

import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

@RunWith(AndroidJUnit4.class)
public class AiSpriteGeneratorTest {

    private static final String TAG = "SpriteGenTest";

    @Test
    public void testGenerateSprite() throws Exception {
        AiSpriteGenerator generator = new AiSpriteGenerator();
        byte[] result = generator.generateSprite("sunflower");

        assertNotNull("generateSprite returned null", result);
        assertTrue("generateSprite returned empty bytes — check Logcat for API error", result.length > 0);

        // Save to public Downloads via MediaStore — pull with:
        // adb pull /storage/emulated/0/Download/sprite.jpg ~/Downloads/sprite.jpg
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        String ext = isJpeg(result) ? "jpg" : "png";
        String mime = isJpeg(result) ? "image/jpeg" : "image/png";
        String filename = "sprite." + ext;

        ContentValues values = new ContentValues();
        values.put(MediaStore.Downloads.DISPLAY_NAME, filename);
        values.put(MediaStore.Downloads.MIME_TYPE, mime);
        values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
        values.put(MediaStore.Downloads.IS_PENDING, 1);

        Uri uri = context.getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
        assertNotNull("Failed to create Downloads entry", uri);

        try (OutputStream os = context.getContentResolver().openOutputStream(uri)) {
            os.write(result);
        }

        values.clear();
        values.put(MediaStore.Downloads.IS_PENDING, 0);
        context.getContentResolver().update(uri, values, null, null);

        Log.d(TAG, "Saved sprite (" + result.length + " bytes, " + ext + ") to Downloads/" + filename);
    }

    private boolean isJpeg(byte[] bytes) {
        return bytes.length >= 3
                && (bytes[0] & 0xFF) == 0xFF
                && (bytes[1] & 0xFF) == 0xD8
                && (bytes[2] & 0xFF) == 0xFF;
    }
}

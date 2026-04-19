package com.g4ng.ui;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Bundle;
import android.provider.MediaStore;
import android.text.InputType;
import android.util.Log;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.ProgressBar;
import android.widget.TextView;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;

import android.net.Uri;

import com.g4ng.logic.Move;
import com.g4ng.logic.PlantFactory;
import com.g4ng.model.Plant;
import com.g4ng.service.PlantApiService;
import com.g4ng.service.SpriteGeneratorService;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.Random;
import java.util.concurrent.atomic.AtomicBoolean;

public class ScanActivity extends AppCompatActivity {

    private static final String TAG = "ScanActivity";

    private File photoFile;
    private Button btnScan;
    private ProgressBar progress;
    private TextView tvStatus;
    private TextView tvPlantName;
    private ImageView ivSprite;

    private final AtomicBoolean isProcessing = new AtomicBoolean(false);

    private final ActivityResultLauncher<Intent> takePicture =
            registerForActivityResult(new ActivityResultContracts.StartActivityForResult(),
                    result -> { if (result.getResultCode() == RESULT_OK) processPhoto(); });

    private final ActivityResultLauncher<String> requestCameraPermission =
            registerForActivityResult(new ActivityResultContracts.RequestPermission(),
                    granted -> { if (granted) launchCamera(); });

    private final ActivityResultLauncher<String> pickImage =
            registerForActivityResult(new ActivityResultContracts.GetContent(),
                    uri -> { if (uri != null) processUri(uri); });

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_scan);
        if (getSupportActionBar() != null) getSupportActionBar().hide();

        btnScan   = findViewById(R.id.btn_scan);
        progress  = findViewById(R.id.progress);
        tvStatus  = findViewById(R.id.tv_status);
        tvPlantName = findViewById(R.id.tv_plant_name);
        ivSprite  = findViewById(R.id.iv_sprite);

        findViewById(R.id.btn_back).setOnClickListener(v -> finish());
        btnScan.setOnClickListener(v -> {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
                    == PackageManager.PERMISSION_GRANTED) {
                launchCamera();
            } else {
                requestCameraPermission.launch(Manifest.permission.CAMERA);
            }
        });
        findViewById(R.id.btn_upload).setOnClickListener(v -> pickImage.launch("image/*"));
        findViewById(R.id.btn_test).setOnClickListener(v -> processTestImage());
    }

    // ── Camera / image input ───────────────────────────────────────────────

    private void launchCamera() {
        try {
            String ts = new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(new Date());
            photoFile = File.createTempFile("PLANT_" + ts, ".jpg", getExternalFilesDir("Pictures"));
            Uri photoUri = FileProvider.getUriForFile(this,
                    BuildConfig.APPLICATION_ID + ".fileprovider", photoFile);
            Intent intent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
            intent.putExtra(MediaStore.EXTRA_OUTPUT, photoUri);
            takePicture.launch(intent);
        } catch (IOException e) {
            Log.e(TAG, "Failed to create photo file", e);
        }
    }

    private void processPhoto() {
        try {
            processBytes(toJpegBytes(BitmapFactory.decodeFile(photoFile.getAbsolutePath())));
        } finally {
            if (photoFile != null) { photoFile.delete(); photoFile = null; }
        }
    }

    private void processUri(Uri uri) {
        try (InputStream is = getContentResolver().openInputStream(uri)) {
            processBytes(toJpegBytes(BitmapFactory.decodeStream(is)));
        } catch (Exception e) {
            tvStatus.setText("Failed to load image: " + e.getMessage());
        }
    }

    private void processTestImage() {
        Bitmap bm = BitmapFactory.decodeResource(getResources(), R.drawable.test_plant);
        if (bm == null) { tvStatus.setText("test_plant drawable not found"); return; }
        processBytes(toJpegBytes(bm));
    }

    private byte[] toJpegBytes(Bitmap bm) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        bm.compress(Bitmap.CompressFormat.JPEG, 90, out);
        return out.toByteArray();
    }

    // ── Main processing pipeline ───────────────────────────────────────────

    private void processBytes(byte[] photoBytes) {
        if (!isProcessing.compareAndSet(false, true)) return;

        Bitmap photoBitmap = BitmapFactory.decodeByteArray(photoBytes, 0, photoBytes.length);
        if (photoBitmap == null) {
            tvStatus.setText("Failed to decode image");
            isProcessing.set(false);
            return;
        }

        setUiBusy("Identifying plant...");

        new Thread(() -> {
            // ── Step 1: try Plant ID API ──────────────────────────────────
            JSONObject plantJson = null;
            String plantName = null;
            try {
                String raw = new PlantApiService().fetchPlantDetails(photoBytes);
                Log.d(TAG, "Plant API response: " + raw);
                JSONObject json = new JSONObject(raw);
                if (!json.has("error")) {
                    plantJson = json;
                    plantName = json.optString("name", "Unknown Plant");
                }
            } catch (Exception e) {
                Log.w(TAG, "Plant ID unavailable: " + e.getMessage());
            }

            if (plantName != null) {
                // API succeeded — try sprite generation next
                final String name   = plantName;
                final JSONObject pj = plantJson;
                runOnUiThread(() -> {
                    tvPlantName.setText(name);
                    tvStatus.setText("Generating sprite...");
                });
                attemptSprite(photoBitmap, name, pj);
            } else {
                // API failed — ask user for the plant name
                runOnUiThread(() -> {
                    progress.setVisibility(View.GONE);
                    showNameDialog(photoBitmap);
                });
            }
        }).start();
    }

    // ── Sprite generation (with photo fallback) ────────────────────────────

    private void attemptSprite(Bitmap photo, String name, JSONObject plantJson) {
        new SpriteGeneratorService(this).generate(photo, name,
                new SpriteGeneratorService.SpriteCallback() {
                    @Override
                    public void onSuccess(Bitmap sprite) {
                        saveAndFinish(sprite, name, plantJson);
                    }
                    @Override
                    public void onError(String error) {
                        // Sprite API unavailable — use the plant photo directly
                        Log.w(TAG, "Sprite generation failed, using photo: " + error);
                        runOnUiThread(() -> tvStatus.setText("Using photo as sprite..."));
                        new Thread(() -> saveAndFinish(cropToSprite(photo), name, plantJson))
                                .start();
                    }
                });
    }

    // ── Manual-name fallback dialog ────────────────────────────────────────

    private void showNameDialog(Bitmap photo) {
        EditText input = new EditText(this);
        input.setHint("e.g. Rose, Sunflower...");
        input.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_CAP_WORDS);
        int pad = (int)(16 * getResources().getDisplayMetrics().density);
        input.setPadding(pad, pad, pad, pad);

        new AlertDialog.Builder(this)
                .setTitle("Name this plant")
                .setMessage("Couldn't identify it automatically.\nWhat would you like to call it?")
                .setView(input)
                .setPositiveButton("Add to Garden", (d, w) -> {
                    String name = input.getText().toString().trim();
                    if (name.isEmpty()) name = "Unknown Plant";
                    final String finalName = name;
                    setUiBusy("Saving...");
                    tvPlantName.setText(finalName);
                    new Thread(() -> saveAndFinish(cropToSprite(photo), finalName, null))
                            .start();
                })
                .setNegativeButton("Cancel", (d, w) -> {
                    resetUi();
                    isProcessing.set(false);
                })
                .setCancelable(false)
                .show();
    }

    // ── Finalise: save sprite, build Plant, add to garden ─────────────────

    /** Called from a background thread. */
    private void saveAndFinish(Bitmap sprite, String name, JSONObject plantJson) {
        try {
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            sprite.compress(Bitmap.CompressFormat.PNG, 100, baos);
            String spritePath = saveSpriteToFile(name, baos.toByteArray());

            Plant plant;
            try {
                plant = (plantJson != null)
                        ? PlantFactory.createFromApi(plantJson, spritePath)
                        : null;
            } catch (Exception e) {
                Log.w(TAG, "PlantFactory failed, using fallback: " + e.getMessage());
                plant = null;
            }
            if (plant == null) plant = buildFallbackPlant(name, spritePath);

            GameState.getPlayer().getGarden().add(plant);
            Log.d(TAG, "Plant added: " + plant.getName());

            final Bitmap finalSprite = sprite;
            runOnUiThread(() -> {
                ivSprite.setImageBitmap(finalSprite);
                ivSprite.setVisibility(View.VISIBLE);
                tvStatus.setText("Done!");
                resetUi();
            });
        } catch (Exception e) {
            Log.e(TAG, "saveAndFinish failed", e);
            runOnUiThread(() -> {
                tvStatus.setText("Error: " + e.getMessage());
                resetUi();
            });
        } finally {
            isProcessing.set(false);
        }
    }

    // ── Helpers ────────────────────────────────────────────────────────────

    /** Square-crop the photo and scale to 192×192 for use as a sprite. */
    private Bitmap cropToSprite(Bitmap src) {
        int size = Math.min(src.getWidth(), src.getHeight());
        int x = (src.getWidth()  - size) / 2;
        int y = (src.getHeight() - size) / 2;
        Bitmap cropped = Bitmap.createBitmap(src, x, y, size, size);
        return Bitmap.createScaledBitmap(cropped, 192, 192, true);
    }

    /** A plant with sensible defaults when no API data is available. */
    private Plant buildFallbackPlant(String name, String spritePath) {
        int speed = 5 + new Random().nextInt(20);
        Plant p = new Plant(name, speed, spritePath);
        p.addMove(new Move("Tackle",      15,  0,  90));
        p.addMove(new Move("Vine Whip",   20,  0,  85));
        p.addMove(new Move("Leaf Shield",  0, 10, 100));
        p.addMove(new Move("Solar Blast", 35, -5,  75));
        return p;
    }

    private String saveSpriteToFile(String name, byte[] bytes) throws IOException {
        String fileName = "SPRITE_" + name.replaceAll("\\s+", "_")
                + "_" + System.currentTimeMillis() + ".png";
        File dir = getExternalFilesDir("Sprites");
        if (dir != null && !dir.exists()) dir.mkdirs();
        File file = new File(dir, fileName);
        try (FileOutputStream fos = new FileOutputStream(file)) { fos.write(bytes); }
        return file.getAbsolutePath();
    }

    private void setUiBusy(String status) {
        btnScan.setEnabled(false);
        progress.setVisibility(View.VISIBLE);
        tvStatus.setText(status);
        tvPlantName.setText("");
        ivSprite.setVisibility(View.GONE);
    }

    private void resetUi() {
        progress.setVisibility(View.GONE);
        btnScan.setEnabled(true);
    }
}

package com.g4ng.ui;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.os.Bundle;
import android.provider.MediaStore;
import android.util.Log;
import android.view.View;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.ProgressBar;
import android.widget.TextView;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;

import com.g4ng.logic.PlantFactory;
import com.g4ng.model.Plant;
import com.g4ng.service.PlantApiService;
import com.g4ng.service.SpriteGeneratorService;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.concurrent.atomic.AtomicBoolean;

public class ScanActivity extends AppCompatActivity {

    private static final String TAG = "ScanActivity";

    private File photoFile;
    private Plant scannedPlant;
    private Button btnScan;
    private ProgressBar progress;
    private TextView tvStatus;
    private TextView tvPlantName;
    private ImageView ivSprite;

    private final AtomicBoolean isProcessing = new AtomicBoolean(false);

    private final ActivityResultLauncher<Intent> takePicture =
            registerForActivityResult(new ActivityResultContracts.StartActivityForResult(), result -> {
                if (result.getResultCode() == RESULT_OK) processPhoto();
            });

    private final ActivityResultLauncher<String> requestCameraPermission =
            registerForActivityResult(new ActivityResultContracts.RequestPermission(), granted -> {
                if (granted) launchCamera();
            });

    private final ActivityResultLauncher<String> pickImage =
            registerForActivityResult(new ActivityResultContracts.GetContent(), uri -> {
                if (uri != null) processUri(uri);
            });

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_scan);

        if (getSupportActionBar() != null) getSupportActionBar().hide();

        findViewById(R.id.btn_back).setOnClickListener(v -> finish());

        btnScan = findViewById(R.id.btn_scan);
        progress = findViewById(R.id.progress);
        tvStatus = findViewById(R.id.tv_status);
        tvPlantName = findViewById(R.id.tv_plant_name);
        ivSprite = findViewById(R.id.iv_sprite);

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

    private void launchCamera() {
        try {
            String timestamp = new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(new Date());
            File storageDir = getExternalFilesDir("Pictures");
            photoFile = File.createTempFile("PLANT_" + timestamp, ".jpg", storageDir);
            Uri photoUri = FileProvider.getUriForFile(this,
                    BuildConfig.APPLICATION_ID + ".fileprovider", photoFile);
            Intent intent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
            intent.putExtra(MediaStore.EXTRA_OUTPUT, photoUri);
            takePicture.launch(intent);
        } catch (IOException e) {
            Log.e(TAG, "Failed to create photo file", e);
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
        Bitmap bitmap = BitmapFactory.decodeResource(getResources(), R.drawable.test_plant);
        if (bitmap == null) {
            tvStatus.setText("test_plant drawable not found");
            return;
        }
        processBytes(toJpegBytes(bitmap));
    }

    private void processPhoto() {
        try {
            processBytes(toJpegBytes(BitmapFactory.decodeFile(photoFile.getAbsolutePath())));
        } finally {
            if (photoFile != null) {
                photoFile.delete();
                photoFile = null;
            }
        }
    }

    private byte[] toJpegBytes(Bitmap bitmap) {
        ByteArrayOutputStream stream = new ByteArrayOutputStream();
        bitmap.compress(Bitmap.CompressFormat.JPEG, 90, stream);
        return stream.toByteArray();
    }

    private void processBytes(byte[] photoBytes) {
        if (!isProcessing.compareAndSet(false, true)) return;

        Bitmap photoBitmap = BitmapFactory.decodeByteArray(photoBytes, 0, photoBytes.length);
        if (photoBitmap == null) {
            tvStatus.setText("Failed to decode image");
            isProcessing.set(false);
            return;
        }

        btnScan.setEnabled(false);
        progress.setVisibility(View.VISIBLE);
        tvStatus.setText("Identifying plant...");
        tvPlantName.setText("");
        ivSprite.setVisibility(View.GONE);

        new Thread(() -> {
            try {
                // 1. Identify plant
                PlantApiService plantApi = new PlantApiService();
                String plantJsonStr = plantApi.fetchPlantDetails(photoBytes);
                Log.d(TAG, "Plant API response: " + plantJsonStr);

                JSONObject plantJson;
                try {
                    plantJson = new JSONObject(plantJsonStr);
                } catch (Exception jsonEx) {
                    throw new Exception("Bad API response: " + plantJsonStr);
                }
                if (plantJson.has("error")) {
                    throw new Exception("Plant ID failed: " + plantJson.getString("error"));
                }
                String plantName = plantJson.optString("name", "Unknown Plant");

                runOnUiThread(() -> {
                    tvPlantName.setText(plantName);
                    tvStatus.setText("Generating sprite...");
                });

                // 2. Generate sprite using photo + plant name (delivers callback on main thread)
                new SpriteGeneratorService(this).generate(photoBitmap, plantName,
                        new SpriteGeneratorService.SpriteCallback() {
                            @Override
                            public void onSuccess(Bitmap sprite) {
                                // Save to file and create plant on a background thread
                                new Thread(() -> {
                                    try {
                                        ByteArrayOutputStream baos = new ByteArrayOutputStream();
                                        sprite.compress(Bitmap.CompressFormat.PNG, 100, baos);
                                        String spritePath = saveSpriteToFile(plantName, baos.toByteArray());

                                        // 3. Assemble Plant — passes already-parsed JSON to avoid re-parsing
                                        scannedPlant = PlantFactory.createFromApi(plantJson, spritePath);
                                        GameState.getPlayer().getGarden().add(scannedPlant);
                                        Log.d(TAG, "Plant created: " + scannedPlant.getName());

                                        runOnUiThread(() -> {
                                            ivSprite.setImageBitmap(sprite);
                                            ivSprite.setVisibility(View.VISIBLE);
                                            tvStatus.setText("Done!");
                                            progress.setVisibility(View.GONE);
                                            btnScan.setEnabled(true);
                                        });
                                    } catch (Exception e) {
                                        Log.e(TAG, "Finalising plant failed", e);
                                        runOnUiThread(() -> {
                                            tvStatus.setText("Error: " + e.getMessage());
                                            progress.setVisibility(View.GONE);
                                            btnScan.setEnabled(true);
                                        });
                                    } finally {
                                        isProcessing.set(false);
                                    }
                                }).start();
                            }

                            @Override
                            public void onError(String error) {
                                Log.e(TAG, "Sprite generation failed: " + error);
                                tvStatus.setText("Error: " + error);
                                progress.setVisibility(View.GONE);
                                btnScan.setEnabled(true);
                                isProcessing.set(false);
                            }
                        });

            } catch (Exception e) {
                Log.e(TAG, "Processing failed", e);
                runOnUiThread(() -> {
                    tvStatus.setText("Error: " + e.getMessage());
                    progress.setVisibility(View.GONE);
                    btnScan.setEnabled(true);
                });
                isProcessing.set(false);
            }
        }).start();
    }

    private String saveSpriteToFile(String plantName, byte[] spriteBytes) throws IOException {
        String fileName = "SPRITE_" + plantName.replaceAll("\\s+", "_") + "_" + System.currentTimeMillis() + ".png";
        File storageDir = getExternalFilesDir("Sprites");
        if (storageDir != null && !storageDir.exists()) {
            storageDir.mkdirs();
        }
        File spriteFile = new File(storageDir, fileName);
        try (java.io.FileOutputStream fos = new java.io.FileOutputStream(spriteFile)) {
            fos.write(spriteBytes);
        }
        return spriteFile.getAbsolutePath();
    }
}

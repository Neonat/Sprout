package com.g4ng.ui;

import com.g4ng.service.PlantApiService;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Bundle;
import android.util.Log;

import androidx.appcompat.app.AppCompatActivity;

import java.io.ByteArrayOutputStream;
import java.io.File;


//public class ScanActivity {
//    // TODO: assign photo to test_plant.jpg
//
//    public void onCaptureSuccess(Object photo){
//        PlantApiService plantApiService = new PlantApiService();
//        String plantData = plantApiService.fetchPlantDetails(photo); // json data
//        AiSpriteGenerator aiSpriteGenerator = new AiSpriteGenerator();
//        Object aiSprite = aiSpriteGenerator.generateSprite(photo); // ai sprite
//        PlantFactory plantFactory = new PlantFactory();
//        Plant plant = plantFactory.createFromScan(plantData, aiSprite);
//
//    }
//}

public class ScanActivity extends AppCompatActivity {

    private File photoFile;
    private String imageFilePath;


    // test with R.drawable.test_plant
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // If you have a layout file:
        // setContentView(R.layout.activity_scan);

        // Move the thread here so it executes when the Activity is created
        new Thread(() -> {
            try {
                // 1. Prepare data
                // test the image in R.drawable.test_plant
                Bitmap bitmap = BitmapFactory.decodeResource(getResources(), R.drawable.test_plant);
                // Bitmap bitmap = BitmapFactory.decodeFile(imageFilePath);
                if (bitmap == null) {
                    Log.e("API_ERROR", "Could not decode resource R.drawable.test_plant");
                    return;
                }

                ByteArrayOutputStream stream = new ByteArrayOutputStream();
                bitmap.compress(Bitmap.CompressFormat.JPEG, 100, stream);
                byte[] byteArray = stream.toByteArray();

                // 2. Call Service
                PlantApiService service = new PlantApiService();
                String jsonResponse = service.fetchPlantDetails(byteArray);

                // 3. Update UI
                runOnUiThread(() -> {
                    Log.d("API_RESULT", jsonResponse);
                });

            } catch (Exception e) {
                Log.e("API_ERROR", "Error in background thread", e);
            }
        }).start();
    }
}

// for actual execution
//    @Override
//    protected void onCreate(Bundle savedInstanceState) {
//        super.onCreate(savedInstanceState);
//        setContentView(R.layout.activity_scan);
//
//        // Example: Trigger the camera when a button is clicked
//        findViewById(R.id.btn_scan).setOnClickListener(v -> dispatchTakePictureIntent());
//    }
//
//    // 2. CAMERA TRIGGER METHOD
//    private void dispatchTakePictureIntent() {
//        Intent takePictureIntent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
//
//        try {
//            String timeStamp = new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(new Date());
//            File storageDir = getExternalFilesDir(Environment.DIRECTORY_PICTURES);
//            photoFile = File.createTempFile("PLANT_" + timeStamp, ".jpg", storageDir);
//            imageFilePath = photoFile.getAbsolutePath();
//
//            Uri photoURI = FileProvider.getUriForFile(this,
//                    BuildConfig.APPLICATION_ID + ".fileprovider",
//                    photoFile);
//
//            takePictureIntent.putExtra(MediaStore.EXTRA_OUTPUT, photoURI);
//            startActivityForResult(takePictureIntent, 101);
//        } catch (IOException ex) {
//            ex.printStackTrace();
//        }
//    }
//
//    // 3. THE "RETURN" HANDLER
//    @Override
//    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
//        super.onActivityResult(requestCode, resultCode, data);
//        if (requestCode == 101 && resultCode == RESULT_OK) {
//            // The user took the photo; now we send it to your service
//            processImageForApi();
//        }
//    }
//
//    // 4. THE API BACKGROUND THREAD
//    private void processImageForApi() {
//        new Thread(() -> {
//            // Decoding the file we just saved
//            Bitmap bitmap = BitmapFactory.decodeFile(imageFilePath);
//            ByteArrayOutputStream stream = new ByteArrayOutputStream();
//            bitmap.compress(Bitmap.CompressFormat.JPEG, 90, stream);
//            byte[] byteArray = stream.toByteArray();
//
//            // Calling your PlantApiService
//            PlantApiService service = new PlantApiService();
//            String jsonResult = service.fetchPlantDetails(byteArray);
//
//            // Updating UI must happen back on the UI Thread
//            runOnUiThread(() -> {
//                // Do something with jsonResult, like putting it in a TextView
//                Log.d("SCAN_RESULT", jsonResult);
//            });
//        }).start();
//    }


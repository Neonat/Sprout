package com.g4ng.ui;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Bundle;
import android.widget.ImageView;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;

import com.g4ng.logic.Move;
import com.g4ng.model.Plant;

import java.text.SimpleDateFormat;
import java.util.Locale;

public class InfoActivity extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_info);

        Plant plant = (Plant) getIntent().getSerializableExtra("plant");
        if (plant == null) {
            finish();
            return;
        }

        initializeUI(plant);
    }

    private void initializeUI(Plant plant) {
        ImageView ivSprite = findViewById(R.id.iv_info_sprite);
        TextView tvName = findViewById(R.id.tv_info_name);
        TextView tvScanTime = findViewById(R.id.tv_info_scan_time);
        TextView tvHp = findViewById(R.id.tv_info_hp);
        TextView tvSpeed = findViewById(R.id.tv_info_speed);
        TextView tvMetadata = findViewById(R.id.tv_info_metadata);
        TextView tvMoves = findViewById(R.id.tv_info_moves);

        // Sprite
        if (plant.getSpritePath() != null) {
            Bitmap bitmap = BitmapFactory.decodeFile(plant.getSpritePath());
            ivSprite.setImageBitmap(bitmap);
        }

        // Basic Info
        tvName.setText(plant.getName());
        
        SimpleDateFormat sdf = new SimpleDateFormat("dd MMM yyyy, HH:mm", Locale.getDefault());
        tvScanTime.setText("Scanned on: " + (plant.getScanDateTime() != null ? sdf.format(plant.getScanDateTime()) : "Unknown"));

        // Stats
        tvHp.setText(String.valueOf(plant.getMaxHealth()));
        tvSpeed.setText(String.valueOf(plant.getSpeed()));

        // Metadata (Fun Facts)
        StringBuilder metadata = new StringBuilder();
        appendIfPresent(metadata, "Description: ", plant.getDescription());
        appendIfPresent(metadata, "Best Light: ", plant.getBestLightCondition());
        appendIfPresent(metadata, "Best Soil: ", plant.getBestSoilType());
        appendIfPresent(metadata, "Common Uses: ", plant.getCommonUses());
        appendIfPresent(metadata, "Toxicity: ", plant.getToxicity());
        appendIfPresent(metadata, "Watering: ", plant.getBestWatering());
        tvMetadata.setText(metadata.length() > 0 ? metadata.toString() : "No details available.");

        // Moves
        StringBuilder movesList = new StringBuilder();
        for (Move move : plant.getMoves()) {
            movesList.append("• ").append(move.getName())
                    .append(" (Atk: ").append(move.getAttack())
                    .append(", Def: ").append(move.getDefense()).append(")\n");
        }
        tvMoves.setText(movesList.length() > 0 ? movesList.toString() : "No moves learned.");

        // Back button
        findViewById(R.id.btn_back).setOnClickListener(v -> finish());
    }

    private void appendIfPresent(StringBuilder sb, String label, String value) {
        if (value != null && !value.isEmpty()) {
            sb.append(label).append(value).append("\n\n");
        }
    }
}

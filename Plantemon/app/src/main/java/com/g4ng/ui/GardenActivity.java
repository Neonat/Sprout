package com.g4ng.ui;

import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Bundle;
import android.widget.ImageView;

import androidx.appcompat.app.AppCompatActivity;

import com.g4ng.model.Plant;

import java.util.List;

public class GardenActivity extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_garden);

        if (getSupportActionBar() != null) {
            getSupportActionBar().hide();
        }

        // Collect all 6 pot ImageViews
        ImageView[] pots = new ImageView[]{
                findViewById(R.id.pot_0),
                findViewById(R.id.pot_1),
                findViewById(R.id.pot_2),
                findViewById(R.id.pot_3),
                findViewById(R.id.pot_4),
                findViewById(R.id.pot_5)
        };

        // Load garden from shared game state
        List<Plant> garden = GameState.getPlayer().getGarden();

        for (int i = 0; i < pots.length; i++) {
            if (i < garden.size()) {
                Plant plant = garden.get(i);
                byte[] spriteBytes = plant.getSprite();
                if (spriteBytes != null && spriteBytes.length > 0) {
                    Bitmap bitmap = BitmapFactory.decodeByteArray(spriteBytes, 0, spriteBytes.length);
                    pots[i].setImageBitmap(bitmap);
                } else {
                    pots[i].setImageResource(R.drawable.ic_pot_empty);
                }
                
                // Clicking a pot with a plant opens the InfoActivity
                pots[i].setOnClickListener(v -> {
                    Intent intent = new Intent(this, InfoActivity.class);
                    intent.putExtra("plant", plant);
                    startActivity(intent);
                });
                
            } else {
                pots[i].setImageResource(R.drawable.ic_pot_empty);
                pots[i].setOnClickListener(null); // No info for empty pots
            }
            MainActivity.pressAnim(pots[i]);
        }

        // Back button
        findViewById(R.id.btn_back).setOnClickListener(v -> finish());
        MainActivity.pressAnim(findViewById(R.id.btn_back));
    }
}

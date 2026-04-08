package com.g4ng.ui;

import android.content.Intent;
import android.os.Bundle;
import android.view.MotionEvent;
import android.view.View;

import androidx.appcompat.app.AppCompatActivity;

public class MainActivity extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        if (getSupportActionBar() != null) {
            getSupportActionBar().hide();
        }

        View navGarden = findViewById(R.id.nav_garden);
        View navAdventure = findViewById(R.id.nav_adventure);
        View navCamera = findViewById(R.id.nav_camera);

        pressAnim(navGarden);
        pressAnim(navAdventure);
        pressAnim(navCamera);

        navGarden.setOnClickListener(v ->
                startActivity(new Intent(this, GardenActivity.class)));

        navAdventure.setOnClickListener(v ->
                startActivity(new Intent(this, BattleActivity.class)));

        navCamera.setOnClickListener(v ->
                startActivity(new Intent(this, ScanActivity.class)));
    }

    static void pressAnim(View v) {
        v.setOnTouchListener((view, event) -> {
            switch (event.getAction()) {
                case MotionEvent.ACTION_DOWN:
                    view.animate().scaleX(0.90f).scaleY(0.90f).setDuration(80).start();
                    break;
                case MotionEvent.ACTION_UP:
                case MotionEvent.ACTION_CANCEL:
                    view.animate().scaleX(1f).scaleY(1f).setDuration(80).start();
                    break;
            }
            return false;
        });
    }
}

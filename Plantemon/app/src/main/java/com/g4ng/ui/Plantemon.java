package com.g4ng.ui;

import android.app.Application;
import android.util.Log;

import com.g4ng.database.MoveBase;
import com.g4ng.database.TaxonomyMoveMapBase;

import java.io.IOException;

public class Plantemon extends Application {
    @Override
    public void onCreate() {
        super.onCreate();
        // Initialize the singleton classes
        var moveBase = MoveBase.getInstance();
        var taxonomyMoveMapBase = TaxonomyMoveMapBase.getInstance();
        try (var is = getAssets().open("moves.json")) {
            moveBase.read(is);
        }
        catch (IOException e) {
            Log.e("Plantemon", "Failed to read moves.json", e);
        }

        try (var is = getAssets().open("taxonomy.json")) {
            taxonomyMoveMapBase.read(is);
        }
        catch (IOException e) {
            Log.e("Plantemon", "Failed to read taxonomy.json", e);
        }
    }

}

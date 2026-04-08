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
        // In theory, quite easy to switch these to use an API result
        var moveBase = MoveBase.getInstance();
        var taxonomyMoveMapBase = TaxonomyMoveMapBase.getInstance();
        try (var is = getResources().openRawResource(R.raw.moves)) {
            moveBase.read(is);
        }
        catch (IOException e) {
            Log.e("Plantemon", "Failed to read moves.json", e);
        }

        try (var is = getResources().openRawResource(R.raw.taxonomy)) {
            taxonomyMoveMapBase.read(is);
        }
        catch (IOException e) {
            Log.e("Plantemon", "Failed to read taxonomy.json", e);
        }
    }

}

package com.g4ng.database;

import java.util.List;

public class PlantInit {
    public final String id;
    public final List<Integer> moveIds;

    public PlantInit(String id, List<Integer> moveIds) {
        this.id = id;
        this.moveIds = moveIds;
    }
}

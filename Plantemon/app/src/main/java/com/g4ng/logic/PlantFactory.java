package com.g4ng.logic;

import com.g4ng.model.Plant;

import java.util.UUID;

public class PlantFactory {
    /** Assembles a Plant using external API data and AI images. */
    public Plant createFromScan(String apiData, Object aiSprite){
        String plantName = apiData.indexOf("name");
        return new Plant(plantName, aiSprite);
    }
}

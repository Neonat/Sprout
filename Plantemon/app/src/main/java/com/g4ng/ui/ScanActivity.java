package com.g4ng.ui;

import com.g4ng.logic.PlantFactory;
import com.g4ng.model.Plant;
import com.g4ng.service.AiSpriteGenerator;
import com.g4ng.service.PlantApiService;


public class ScanActivity {
    public void onCaptureSuccess(Object photo){
        PlantApiService plantApiService = new PlantApiService();
        String plantData = plantApiService.fetchPlantDetails(photo); // json data
        AiSpriteGenerator aiSpriteGenerator = new AiSpriteGenerator();
        Object aiSprite = aiSpriteGenerator.generateSprite(photo); // ai sprite
        PlantFactory plantFactory = new PlantFactory();
        Plant plant = plantFactory.createFromScan(plantData, aiSprite);

    }
}

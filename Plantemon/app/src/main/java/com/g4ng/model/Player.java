package com.g4ng.model;

import java.util.List;

public class Player {
    protected final String username;
    protected final List<Plant> garden;
    protected Plant currentPlant;

    public Player(String username, List<Plant> garden) {
        this.username = username;
        this.garden = garden;
    }

    public Plant getCurrentPlant() {
        return currentPlant;
    }

    public void setCurrentPlant(Plant currentPlant) {
        this.currentPlant = currentPlant;
    }

    public List<Plant> getGarden() {
        return garden;
    }

    public String getUsername() {
        return this.username;
    }

    public void restoreGarden() {
        for (Plant plant : garden) {
            plant.setCurrentHealth(plant.getMaxHealth());
        }
    }
}

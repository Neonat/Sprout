package com.g4ng.model;

import java.util.List;

public class Player {
    private final String username;
    private final List<Plant> garden;
    private Plant currentPlant;

    private int remainingHeals = 3;

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

    public int getRemainingHeals(){
        return remainingHeals;
    }

    public void useHeal(){
        remainingHeals--;
    }

    public void resetHeals(){
        remainingHeals = 3;
    }

    public void restoreGarden() {
        resetHeals();
        for (Plant plant : garden) {
            plant.setCurrentHealth(plant.getMaxHealth());
        }
    }
}

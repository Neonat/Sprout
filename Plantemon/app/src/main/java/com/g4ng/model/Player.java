package com.g4ng.model;

import java.util.List;

public class Player {
    // Conceptually, heals belong to the Player resource pool
    private static final int MAX_HEALS = 3;
    
    protected final String username;
    protected final List<Plant> garden;
    protected Plant currentPlant;

    private int remainingHeals = MAX_HEALS;

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
        if (remainingHeals > 0) {
            remainingHeals--;
        }
    }

    public void resetHeals(){
        remainingHeals = MAX_HEALS;
    }

    public void restoreGarden() {
        resetHeals();
        for (Plant plant : garden) {
            plant.setCurrentHealth(plant.getMaxHealth());
        }
    }
}

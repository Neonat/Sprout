package com.g4ng.model;

import com.g4ng.logic.Action;

import java.util.ArrayList;
import java.util.List;

public class Player {
    private String username;

    private List<Plant> garden;

    private Plant currentPlant;

    private Action currentAction;

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

    public Action getCurrentAction() {
        return currentAction;
    }

    public void setCurrentAction(Action currentAction) {
        this.currentAction = currentAction;
    }

    public List<Plant> getGarden() {
        return garden;
    }

    public String getUsername(){
        return this.username;
    }

    public void restoreGarden(){
        for(Plant plant: garden){
            plant.setCurrentHealth(plant.getMaxHealth());
        }
    }











}

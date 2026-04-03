package com.g4ng.logic;

import com.g4ng.model.Plant;
import com.g4ng.model.Player;

public class SwitchAction implements Action {
    private final Plant nextPlant;

    public SwitchAction(Plant nextPlant) {
        this.nextPlant = nextPlant;
    }

    @Override
    public void execute(Player performer, Player opponent) {
        if (nextPlant != null && !nextPlant.isDead()) {
            System.out.println(performer.getUsername() + " switched to " + nextPlant.getName() + "!");
            performer.setCurrentPlant(nextPlant);
        } else {
            System.out.println(performer.getUsername() + " failed to switch!");
        }
    }
}

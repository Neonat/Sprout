package com.g4ng.logic;

import com.g4ng.model.Plant;
import com.g4ng.model.Player;

public class SwitchAction implements Action {
    private final Plant nextPlant;

    public SwitchAction(Plant nextPlant) {
        this.nextPlant = nextPlant;
    }

    @Override
    public String execute(Player performer, Player opponent, Action opponentAction) {
        if (nextPlant != null && !nextPlant.isDead()) {
            String result = performer.getUsername() + " switched to " + nextPlant.getName() + "!";
            performer.setCurrentPlant(nextPlant);
            return result;
        } else {
            return performer.getUsername() + " failed to switch!";
        }
    }

    @Override
    public int getDefenseValue() {
        return 0;
    }
}

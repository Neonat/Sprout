package com.g4ng.logic;

import com.g4ng.model.Plant;
import com.g4ng.model.Player;

public class HealAction implements Action {

    public HealAction() {
    }

    public static int calculateHealAmount(Plant plant) {
        if (plant == null) return 0;
        return (int) (plant.getMaxHealth() * 0.2) + 10;
    }

    @Override
    public String execute(Player performer, Player opponent, Action opponentAction) {
        if (performer.getRemainingHeals() <= 0) {
            return performer.getUsername() + " has no more heals left!";
        }

        Plant targetPlant = performer.getCurrentPlant();
        int oldHealth = targetPlant.getCurrentHealth();
        int healAmount = calculateHealAmount(targetPlant);
        
        targetPlant.setCurrentHealth(Math.min(targetPlant.getCurrentHealth() + healAmount, targetPlant.getMaxHealth()));
        performer.useHeal();

        int actualHeal = targetPlant.getCurrentHealth() - oldHealth;
        return performer.getUsername() + "'s " + targetPlant.getName() + " healed " + actualHeal + " HP! (" + performer.getRemainingHeals() + " left)";
    }

    @Override
    public int getDefenseValue() {
        // While healing, the plant prepares a defense. 
        return 15;
    }
}

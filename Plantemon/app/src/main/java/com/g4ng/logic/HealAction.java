package com.g4ng.logic;

import com.g4ng.model.Plant;
import com.g4ng.model.Player;

public class HealAction implements Action {
    private final int healAmount;

    public HealAction(int healAmount) {
        this.healAmount = healAmount;
    }

    @Override
    public void execute(Player performer, Player opponent) {
        Plant targetPlant = performer.getCurrentPlant();
        int oldHealth = targetPlant.getCurrentHealth();
        targetPlant.setCurrentHealth(Math.min(targetPlant.getCurrentHealth() + healAmount, targetPlant.getMaxHealth()));
        int actualHeal = targetPlant.getCurrentHealth() - oldHealth;
        System.out.println(performer.getUsername() + "'s " + targetPlant.getName() + " healed " + actualHeal + " HP!");
    }
}

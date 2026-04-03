package com.g4ng.logic;

import com.g4ng.model.Plant;
import com.g4ng.model.Player;

public class HealAction implements Action {
    private final int healAmount;

    public HealAction(int healAmount) {
        this.healAmount = healAmount;
    }

    @Override
    public void execute(Player performer, Player opponent, Action opponentAction) {
        Plant targetPlant = performer.getCurrentPlant();
        int oldHealth = targetPlant.getCurrentHealth();
        targetPlant.setCurrentHealth(Math.min(targetPlant.getCurrentHealth() + healAmount, targetPlant.getMaxHealth()));
        int actualHeal = targetPlant.getCurrentHealth() - oldHealth;
        System.out.println(performer.getUsername() + "'s " + targetPlant.getName() + " healed " + actualHeal + " HP!");
    }

    @Override
    public int getDefenseValue() {
        // Healing might leave you vulnerable, or you could say it has a base defense.
        // Let's go with 0 for now as it's not a defensive stance.
        return 0;
    }
}

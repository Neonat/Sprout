package com.g4ng.logic;

import com.g4ng.model.Plant;

public class HealAction implements Action{
    private final Plant targetPlant;
    private final int healAmount;

    public HealAction(Plant targetPlant, int healAmount){
        this.targetPlant = targetPlant;
        this.healAmount = healAmount;
    }
    @Override
    public void doAction(){
        targetPlant.setCurrentHealth(Math.min(targetPlant.getCurrentHealth() + healAmount, targetPlant.getMaxHealth()));
    }
}

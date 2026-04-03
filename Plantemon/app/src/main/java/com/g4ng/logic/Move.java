package com.g4ng.logic;

import com.g4ng.model.Plant;
import com.g4ng.model.Player;

public class Move implements Action {
    private final String name;
    private final int attack;
    private final int defense;
    private final int accuracy;
    private final int power;

    public Move(String name, int attack, int defense, int accuracy, int power) {
        this.name = name;
        this.attack = attack;
        this.defense = defense;
        this.accuracy = accuracy;
        this.power = power;
    }

    @Override
    public void execute(Player performer, Player opponent, Action opponentAction) {
        Plant attackerPlant = performer.getCurrentPlant();
        Plant targetPlant = opponent.getCurrentPlant();

        if (Math.random() * 100 <= accuracy) {
            int opponentDefense = (opponentAction != null) ? opponentAction.getDefenseValue() : 0;
            
            // Damage = Attack - Defense.
            int damage = this.attack - opponentDefense;
            
            targetPlant.takeDamage(damage);
            System.out.println(attackerPlant.getName() + " used " + name + " (Atk: " + attack + ") against " + 
                               targetPlant.getName() + " (Def: " + opponentDefense + ") and dealt " + damage + " damage!");
        } else {
            System.out.println(attackerPlant.getName() + " missed " + name + "!");
        }
    }

    @Override
    public int getDefenseValue() {
        return this.defense;
    }

    public String getName() {
        return name;
    }

    public int getAttack() {
        return attack;
    }

    public int getDefense() {
        return defense;
    }

    public int getAccuracy() {
        return accuracy;
    }

    public int getPower() {
        return power;
    }
}

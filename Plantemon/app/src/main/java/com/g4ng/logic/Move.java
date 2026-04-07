package com.g4ng.logic;

import android.util.Log;
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
    public String execute(Player performer, Player opponent, Action opponentAction) {
        Plant attackerPlant = performer.getCurrentPlant();
        Plant targetPlant = opponent.getCurrentPlant();

        if (Math.random() * 100 <= accuracy) {
            int opponentDefense = (opponentAction != null) ? opponentAction.getDefenseValue() : 0;
            
            // Damage = Attack - Defense.
            int damage = Math.max(1, this.attack - opponentDefense);
            
            targetPlant.takeDamage(damage);
            String result = attackerPlant.getName() + " used " + name + " and dealt " + damage + " damage!";
            Log.d("BattleLogic", result);
            return result;
        } else {
            String result = attackerPlant.getName() + " missed " + name + "!";
            Log.d("BattleLogic", result);
            return result;
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

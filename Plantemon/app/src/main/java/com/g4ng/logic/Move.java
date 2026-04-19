package com.g4ng.logic;

import android.util.Log;
import com.g4ng.model.Plant;
import com.g4ng.model.Player;

public class Move implements Action {
    private final String name;
    private final int attack;
    private final int defense;
    private final int accuracy;

    public Move(String name, int attack, int defense, int accuracy) {
        this.name = name;
        this.attack = attack;
        this.defense = defense;
        this.accuracy = accuracy;
    }

    @Override
    public String execute(Player performer, Player opponent, Action opponentAction) {
        Plant attackerPlant = performer.getCurrentPlant();
        Plant targetPlant = opponent.getCurrentPlant();

        if (Math.random() * 100 <= accuracy) {
            int opponentDefense = (opponentAction != null) ? opponentAction.getDefenseValue() : 0;
            
            // Damage logic to increase dynamism
            double variation = 0.7 + (Math.random() * 0.4);
            int damage = (int)((this.attack - (opponentDefense * variation)) * variation);
            
            // Fix: Ensure damage is never negative (which would heal the opponent)
            damage = Math.max(0, damage);
            
            targetPlant.takeDamage(damage);
            String result = performer.getUsername()+ "'s " + attackerPlant.getName() + " used " + name + " and dealt " + damage + " damage!";
            Log.d("BattleLogic", result);
            return result;
        } else {
            String result = performer.getUsername()+ "'s " + attackerPlant.getName() + " missed " + name + "!";
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
}

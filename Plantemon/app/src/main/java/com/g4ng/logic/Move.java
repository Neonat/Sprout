package com.g4ng.logic;

import com.g4ng.model.Plant;
import com.g4ng.model.Player;

public class Move implements Action {
    private String name;
    private final int power;
    private final int accuracy;

    public Move(String name, int power, int accuracy) {
        this.name = name;
        this.power = power;
        this.accuracy = accuracy;
    }

    @Override
    public void execute(Player performer, Player opponent) {
        Plant attacker = performer.getCurrentPlant();
        Plant target = opponent.getCurrentPlant();

        if (Math.random() * 100 <= accuracy) {
            // Simple damage calculation
            int damage = power; 
            target.takeDamage(damage);
            System.out.println(attacker.getName() + " used " + name + " and dealt " + damage + " damage!");
        } else {
            System.out.println(attacker.getName() + " missed " + name + "!");
        }
    }

    public String getName() {
        return name;
    }
}

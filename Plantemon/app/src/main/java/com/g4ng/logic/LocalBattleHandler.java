package com.g4ng.logic;

import com.g4ng.model.Player;

public class LocalBattleHandler extends BattleHandler {
    
    public LocalBattleHandler(Player p1, Player p2) {
        super(p1, p2);
    }

    @Override
    public void updatePlayers() {
        // In a local battle, both players are on the same device
        // We can just print status updates here
        System.out.println("Status Update:");
        System.out.println(player1.getUsername() + "'s " + player1.getCurrentPlant().getName() + 
                ": " + player1.getCurrentPlant().getCurrentHealth() + " HP");
        System.out.println(player2.getUsername() + "'s " + player2.getCurrentPlant().getName() + 
                ": " + player2.getCurrentPlant().getCurrentHealth() + " HP");
    }
}

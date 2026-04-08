package com.g4ng.logic;

import com.g4ng.model.BattleState;
import com.g4ng.model.Bot;
import com.g4ng.model.Plant;
import com.g4ng.model.Player;

public class LocalBattleHandler extends BattleHandler {
    protected static Bot botMethodUser;

    public LocalBattleHandler(Player p1) {
        super(p1, p1);
        player2 = new Bot();
        botMethodUser = (Bot) player2;
        botMethodUser.copyPlayer(player1);
    }

    @Override
    public void botCheck() {
        if (state == BattleState.P2_MOVE && p2SelectedAction == null) {
            Action botMove = botMethodUser.randomAction();
            applyAction(player2, botMove);
            state = BattleState.PROCESSING;
            processTurn();
        }
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
    @Override
    public boolean hasAvailablePlants(Player player) {
        if (!player.getCurrentPlant().isDead()) {
           return true;
        }
        return false;
    }
}

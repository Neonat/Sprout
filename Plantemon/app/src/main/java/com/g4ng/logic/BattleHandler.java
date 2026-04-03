package com.g4ng.logic;

import com.g4ng.model.Plant;
import com.g4ng.model.Player;
import com.g4ng.model.BattleState;

import java.util.Objects;

public abstract class BattleHandler {
    protected Player player1;
    protected Player player2;
    protected Action p1SelectedAction;
    protected Action p2SelectedAction;
    protected BattleState state;

    protected BattleHandler(Player player1, Player player2) {
        this.player1 = Objects.requireNonNull(player1);
        this.player2 = Objects.requireNonNull(player2);
        this.state = BattleState.P1_MOVE;
        
        System.out.println("Battle started between " + player1.getUsername() + " and " + player2.getUsername());
        
        // Ensure both players have a starting plant
        if (player1.getCurrentPlant() == null && !player1.getGarden().isEmpty()) {
            player1.setCurrentPlant(player1.getGarden().get(0));
        }
        if (player2.getCurrentPlant() == null && !player2.getGarden().isEmpty()) {
            player2.setCurrentPlant(player2.getGarden().get(0));
        }
        
        System.out.println(player1.getUsername() + " sends out " + player1.getCurrentPlant().getName());
        System.out.println(player2.getUsername() + " sends out " + player2.getCurrentPlant().getName());
    }

    public void applyAction(Player player, Action action) {
        if (player == player1) {
            p1SelectedAction = action;
            System.out.println(player1.getUsername() + " queued an action.");
        } else if (player == player2) {
            p2SelectedAction = action;
            System.out.println(player2.getUsername() + " queued an action.");
        }
        advanceState();
    }

    public void advanceState() {
        if (state == BattleState.END) return;

        // Unified win check at every state transition
        if (checkWin()) {
            state = BattleState.END;
            handleEnd();
            return;
        }

        switch (state) {
            case P1_MOVE:
                if (p1SelectedAction != null) {
                    state = BattleState.P2_MOVE;
                    System.out.println("State transition: P1_MOVE -> P2_MOVE (Waiting for " + player2.getUsername() + ")");
                }
                break;
            case P2_MOVE:
                if (p2SelectedAction != null) {
                    state = BattleState.PROCESSING;
                    System.out.println("State transition: P2_MOVE -> PROCESSING");
                    processTurn();
                }
                break;
            case PROCESSING:
                resetRound();
                state = BattleState.P1_MOVE;
                System.out.println("State transition: PROCESSING -> P1_MOVE (New Round)");
                break;
        }
    }

    public void processTurn() {
        System.out.println("\n=== Processing Turn ===");
        Plant plant1 = player1.getCurrentPlant();
        Plant plant2 = player2.getCurrentPlant();

        // Speed check for turn order
        if (plant1.getSpeed() >= plant2.getSpeed()) {
            System.out.println(plant1.getName() + " (Speed: " + plant1.getSpeed() + ") goes first against " + 
                               plant2.getName() + " (Speed: " + plant2.getSpeed() + ")");
            executeSequence(p1SelectedAction, p2SelectedAction, player1, player2);
        } else {
            System.out.println(plant2.getName() + " (Speed: " + plant2.getSpeed() + ") goes first against " + 
                               plant1.getName() + " (Speed: " + plant1.getSpeed() + ")");
            executeSequence(p2SelectedAction, p1SelectedAction, player2, player1);
        }

        updatePlayers();
        advanceState();
    }

    public abstract void updatePlayers();

    protected void executeSequence(Action firstAction, Action secondAction, Player firstPlayer, Player secondPlayer) {
        // First player acts
        if (firstAction != null && !firstPlayer.getCurrentPlant().isDead()) {
            // Updated to pass the opponent's action for defense calculation
            firstAction.execute(firstPlayer, secondPlayer, secondAction);
        }

        // Check if second player's plant died
        if (secondPlayer.getCurrentPlant().isDead()) {
            System.out.println(secondPlayer.getUsername() + "'s " + secondPlayer.getCurrentPlant().getName() + " fainted!");
            return; 
        }

        // Second player acts if they survived
        if (secondAction != null && !firstPlayer.getCurrentPlant().isDead()) {
            // Updated to pass the opponent's action for defense calculation
            secondAction.execute(secondPlayer, firstPlayer, firstAction);
            
            // Check if first player's plant died after the counter-attack
            if (firstPlayer.getCurrentPlant().isDead()) {
                System.out.println(firstPlayer.getUsername() + "'s " + firstPlayer.getCurrentPlant().getName() + " fainted!");
            }
        }
    }

    public boolean hasAvailablePlants(Player player) {
        for (Plant plant : player.getGarden()) {
            if (!plant.isDead()) {
                return true;
            }
        }
        return false;
    }

    public boolean checkWin() {
        return !hasAvailablePlants(player1) || !hasAvailablePlants(player2);
    }

    protected void handleEnd() {
        System.out.println("\n=== Battle Ended ===");
        if (!hasAvailablePlants(player1)) {
            System.out.println(player2.getUsername() + " wins!");
        } else if (!hasAvailablePlants(player2)) {
            System.out.println(player1.getUsername() + " wins!");
        }
        player1.restoreGarden();
        player2.restoreGarden();
        System.out.println("Gardens restored for next battle.");
    }

    public void resetRound() {
        p1SelectedAction = null;
        p2SelectedAction = null;
    }

    public BattleState getState() {
        return state;
    }
}

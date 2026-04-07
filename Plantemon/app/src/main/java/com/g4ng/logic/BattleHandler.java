package com.g4ng.logic;

import android.util.Log;

import com.g4ng.model.Plant;
import com.g4ng.model.Player;
import com.g4ng.model.BattleState;

import java.util.Objects;
import java.util.ArrayList;
import java.util.List;

public abstract class BattleHandler {
    private static final String TAG = "BattleHandler";
    protected Player player1;
    protected Player player2;
    protected Action p1SelectedAction;
    protected Action p2SelectedAction;
    protected BattleState state;
    
    protected List<String> turnResults = new ArrayList<>();

    protected BattleHandler(Player player1, Player player2) {
        this.player1 = Objects.requireNonNull(player1);
        this.player2 = Objects.requireNonNull(player2);
        this.state = BattleState.P1_MOVE;
        
        Log.d(TAG, "Battle started: " + player1.getUsername() + " vs " + player2.getUsername());
    }

    public List<String> getLatestTurnResults() {
        return turnResults;
    }

    public void applyAction(Player player, Action action) {
        if (player == player1) {
            p1SelectedAction = action;
        } else if (player == player2) {
            p2SelectedAction = action;
        }
        advanceState();
    }

    public void advanceState() {
        if (state == BattleState.END) return;

        if (checkWin()) {
            state = BattleState.END;
            handleEnd();
            return;
        }

        switch (state) {
            case P1_MOVE:
                if (p1SelectedAction != null) {
                    state = BattleState.P2_MOVE;
                }
                break;
            case P2_MOVE:
                if (p2SelectedAction != null) {
                    state = BattleState.PROCESSING;
                    processTurn();
                }
                break;
            case PROCESSING:
                resetRound();
                state = BattleState.P1_MOVE;
                break;
        }
    }

    public void processTurn() {
        turnResults.clear();
        Plant p1 = player1.getCurrentPlant();
        Plant p2 = player2.getCurrentPlant();

        if (p1.getSpeed() >= p2.getSpeed()) {
            turnResults.add("--- " + p1.getName() + " is faster! ---");
            executeSequence(p1SelectedAction, p2SelectedAction, player1, player2);
        } else {
            turnResults.add("--- " + p2.getName() + " is faster! ---");
            executeSequence(p2SelectedAction, p1SelectedAction, player2, player1);
        }

        updatePlayers();
        advanceState();
    }

    public abstract void updatePlayers();

    protected void executeSequence(Action firstAction, Action secondAction, Player firstPlayer, Player secondPlayer) {
        Action firstPlayerAction = (firstPlayer == player1) ? p1SelectedAction : p2SelectedAction;
        Action secondPlayerAction = (secondPlayer == player1) ? p1SelectedAction : p2SelectedAction;

        if (firstAction != null && !firstPlayer.getCurrentPlant().isDead()) {
            turnResults.add(firstAction.execute(firstPlayer, secondPlayer, secondPlayerAction));
        }

        if (secondPlayer.getCurrentPlant().isDead()) {
            turnResults.add(secondPlayer.getUsername() + "'s " + secondPlayer.getCurrentPlant().getName() + " fainted!");
            return; 
        }

        if (secondAction != null && !firstPlayer.getCurrentPlant().isDead()) {
            turnResults.add(secondAction.execute(secondPlayer, firstPlayer, firstPlayerAction));
            
            if (firstPlayer.getCurrentPlant().isDead()) {
                turnResults.add(firstPlayer.getUsername() + "'s " + firstPlayer.getCurrentPlant().getName() + " fainted!");
            }
        }
    }

    public boolean checkWin() {
        return player1.getCurrentPlant().isDead() || player2.getCurrentPlant().isDead();
    }

    protected void handleEnd() {
        if (player1.getCurrentPlant().isDead()) {
            turnResults.add(player2.getUsername() + " wins!");
        } else {
            turnResults.add(player1.getUsername() + " wins!");
        }
        player1.restoreGarden();
        player2.restoreGarden();
    }

    public void resetRound() {
        p1SelectedAction = null;
        p2SelectedAction = null;
    }

    public BattleState getState() {
        return state;
    }
}

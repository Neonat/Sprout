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

    protected BattleHandler(Player player1, Player player2){
        this.player1 = Objects.requireNonNull(player1);
        this.player2 = Objects.requireNonNull(player2);
        this.state = BattleState.P1_MOVE;
    }

    public void applyAction(Player player, Action action){
        if(player == player1){
            p1SelectedAction = action;
        } else {
            p2SelectedAction = action;
        }
        advanceState();
    }

    public void advanceState(){
        switch(state){
            case P1_MOVE:
                if(p1SelectedAction != null) {
                    state = BattleState.P2_MOVE;
                }
                break;
            case P2_MOVE:
                if(p2SelectedAction != null) {
                    state = BattleState.PROCESSING;
                    processTurn();
                }
                break;
            case PROCESSING:
                if(checkWin()){
                    state = BattleState.END;
                } else {
                    resetRound();
                    state = BattleState.P1_MOVE;
                }
                break;
            case END:
                player1.restoreGarden();
                player2.restoreGarden();
                break;
        }
    }

    public void processTurn(){
        Plant plant1 = player1.getCurrentPlant();
        Plant plant2 = player2.getCurrentPlant();
        if (plant1.getSpeed() >= plant2.getSpeed()) {
            executeSequence(p1SelectedAction, p2SelectedAction, player1, player2);
        } else {
            executeSequence(p2SelectedAction, p1SelectedAction, player2, player1);
        }
        updatePlayers(); // implemented in localbattlehandler i think
        advanceState();
    }

    public abstract void updatePlayers();

    public void executeSequence(Action action1, Action action2, Player player1, Player player2){
        action1.doAction();
        if(player2.getCurrentPlant().isDead()){ // second player's plant somehow did not survive first player's move
            handleDead(player2);}
        else{
            action2.doAction();
        }
        if(player1.getCurrentPlant().isDead()){ // first player's plant somehow did not survive second player's counter move)
            handleDead(player1);
        }
    }

    public void handleDead(Player player){
        if(!hasAvailablePlants(player)){
            state = BattleState.END;
        }
        else{
            // Player must switch
            System.out.println(player.getUsername() + "must swap plants.");
        }
        }

    public boolean hasAvailablePlants(Player player){
        for(Plant plant: player.getGarden()) {
            if (!plant.isDead()) {
                return true;
            }
        }
        return false;
    }

    public boolean checkWin(){
        return !hasAvailablePlants(player1) || !hasAvailablePlants(player2);
    }

    public void resetRound(){
        p1SelectedAction = null;
        p2SelectedAction = null;
    }


    }




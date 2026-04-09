package com.g4ng.logic;

import android.util.Log;

import com.g4ng.model.Player;

public class HumanController implements BattleController{
    @Override
    public void requestAction(BattleHandler handler, Player player) {
        Log.d("Controller", "Waiting for human input for " + player.getUsername());
    }
}

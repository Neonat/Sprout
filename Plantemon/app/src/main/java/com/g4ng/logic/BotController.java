package com.g4ng.logic;

import android.util.Log;

import com.g4ng.model.Player;

import java.util.Random;

public class BotController implements BattleController {
    @Override
    public void requestAction(BattleHandler handler, Player player) {
        Log.d("Controller", "Bot is calculating move for " + player.getUsername());
        Action botAction = calculateBestMove(player);
        handler.applyAction(player, botAction);
    }

    private Action calculateBestMove(Player player) {
        Random r = new Random();
        int checker = r.nextInt(8);
        if (checker == 0){
            return new HealAction();
        }
        int index = r.nextInt(4);
        return player.getCurrentPlant().getMoves().get(index);
    }
}

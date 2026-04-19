package com.g4ng.logic;

import android.util.Log;

import com.g4ng.model.Plant;
import com.g4ng.model.Player;

import java.util.List;
import java.util.Random;

public class BotController implements BattleController {
    private static final String TAG = "BotController";

    @Override
    public void requestAction(BattleHandler handler, Player player) {
        Log.d(TAG, "Bot is calculating move for " + player.getUsername());
        Action botAction = calculateBestMove(player);
        handler.applyAction(player, botAction);
    }

    private Action calculateBestMove(Player player) {
        Plant plant = player.getCurrentPlant();
        if (plant == null) return null;

        // Smart Healing: Heal if HP < 40% and has heals left
        if (plant.getCurrentHealth() < plant.getMaxHealth() * 0.4 && player.getRemainingHeals() > 0) {
            Log.d(TAG, "Bot chose to heal.");
            return new HealAction();
        }
        List<Move> moves = plant.getMoves();
        int index = new Random().nextInt(moves.size());
        return moves.get(index);
    }
}

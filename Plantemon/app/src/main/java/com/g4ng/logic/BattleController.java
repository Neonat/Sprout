package com.g4ng.logic;

import com.g4ng.model.Player;

public interface BattleController {
    void requestAction(BattleHandler handler, Player player);
}

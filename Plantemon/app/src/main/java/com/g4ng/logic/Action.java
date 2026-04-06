package com.g4ng.logic;

import com.g4ng.model.Player;

public interface Action {
    void execute(Player performer, Player opponent, Action opponentAction);
    int getDefenseValue();
}

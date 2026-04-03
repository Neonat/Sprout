package com.g4ng.logic;

import com.g4ng.model.Player;

public interface Action {
    /**
     * Executes the action.
     * @param performer The player performing the action.
     * @param opponent The opponent player.
     * @param opponentAction The action chosen by the opponent for this turn.
     */
    void execute(Player performer, Player opponent, Action opponentAction);

    /**
     * Returns the defense value provided by this action.
     * Used in damage calculations if the opponent uses a Move.
     */
    int getDefenseValue();
}

package com.g4ng.logic;

import com.g4ng.model.Player;
import java.io.Serializable;

public interface Action extends Serializable {
    /*
      Executes the action and returns a string describing what happened.
     */
    String execute(Player performer, Player opponent, Action opponentAction);

    /*
      Returns the defense value provided by this action.
     */
    int getDefenseValue();
}

package com.g4ng.ui;

import com.g4ng.model.Player;

import java.util.ArrayList;

public class GameState {
    private static final Player player = new Player("Bob", new ArrayList<>());

    public static Player getPlayer() {
        return player;
    }
}

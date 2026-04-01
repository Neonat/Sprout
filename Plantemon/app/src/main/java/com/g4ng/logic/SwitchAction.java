package com.g4ng.logic;

import android.widget.Switch;

import com.g4ng.model.Plant;
import com.g4ng.model.Player;

public class SwitchAction implements Action{
    private final Player player;
    private final Plant nextPlant;

    public SwitchAction(Player player, Plant nextPlant){
        this.player = player;
        this.nextPlant = nextPlant;
    }
    @Override
    public void doAction(){
        player.setCurrentPlant(nextPlant);
//        player.setCurrentAction(new SwitchAction());

    }


}

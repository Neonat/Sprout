package com.g4ng.model;

import androidx.annotation.NonNull;

import com.g4ng.logic.Action;
import com.g4ng.logic.HealAction;
import com.g4ng.logic.Move;
import java.util.Collections;
import java.util.List;
import java.util.Random;
public class Bot extends Player{
    protected static final Random r = new Random();
    public Bot() {
        super("bot", Collections.emptyList());
    }

    public void copyPlayer(@NonNull Player player1){
        List<Plant> player1Garden = player1.getGarden();
        this.currentPlant = player1Garden.get(r.nextInt(player1Garden.size()));
    }
    public Action randomAction(){
        int checker = r.nextInt(8);
        if (checker == 0){
            return new HealAction((int)(this.getCurrentPlant().getMaxHealth()*0.5));
        }
        int index = r.nextInt(4);
        return this.getCurrentPlant().getMoves().get(index);
    }
}

package com.g4ng.logic;

public class Move implements Action{
    private String name;
    private final int power;
    private final int accuracy;

    private final int attackValue;

    private final int defenseValue;

    public Move(String name, int power, int accuracy, int attackValue, int defenseValue){
        this.name = name;
        this.power = power;
        this.accuracy = accuracy;
        this.attackValue = attackValue;
        this.defenseValue = defenseValue;
    }
    @Override
    public void doAction(){
        // todo: implement logic for damage calculation
    }
}

package com.g4ng.model;

import com.g4ng.logic.Move;

import java.util.UUID;
import java.util.List;
import java.util.ArrayList;

public class Plant {
    private final UUID id;
    private final String name;
    private int maxHealth;

    private int currentHealth;
    private final int speed;
    private List<Move> moves;

    private Object sprite;

    public Plant(String name, Object sprite){
        this.id = UUID.randomUUID();
        this.name = name;
        this.maxHealth = 100; // todo: design decision, may be fixed, may not
        this.currentHealth = maxHealth;
        this.speed = generateRandomSpeed(); // todo: decide how to handle speed
        this.sprite = sprite;
        this.moves = new ArrayList<>();
    }

    public int generateRandomSpeed(){
        return (int)(Math.random() * 100);
    }
    public void addMove(Move move){
        this.moves.add(move);
    }

    public void deleteMove(Move move){
        this.moves.remove(move);
    }

    // will need this for battle

    public UUID getId(){
        return this.id;
    }

    // will need this for battle
    public int getSpeed(){
        return this.speed;
    }

    // probably for battle page or something
    public List<Move> getMoves(){
        return this.moves;
    }

    // need to display
    public String getName(){
        return this.name;
    }

    public int getMaxHealth(){
        return this.maxHealth;
    }

    public int getCurrentHealth(){
        return this.currentHealth;
    }

    public void setCurrentHealth(int health){
        this.currentHealth = health;
    }

    public void takeDamage(int amount){
        this.currentHealth = Math.max(this.currentHealth - amount, 0);
    }

    public boolean isDead(){
        return this.currentHealth == 0;
    }



}

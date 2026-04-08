package com.g4ng.model;

import com.g4ng.logic.Move;

import java.io.Serializable;
import java.util.UUID;
import java.util.List;
import java.util.ArrayList;
import java.util.Date;

public class Plant implements Serializable {
    private final UUID id;
    private final String name;
    private final int maxHealth;
    private int currentHealth;
    private int speed;
    private final List<Move> moves;
    private final String spritePath;
    private Date scanDateTime;

    // New metadata fields from API
    private List<String> commonNames;
    private String description;
    private String taxonomy;
    private String bestLightCondition;
    private String bestSoilType;
    private String commonUses;
    private String culturalSignificance;
    private String toxicity;
    private String bestWatering;

    public Plant(String name, int speed, String spritePath) {
        this.id = UUID.randomUUID();
        this.name = name;
        this.maxHealth = 100;
        this.currentHealth = maxHealth;
        this.speed = speed;
        this.spritePath = spritePath;
        this.moves = new ArrayList<>();
        this.scanDateTime = new Date(); // Default to now
    }

    // Setters
    public void setSpeed(int speed) { this.speed = speed; }
    public void setCommonNames(List<String> commonNames) { this.commonNames = commonNames; }
    public void setDescription(String description) { this.description = description; }
    public void setTaxonomy(String taxonomy) { this.taxonomy = taxonomy; }
    public void setBestLightCondition(String bestLightCondition) { this.bestLightCondition = bestLightCondition; }
    public void setBestSoilType(String bestSoilType) { this.bestSoilType = bestSoilType; }
    public void setCommonUses(String commonUses) { this.commonUses = commonUses; }
    public void setCulturalSignificance(String culturalSignificance) { this.culturalSignificance = culturalSignificance; }
    public void setToxicity(String toxicity) { this.toxicity = toxicity; }
    public void setBestWatering(String bestWatering) { this.bestWatering = bestWatering; }
    public void setScanDateTime(Date scanDateTime) { this.scanDateTime = scanDateTime; }

    // Getters
    public UUID getId() { return id; }
    public String getName() { return name; }
    public int getSpeed() { return speed; }
    public List<Move> getMoves() { return moves; }
    public int getMaxHealth() { return maxHealth; }
    public int getCurrentHealth() { return currentHealth; }
    public void setCurrentHealth(int health) { this.currentHealth = health; }
    public void takeDamage(int amount) {
        this.currentHealth = Math.max(this.currentHealth - amount, 0);
    }
    public boolean isDead() {
        return currentHealth == 0;
    }
    
    public List<String> getCommonNames() { return commonNames; }
    public String getDescription() { return description; }
    public String getTaxonomy() { return taxonomy; }
    public String getBestLightCondition() { return bestLightCondition; }
    public String getBestSoilType() { return bestSoilType; }
    public String getCommonUses() { return commonUses; }
    public String getCulturalSignificance() { return culturalSignificance; }
    public String getToxicity() { return toxicity; }
    public String getBestWatering() { return bestWatering; }
    public Date getScanDateTime() { return scanDateTime; }

    public String getSpritePath() { return spritePath; }

    public void addMove(Move move) { this.moves.add(move); }
    public void deleteMove(Move move) { this.moves.remove(move); }
}

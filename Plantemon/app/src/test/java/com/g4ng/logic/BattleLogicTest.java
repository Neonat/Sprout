package com.g4ng.logic;

import static org.junit.Assert.*;
import org.junit.Before;
import org.junit.Test;

import com.g4ng.model.Plant;
import com.g4ng.model.Player;
import com.g4ng.model.BattleState;

import java.util.ArrayList;
import java.util.List;

public class BattleLogicTest {
    private Player p1;
    private Player p2;
    private LocalBattleHandler battleHandler;

    @Before
    public void setUp() {
        // Create moves with new signature: Move(name, attack, defense, accuracy, power)
        Move tackle = new Move("Tackle", 20, 10, 100, 0);
        Move vineWhip = new Move("Vine Whip", 25, 5, 90, 0);
        
        // Create plants for P1
        // speed: Bulbasaur(50), Oddish(30)
        Plant bulbasaur = new Plant("Bulbasaur", 50, null);
        bulbasaur.addMove(tackle);
        bulbasaur.addMove(vineWhip);
        
        Plant oddish = new Plant("Oddish", 30, null);
        oddish.addMove(tackle);
        
        List<Plant> garden1 = new ArrayList<>();
        garden1.add(bulbasaur);
        garden1.add(oddish);
        p1 = new Player("Ash", garden1);

        // Create plants for P2
        // speed: Caterpie(40), Weedle(20)
        Plant caterpie = new Plant("Caterpie", 40, null);
        caterpie.addMove(tackle);
        
        Plant weedle = new Plant("Weedle", 20, null);
        weedle.addMove(tackle);
        
        List<Plant> garden2 = new ArrayList<>();
        garden2.add(caterpie);
        garden2.add(weedle);
        p2 = new Player("Gary", garden2);

        p1.setCurrentPlant(p1.getGarden().get(0));
        p2.setCurrentPlant(p2.getGarden().get(0));

        battleHandler = new LocalBattleHandler(p1, p2);
    }

    @Test
    public void testFullBattleScenario() {
        System.out.println("\n>>> TEST: testFullBattleScenario <<<");
        assertEquals(BattleState.P1_MOVE, battleHandler.getState());

        System.out.println("Stage 1: Both players choose Tackle");
        // Round 1: P1 uses Move, P2 uses Move
        battleHandler.applyAction(p1, p1.getCurrentPlant().getMoves().get(0)); // Tackle
        assertEquals(BattleState.P2_MOVE, battleHandler.getState());
        
        battleHandler.applyAction(p2, p2.getCurrentPlant().getMoves().get(0)); // Tackle
        
        // After P2_MOVE, it should have processed and went back to P1_MOVE (or END)
        assertTrue(battleHandler.getState() == BattleState.P1_MOVE || battleHandler.getState() == BattleState.END);
        
        // Check health
        assertTrue(p1.getCurrentPlant().getCurrentHealth() < p1.getCurrentPlant().getMaxHealth());
        assertTrue(p2.getCurrentPlant().getCurrentHealth() < p2.getCurrentPlant().getMaxHealth());
        System.out.println("Result: Health reduced for both plants as expected.");
    }

    @Test
    public void testHealAction() {
        System.out.println("\n>>> TEST: testHealAction <<<");
        System.out.println("Stage 1: Inflicting 50 damage to Ash's Bulbasaur");
        p1.getCurrentPlant().takeDamage(50);
        int healthBefore = p1.getCurrentPlant().getCurrentHealth();
        
        System.out.println("Stage 2: Ash uses HealAction(30), Gary waits");
        HealAction heal = new HealAction();
        // heal by 20% + 10hp
        battleHandler.applyAction(p1, heal);
        // take 1hp damage
        battleHandler.applyAction(p2, new Move("Wait", 0, 0, 100, 0)); // P2 does nothing
        
        assertTrue(p1.getCurrentPlant().getCurrentHealth() > healthBefore);
        assertEquals(healthBefore + 29, p1.getCurrentPlant().getCurrentHealth());
        System.out.println("Result: Health increased by exactly 29.");
    }
    
    @Test
    public void testBattleEndAndRestore() {
        System.out.println("\n>>> TEST: testBattleEndAndRestore <<<");
        System.out.println("Stage 1: Reducing Gary's plants to 5 HP");
        // Force Gary's plants to be near death
        for (Plant p : p2.getGarden()) {
            p.takeDamage(95);
        }
        
        System.out.println("Stage 2: Ash uses Hyper Beam to faint Gary's active plant (Caterpie)");
        // P1 uses a powerful move to kill P2's active plant (Caterpie)
        battleHandler.applyAction(p1, new Move("Hyper Beam", 100, 0, 100, 0));
        battleHandler.applyAction(p2, new Move("Tackle", 20, 10, 100, 0));
        
        // Let's kill the second one too.
        if (battleHandler.getState() != BattleState.END) {
            System.out.println("Stage 3: Gary switches to his last plant (Weedle)");
            // Gary switches to Weedle
            p2.setCurrentPlant(p2.getGarden().get(1)); 
            System.out.println("Stage 4: Ash uses Hyper Beam to faint Weedle");
            battleHandler.applyAction(p1, new Move("Hyper Beam", 100, 0, 100, 0));
            battleHandler.applyAction(p2, new Move("Tackle", 20, 10, 100, 0));
        }
        
        assertEquals(BattleState.END, battleHandler.getState());
        
        System.out.println("Stage 5: Verifying all plants are restored to max health");
        // Verify restoration
        for (Plant p : p2.getGarden()) {
            assertFalse(p.isDead());
            assertEquals(p.getMaxHealth(), p.getCurrentHealth());
        }
        System.out.println("Result: Battle ended and gardens restored.");
    }

    @Test
    public void testSwitchAction() {
        System.out.println("\n>>> TEST: testSwitchAction <<<");
        Plant initialPlant = p1.getCurrentPlant();
        Plant nextPlant = p1.getGarden().get(1); // Oddish
        
        System.out.println("Stage 1: Ash switches from " + initialPlant.getName() + " to " + nextPlant.getName());
        SwitchAction switchAction = new SwitchAction(nextPlant);
        
        battleHandler.applyAction(p1, switchAction);
        battleHandler.applyAction(p2, new Move("Wait", 0, 0, 100, 0));
        
        assertEquals(nextPlant, p1.getCurrentPlant());
        assertNotEquals(initialPlant, p1.getCurrentPlant());
        System.out.println("Result: Ash's active plant is now " + p1.getCurrentPlant().getName());
    }

    @Test
    public void testMissedMove() {
        System.out.println("\n>>> TEST: testMissedMove <<<");
        Plant target = p2.getCurrentPlant();
        int initialHealth = target.getCurrentHealth();
        
        System.out.println("Stage 1: Ash uses a move with 0% accuracy");
        // Move with 0 accuracy should always miss
        Move missMove = new Move("Missy", 50, 0, 0, 0);
        
        battleHandler.applyAction(p1, missMove);
        battleHandler.applyAction(p2, new Move("Wait", 0, 0, 100, 0));
        
        assertEquals(initialHealth, target.getCurrentHealth());
        System.out.println("Result: Gary's " + target.getName() + " took no damage.");
    }
}

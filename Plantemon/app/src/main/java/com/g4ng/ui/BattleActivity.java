package com.g4ng.ui;

import android.os.Bundle;
import android.os.Handler;
import android.view.View;
import android.widget.Button;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.g4ng.logic.Action;
import com.g4ng.logic.HealAction;
import com.g4ng.logic.LocalBattleHandler;
import com.g4ng.logic.Move;
import com.g4ng.model.BattleState;
import com.g4ng.model.Plant;
import com.g4ng.model.Player;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;

public class BattleActivity extends AppCompatActivity {

    private Player player;
    private Player opponent;
    private LocalBattleHandler battleHandler;

    private TextView tvPlayerUsername, tvPlayerPlantName, tvPlayerHp;
    private TextView tvOpponentUsername, tvOpponentPlantName, tvOpponentHp;
    private TextView tvBattleLog;
    private Button btnMove1, btnMove2, btnMove3, btnMove4, btnSpecial;

    private boolean showingSpecial = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_battle);

        initializeUI();
        setupBattle();
        updateUI();
    }

    private void initializeUI() {
        findViewById(R.id.btn_back).setOnClickListener(v -> finish());

        tvPlayerUsername = findViewById(R.id.textViewPlayerUsername);
        tvPlayerPlantName = findViewById(R.id.textViewPlayerPlantName);
        tvPlayerHp = findViewById(R.id.textViewPlayerHp);
        
        tvOpponentUsername = findViewById(R.id.textViewOpponentUsername);
        tvOpponentPlantName = findViewById(R.id.textViewOpponentPlantName);
        tvOpponentHp = findViewById(R.id.textViewOpponentHp);
        
        tvBattleLog = findViewById(R.id.textViewBattleLog);

        btnMove1 = findViewById(R.id.buttonMove1);
        btnMove2 = findViewById(R.id.buttonMove2);
        btnMove3 = findViewById(R.id.buttonMove3);
        btnMove4 = findViewById(R.id.buttonMove4);
        btnSpecial = findViewById(R.id.buttonUseSpecial);

        btnSpecial.setOnClickListener(v -> toggleSpecialMenu());
        
        tvBattleLog.setVisibility(View.VISIBLE);
        tvBattleLog.setText("Choose a move!");
    }

    private void setupBattle() {
        // Player setup
        List<Plant> playerGarden = new ArrayList<>();
        playerGarden.add(new Plant("Bulbasaur", 100, null));
        playerGarden.add(new Plant("Oddish", 100, null));
        player = new Player("Ash", playerGarden);

        // Bot setup
        List<Plant> opponentGarden = new ArrayList<>();
        opponentGarden.add(new Plant("Caterpie", 40, null));
        opponent = new Player("Gary (BOT)", opponentGarden);

        Random random = new Random();
        player.setCurrentPlant(playerGarden.get(random.nextInt(playerGarden.size())));
        opponent.setCurrentPlant(opponentGarden.get(0));

        // Add moves to player
        Plant p = player.getCurrentPlant();
        p.addMove(new Move("Tackle", 20, 10, 100, 0));
        p.addMove(new Move("Vine Whip", 25, 5, 90, 0));
        p.addMove(new Move("Razor Leaf", 35, 0, 80, 0));
        p.addMove(new Move("Sleep Powder", 0, 0, 75, 0));

        // Add moves to bot
        opponent.getCurrentPlant().addMove(new Move("Tackle", 15, 5, 100, 0));

        battleHandler = new LocalBattleHandler(player, opponent);
        setupMoveButtons();
    }

    private void setupMoveButtons() {
        List<Move> moves = player.getCurrentPlant().getMoves();
        setButtonAction(btnMove1, moves.size() > 0 ? moves.get(0) : null);
        setButtonAction(btnMove2, moves.size() > 1 ? moves.get(1) : null);
        setButtonAction(btnMove3, moves.size() > 2 ? moves.get(2) : null);
        setButtonAction(btnMove4, moves.size() > 3 ? moves.get(3) : null);
    }

    private void setButtonAction(Button btn, Move move) {
        if (move != null) {
            btn.setText(move.getName());
            btn.setVisibility(View.VISIBLE);
            btn.setOnClickListener(v -> handlePlayerAction(move));
        } else {
            btn.setVisibility(View.INVISIBLE);
        }
    }

    private void toggleSpecialMenu() {
        showingSpecial = !showingSpecial;
        if (showingSpecial) {
            btnSpecial.setText("Back to Moves");
            updateSpecialMenuButtons();
            btnMove3.setVisibility(View.INVISIBLE);
            btnMove4.setVisibility(View.INVISIBLE);
        } else {
            btnSpecial.setText("Use Special");
            btnMove3.setVisibility(View.VISIBLE);
            btnMove4.setVisibility(View.VISIBLE);
            setupMoveButtons();
            // Ensure they are enabled if it's player's turn
            setButtonsEnabled(battleHandler.getState() == BattleState.P1_MOVE);
        }
    }

    private void updateSpecialMenuButtons() {
        if (showingSpecial) {
            int healAmount = HealAction.calculateHealAmount(player.getCurrentPlant());
            int remaining = player.getRemainingHeals();
            btnMove1.setText("Heal (" + healAmount + " HP) x " + remaining);
            btnMove1.setEnabled(remaining > 0);
            btnMove1.setOnClickListener(v -> handlePlayerAction(new HealAction()));
            
            btnMove2.setText("Switch (N/A)");
            btnMove2.setEnabled(false);
            btnMove2.setOnClickListener(null);
        }
    }

    private void handlePlayerAction(Action action) {
        if (battleHandler.getState() != BattleState.P1_MOVE) return;

        setButtonsEnabled(false);
        battleHandler.applyAction(player, action);

        // Process bot turn
        if (battleHandler.getState() == BattleState.P2_MOVE) {
            Action botAction = selectBotAction();
            battleHandler.applyAction(opponent, botAction);
        }

        displayTurnResults();
    }

    private void displayTurnResults() {
        List<String> results = battleHandler.getLatestTurnResults();
        
        Handler handler = new Handler();
        for (int i = 0; i < results.size(); i++) {
            final String result = results.get(i);
            handler.postDelayed(() -> {
                tvBattleLog.setText(result);
                updateUI();
            }, i * 1500);
        }

        handler.postDelayed(() -> {
            if (battleHandler.getState() == BattleState.P1_MOVE) {
                setButtonsEnabled(true);
                tvBattleLog.setText("Choose a move!");
            } else if (battleHandler.getState() == BattleState.END) {
                tvBattleLog.setText("Battle Over!");
                Toast.makeText(this, "Battle Over!", Toast.LENGTH_LONG).show();
            }
        }, results.size() * 1500);
    }

    private void setButtonsEnabled(boolean enabled) {
        btnSpecial.setEnabled(enabled);
        if (enabled) {
            if (showingSpecial) {
                btnMove1.setEnabled(player.getRemainingHeals() > 0);
                btnMove2.setEnabled(false); // Always disabled in special menu
                btnMove3.setEnabled(false);
                btnMove4.setEnabled(false);
            } else {
                btnMove1.setEnabled(true);
                btnMove2.setEnabled(true);
                btnMove3.setEnabled(true);
                btnMove4.setEnabled(true);
            }
        } else {
            btnMove1.setEnabled(false);
            btnMove2.setEnabled(false);
            btnMove3.setEnabled(false);
            btnMove4.setEnabled(false);
        }
    }

    private Action selectBotAction() {
        // BOT HEAL LOGIC: If health < 40% and has heals left, heal!
        Plant p = opponent.getCurrentPlant();
        if (p.getCurrentHealth() < p.getMaxHealth() * 0.4 && opponent.getRemainingHeals() > 0) {
            return new HealAction();
        }

        // Otherwise, attack
        List<Move> opponentMoves = opponent.getCurrentPlant().getMoves();
        if (opponentMoves.isEmpty()) {
            return new Move("Struggle", 10, 0, 100, 0);
        }
        return opponentMoves.get(new Random().nextInt(opponentMoves.size()));
    }

    private void updateUI() {
        tvPlayerUsername.setText(player.getUsername());
        tvPlayerPlantName.setText(player.getCurrentPlant().getName());
        tvPlayerHp.setText("HP: " + player.getCurrentPlant().getCurrentHealth() + "/" + player.getCurrentPlant().getMaxHealth());
        
        tvOpponentUsername.setText(opponent.getUsername());
        tvOpponentPlantName.setText(opponent.getCurrentPlant().getName());
        tvOpponentHp.setText("HP: " + opponent.getCurrentPlant().getCurrentHealth() + "/" + opponent.getCurrentPlant().getMaxHealth());
        
        // Refresh special menu buttons if open (to update heal count)
        if (showingSpecial) {
            updateSpecialMenuButtons();
        }
    }
}

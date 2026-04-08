package com.g4ng.database;

import static org.junit.Assert.*;

import android.content.Context;
import android.util.Log;

import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;

import com.g4ng.logic.Move;
import com.g4ng.ui.R;

import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;

import java.io.IOException;
import java.io.InputStream;
import java.util.Map;

/**
 * Instrumented test for {@link MoveBase}.
 */
@RunWith(AndroidJUnit4.class)
public class MoveBaseTest {

    private MoveBase moveBase;

    @Before
    public void setUp() {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        moveBase = MoveBase.getInstance();
        try (InputStream is = context.getResources().openRawResource(R.raw.moves)) {
            moveBase.read(is);
        } catch (IOException e) {
            Log.e("MoveBaseTest", "Failed to read moves.json", e);
            fail("Failed to read moves.json");
        }
    }

    @Test
    public void testGetInstance() {
        assertNotNull("MoveBase instance should not be null", moveBase);
    }

    @Test
    public void testDataIsLoaded() {
        Map<Integer, Move> data = moveBase.getData();
        assertNotNull("Data map should not be null", data);
        assertFalse("Data map should not be empty", data.isEmpty());
        // moves.json contains 16 moves
        assertEquals("Should have loaded 16 moves", 16, data.size());
    }

    @Test
    public void testLoadSolarBloom() {
        Map<Integer, Move> data = moveBase.getData();
        // From moves.json: {"id": "4", "name": "Solar Bloom", "attack": 3, "defence": 5}
        Move move = data.get(4);
        assertNotNull("Move with ID 4 (Solar Bloom) should exist", move);
        assertEquals("Solar Bloom", move.getName());
        assertEquals(3, move.getAttack());
        assertEquals(5, move.getDefense());
    }

    @Test
    public void testLoadSpiralBind() {
        Map<Integer, Move> data = moveBase.getData();
        // From moves.json: {"id": "19", "name": "Spiral Bind", "attack": 2, "defence": 8}
        Move move = data.get(19);
        assertNotNull("Move with ID 19 (Spiral Bind) should exist", move);
        assertEquals("Spiral Bind", move.getName());
        assertEquals(2, move.getAttack());
    }

    @Test
    public void testDefaultValues() {
        Map<Integer, Move> data = moveBase.getData();
        Move move = data.get(4);
        assertNotNull(move);
        // accuracy and power are missing in the current moves.json, so they should default to 0
        assertEquals(0, move.getAccuracy());
        assertEquals(0, move.getPower());
    }
}

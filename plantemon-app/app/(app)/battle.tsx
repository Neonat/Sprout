/**
 * Port of BattleActivity. Picks the first plant from the garden as the
 * player's active, generates a random opponent from the same garden as a
 * placeholder bot. Real PvP / bot-roster work comes later.
 */
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { View, Text, Pressable, Image, StyleSheet, ScrollView } from "react-native";
import { Battle } from "@game/battle";
import { healAction, moveAction } from "@game/actions";
import { MoveBase } from "@game/moveBase";
import type { Player, Plant } from "@game/types";
import { api } from "@lib/api";
import { loadCachedMe, saveCachedMe } from "@lib/storage";

export default function BattleScreen() {
  const { getToken } = useAuth();
  const router = useRouter();
  const [battle, setBattle] = useState<Battle | null>(null);
  const [, force] = useState(0);

  useEffect(() => {
    (async () => {
      const me = await loadCachedMe();
      if (!me || me.garden.length === 0) return;
      const playerPlant = me.garden[0];
      // For now: bot fights with a clone of the same plant. Replace with a
      // proper bot roster (server-generated) when we have one.
      const enemyPlant: Plant = { ...playerPlant, id: "enemy-" + playerPlant.id };

      const player: Player = {
        username: me.user.username || "You",
        garden: [{ ...playerPlant }], // clone so we can mutate hp locally
        activePlantId: playerPlant.id,
        healCharges: 3,
      };
      const bot: Player = {
        username: "Wild Plant",
        garden: [enemyPlant],
        activePlantId: enemyPlant.id,
        healCharges: 3,
      };
      setBattle(new Battle(player, bot));
    })();
  }, []);

  if (!battle) {
    return <View style={styles.container}><Text style={styles.body}>No plants in your garden yet.</Text></View>;
  }

  const playerPlant = battle.p1.garden.find((p) => p.id === battle.p1.activePlantId)!;
  const enemyPlant = battle.p2.garden.find((p) => p.id === battle.p2.activePlantId)!;
  const over = battle.phase === "END";

  function pick(actionLabel: "heal" | number) {
    if (over) return;
    const action = actionLabel === "heal" ? healAction() : moveAction(actionLabel);
    battle!.submitPlayerAction(action);
    force((n) => n + 1);
    if (battle!.isOver()) syncWinLoss();
  }

  async function syncWinLoss() {
    try {
      // Persist the player's HP at the moment of the win — gives a sense of
      // continuity even though restoreAfterBattle will reset for next round.
      await api.updatePlant(getToken, playerPlant.id, { hp: playerPlant.hp });
    } catch (e) {
      console.warn(e);
    }
  }

  async function leave() {
    battle!.restoreAfterBattle();
    const me = await loadCachedMe();
    if (me) {
      me.garden = me.garden.map((p) =>
        p.id === playerPlant.id ? { ...p, hp: p.maxHp } : p,
      );
      await saveCachedMe(me);
    }
    router.replace("/(app)/home");
  }

  return (
    <View style={styles.container}>
      <PlantPanel plant={enemyPlant} side="enemy" />
      <PlantPanel plant={playerPlant} side="player" healCharges={battle.p1.healCharges} />

      <ScrollView style={styles.log} contentContainerStyle={{ padding: 8 }}>
        {battle.log.slice(-6).map((line, i) => (
          <Text key={i} style={styles.body}>{line}</Text>
        ))}
      </ScrollView>

      {over ? (
        <Pressable style={styles.bigButton} onPress={leave}>
          <Text style={styles.bigButtonText}>Continue</Text>
        </Pressable>
      ) : (
        <View style={styles.moveGrid}>
          {playerPlant.moves.map((mid) => (
            <Pressable key={mid} style={styles.moveButton} onPress={() => pick(mid)}>
              <Text style={styles.moveText}>{MoveBase.get(mid).name}</Text>
            </Pressable>
          ))}
          <Pressable
            style={[styles.moveButton, battle.p1.healCharges === 0 && { opacity: 0.4 }]}
            onPress={() => pick("heal")}
            disabled={battle.p1.healCharges === 0}
          >
            <Text style={styles.moveText}>Heal ({battle.p1.healCharges})</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function PlantPanel({
  plant, side, healCharges,
}: { plant: Plant; side: "player" | "enemy"; healCharges?: number }) {
  const pct = Math.max(0, Math.min(1, plant.hp / plant.maxHp));
  return (
    <View style={[styles.panel, side === "enemy" && { flexDirection: "row-reverse" }]}>
      <Image source={{ uri: plant.spriteUrl }} style={styles.sprite} />
      <View style={{ flex: 1, padding: 8 }}>
        <Text style={styles.name}>{plant.name}</Text>
        <View style={styles.hpTrack}>
          <View style={[styles.hpFill, { width: `${pct * 100}%` }]} />
        </View>
        <Text style={styles.body}>{plant.hp}/{plant.maxHp}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12, gap: 12 },
  panel: { flexDirection: "row", backgroundColor: "#2D5239", borderRadius: 12, padding: 8, alignItems: "center" },
  sprite: { width: 96, height: 96, backgroundColor: "#1F3D2B", borderRadius: 8 },
  name: { color: "#E7F5C5", fontSize: 18, fontWeight: "700" },
  hpTrack: { height: 8, backgroundColor: "#1F3D2B", borderRadius: 4, marginVertical: 6, overflow: "hidden" },
  hpFill: { height: "100%", backgroundColor: "#7BB661" },
  body: { color: "#E7F5C5" },
  log: { flex: 1, backgroundColor: "#2D5239", borderRadius: 10 },
  moveGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  moveButton: { flexBasis: "48%", backgroundColor: "#7BB661", padding: 12, borderRadius: 8, alignItems: "center" },
  moveText: { color: "#1F3D2B", fontWeight: "600" },
  bigButton: { backgroundColor: "#E7F5C5", padding: 16, borderRadius: 10, alignItems: "center" },
  bigButtonText: { color: "#1F3D2B", fontWeight: "700", fontSize: 16 },
});

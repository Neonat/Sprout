/**
 * Port of InfoActivity. Shows everything we know about the plant.
 * Layout is intentionally simple — match the Android visual once you're happy
 * with content flow.
 */
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-expo";
import { View, Text, Image, ScrollView, StyleSheet } from "react-native";
import { MoveBase } from "@game/moveBase";
import type { Plant } from "@game/types";
import { loadCachedMe } from "@lib/storage";

export default function Info() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [plant, setPlant] = useState<Plant | null>(null);

  useEffect(() => {
    (async () => {
      const me = await loadCachedMe();
      setPlant(me?.garden.find((p) => p.id === id) ?? null);
    })();
  }, [id]);

  if (!plant) return <View style={styles.container}><Text style={styles.body}>Loading…</Text></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, gap: 12 }}>
      <View style={styles.heroRow}>
        <Image source={{ uri: plant.spriteUrl }} style={styles.sprite} />
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{plant.name}</Text>
          <Text style={styles.stat}>HP {plant.hp}/{plant.maxHp}</Text>
          <Text style={styles.stat}>SPD {plant.speed}  ATK {plant.attack}</Text>
        </View>
      </View>

      <Section title="Moves">
        {plant.moves.map((mid) => {
          const m = MoveBase.get(mid);
          return (
            <Text key={mid} style={styles.body}>
              • {m.name} — ATK {m.attack} / DEF {m.defense} / ACC {m.accuracy}
            </Text>
          );
        })}
      </Section>

      {plant.description && (
        <Section title="About"><Text style={styles.body}>{plant.description}</Text></Section>
      )}
      {plant.watering && <Field label="Watering" value={plant.watering} />}
      {plant.sunlight && <Field label="Sunlight" value={plant.sunlight} />}
      {plant.soil && <Field label="Soil" value={plant.soil} />}
      {plant.toxicity && <Field label="Toxicity" value={plant.toxicity} />}
      {plant.culturalSignificance && <Field label="Cultural significance" value={plant.culturalSignificance} />}
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}
function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{label}</Text>
      <Text style={styles.body}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  heroRow: { flexDirection: "row", gap: 16, alignItems: "center" },
  sprite: { width: 120, height: 120, backgroundColor: "#2D5239", borderRadius: 12 },
  name: { color: "#E7F5C5", fontSize: 24, fontWeight: "700" },
  stat: { color: "#E7F5C5", marginTop: 4 },
  section: { backgroundColor: "#2D5239", padding: 12, borderRadius: 10, gap: 6 },
  sectionTitle: { color: "#7BB661", fontWeight: "700" },
  body: { color: "#E7F5C5", lineHeight: 20 },
});

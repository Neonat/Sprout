/**
 * Port of GardenActivity. 6-pot shelf — tap a pot to open Info.
 */
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@clerk/clerk-expo";
import { useFocusEffect, useRouter } from "expo-router";
import { View, Text, Image, Pressable, StyleSheet, FlatList } from "react-native";
import { api, type Me } from "@lib/api";
import { loadCachedMe, saveCachedMe } from "@lib/storage";

export default function Garden() {
  const { getToken } = useAuth();
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);

  const refresh = useCallback(async () => {
    const cached = await loadCachedMe();
    if (cached) setMe(cached);
    try {
      const fresh = await api.me(getToken);
      setMe(fresh);
      await saveCachedMe(fresh);
    } catch (e) {
      console.warn("Failed to fetch /me:", e);
    }
  }, [getToken]);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  // Always render exactly 6 pot slots, like the Android shelf
  const slots = Array.from({ length: 6 }, (_, i) => me?.garden[i] ?? null);

  return (
    <View style={styles.container}>
      <FlatList
        data={slots}
        numColumns={2}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={{ gap: 12, padding: 12 }}
        columnWrapperStyle={{ gap: 12 }}
        renderItem={({ item }) =>
          item ? (
            <Pressable
              style={styles.pot}
              onPress={() => router.push(`/(app)/info/${item.id}`)}
            >
              <Image source={{ uri: item.spriteUrl }} style={styles.sprite} />
              <Text style={styles.name}>{item.name}</Text>
            </Pressable>
          ) : (
            <View style={[styles.pot, styles.emptyPot]}>
              <Text style={styles.emptyText}>empty</Text>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  pot: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: "#7BB661",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
  },
  emptyPot: { backgroundColor: "#2D5239" },
  sprite: { width: 96, height: 96, marginBottom: 8 },
  name: { color: "#1F3D2B", fontWeight: "600", textAlign: "center" },
  emptyText: { color: "#E7F5C5", opacity: 0.5 },
});

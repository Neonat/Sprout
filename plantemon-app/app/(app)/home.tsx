/**
 * Port of MainActivity. Three buttons: Garden, Scan, Battle.
 */
import { Link } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { Text, View, Pressable, StyleSheet } from "react-native";

export default function Home() {
  const { signOut } = useAuth();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Plantemon</Text>

      <Link href="/(app)/garden" asChild>
        <Pressable style={styles.button}><Text style={styles.buttonText}>Garden</Text></Pressable>
      </Link>
      <Link href="/(app)/scan" asChild>
        <Pressable style={styles.button}><Text style={styles.buttonText}>Scan a plant</Text></Pressable>
      </Link>
      <Link href="/(app)/battle" asChild>
        <Pressable style={styles.button}><Text style={styles.buttonText}>Battle</Text></Pressable>
      </Link>

      <Pressable style={styles.signOut} onPress={() => signOut()}>
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12, justifyContent: "center" },
  title: { fontSize: 40, color: "#E7F5C5", textAlign: "center", marginBottom: 32 },
  button: { backgroundColor: "#7BB661", padding: 16, borderRadius: 10, alignItems: "center" },
  buttonText: { color: "#1F3D2B", fontSize: 18, fontWeight: "600" },
  signOut: { marginTop: 40, alignItems: "center" },
  signOutText: { color: "#E7F5C5", opacity: 0.7 },
});

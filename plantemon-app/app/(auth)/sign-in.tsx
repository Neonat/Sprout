import { useSignIn } from "@clerk/clerk-expo";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { Text, TextInput, Pressable, View, StyleSheet } from "react-native";

export default function SignIn() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    if (!isLoaded) return;
    setError(null);
    try {
      const attempt = await signIn.create({ identifier: email, password });
      if (attempt.status === "complete") {
        await setActive({ session: attempt.createdSessionId });
        router.replace("/(app)/home");
      } else {
        setError("Additional verification required");
      }
    } catch (e: any) {
      setError(e?.errors?.[0]?.message ?? "Sign-in failed");
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Plantemon</Text>
      <TextInput
        placeholder="email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
      />
      <TextInput
        placeholder="password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={styles.input}
      />
      {error && <Text style={styles.error}>{error}</Text>}
      <Pressable style={styles.button} onPress={onSubmit}>
        <Text style={styles.buttonText}>Sign in</Text>
      </Pressable>
      <Link href="/(auth)/sign-up" style={styles.link}>
        Need an account? Sign up
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "center", gap: 12, backgroundColor: "#1F3D2B" },
  title: { fontSize: 32, color: "#E7F5C5", textAlign: "center", marginBottom: 24 },
  input: { backgroundColor: "#E7F5C5", padding: 12, borderRadius: 8 },
  button: { backgroundColor: "#7BB661", padding: 14, borderRadius: 8, alignItems: "center" },
  buttonText: { color: "#1F3D2B", fontWeight: "600" },
  error: { color: "#FFB4B4" },
  link: { color: "#E7F5C5", textAlign: "center", marginTop: 12 },
});

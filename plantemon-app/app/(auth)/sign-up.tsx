import { useSignUp } from "@clerk/clerk-expo";
import { useRouter, Link } from "expo-router";
import { useState } from "react";
import { Text, TextInput, Pressable, View, StyleSheet } from "react-native";

export default function SignUp() {
  const { signUp, setActive, isLoaded } = useSignUp();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    if (!isLoaded) return;
    setError(null);
    try {
      await signUp.create({ emailAddress: email, password });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setPending(true);
    } catch (e: any) {
      setError(e?.errors?.[0]?.message ?? "Sign-up failed");
    }
  }

  async function verify() {
    if (!isLoaded) return;
    try {
      const attempt = await signUp.attemptEmailAddressVerification({ code });
      if (attempt.status === "complete") {
        await setActive({ session: attempt.createdSessionId });
        router.replace("/(app)/home");
      }
    } catch (e: any) {
      setError(e?.errors?.[0]?.message ?? "Verification failed");
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create account</Text>
      {!pending ? (
        <>
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
          <Pressable style={styles.button} onPress={start}>
            <Text style={styles.buttonText}>Continue</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text style={styles.label}>Check your email for a 6-digit code:</Text>
          <TextInput
            placeholder="123456"
            keyboardType="number-pad"
            value={code}
            onChangeText={setCode}
            style={styles.input}
          />
          <Pressable style={styles.button} onPress={verify}>
            <Text style={styles.buttonText}>Verify</Text>
          </Pressable>
        </>
      )}
      {error && <Text style={styles.error}>{error}</Text>}
      <Link href="/(auth)/sign-in" style={styles.link}>
        Have an account? Sign in
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "center", gap: 12, backgroundColor: "#1F3D2B" },
  title: { fontSize: 28, color: "#E7F5C5", textAlign: "center", marginBottom: 24 },
  input: { backgroundColor: "#E7F5C5", padding: 12, borderRadius: 8 },
  button: { backgroundColor: "#7BB661", padding: 14, borderRadius: 8, alignItems: "center" },
  buttonText: { color: "#1F3D2B", fontWeight: "600" },
  label: { color: "#E7F5C5" },
  error: { color: "#FFB4B4" },
  link: { color: "#E7F5C5", textAlign: "center", marginTop: 12 },
});

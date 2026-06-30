/**
 * Auth gate. Redirects to /sign-in if signed-out, otherwise into the app.
 */
import { Redirect } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { View, ActivityIndicator } from "react-native";

export default function Index() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }
  return isSignedIn ? <Redirect href="/(app)/home" /> : <Redirect href="/(auth)/sign-in" />;
}

import { Stack } from "expo-router";

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#1F3D2B" },
        headerTintColor: "#E7F5C5",
        contentStyle: { backgroundColor: "#1F3D2B" },
      }}
    >
      <Stack.Screen name="home" options={{ title: "Plantemon" }} />
      <Stack.Screen name="garden" options={{ title: "Garden" }} />
      <Stack.Screen name="scan" options={{ title: "Scan" }} />
      <Stack.Screen name="info/[id]" options={{ title: "Plant" }} />
      <Stack.Screen name="battle" options={{ title: "Battle" }} />
    </Stack>
  );
}

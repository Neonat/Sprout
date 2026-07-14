/**
 * Port of ScanActivity. Pipeline (same as the Java):
 *   1. capture image (expo-camera on native, file input fallback on web)
 *   2. POST to /api/identify  → name + taxonomy + metadata
 *   3. POST to /api/sprite    → public PNG URL
 *   4. PlantFactory.createFromApi → POST /api/plants
 *   5. update local cache, navigate back to garden
 */
import { useState, useRef } from "react";
import { useAuth } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { Platform, View, Text, Pressable, Image, ActivityIndicator, StyleSheet } from "react-native";
import { api, type Me } from "@lib/api";
import { loadCachedMe, saveCachedMe } from "@lib/storage";
import { createFromApi } from "@game/plantFactory";

type Step = "capture" | "identifying" | "generating-sprite" | "done";

export default function Scan() {
  const { getToken } = useAuth();
  const router = useRouter();
  const cameraRef = useRef<CameraView>(null);
  const [perm, requestPerm] = useCameraPermissions();
  const [step, setStep] = useState<Step>("capture");
  const [error, setError] = useState<string | null>(null);
  const [previewUri, setPreviewUri] = useState<string | null>(null);

  async function pickFromGallery() {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      base64: true,
      quality: 0.6,
    });
    if (res.canceled || !res.assets[0]?.base64) return;
    setPreviewUri(res.assets[0].uri);
    await runPipeline(res.assets[0].base64);
  }

  async function snap() {
    if (!cameraRef.current) return;
    const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.6 });
    if (!photo?.base64) return;
    setPreviewUri(photo.uri);
    await runPipeline(photo.base64);
  }

  async function runPipeline(base64: string) {
    setError(null);
    try {
      setStep("identifying");
      const identified = await api.identify(getToken, base64);

      setStep("generating-sprite");
      const sprite = await api.sprite(getToken, identified.name, base64);

      const draft = createFromApi({
        name: identified.name,
        spriteUrl: sprite.url,
        taxonomy: identified.taxonomy,
        commonNames: identified.commonNames,
        description: identified.description,
        watering: identified.watering,
        sunlight: identified.sunlight,
        soil: identified.soil,
        toxicity: identified.toxicity,
        culturalSignificance: identified.culturalSignificance,
      });

      // Strip local id; server assigns the real UUID
      const { id: _localId, ownerId: _own, ...payload } = draft;
      const created = await api.createPlant(getToken, payload);

      // Update cache so /garden shows it immediately
      const cached: Me = (await loadCachedMe()) ?? {
        user: { id: "", username: "", activePlantId: null, healCharges: 3 },
        garden: [],
      };
      cached.garden.push(created);
      await saveCachedMe(cached);

      setStep("done");
      router.replace("/(app)/garden");
    } catch (e: any) {
      console.warn(e);
      setError(e.message ?? "Scan failed");
      setStep("capture");
    }
  }

  if (step !== "capture") {
    return (
      <View style={styles.center}>
        {previewUri && <Image source={{ uri: previewUri }} style={styles.preview} />}
        <ActivityIndicator size="large" color="#E7F5C5" />
        <Text style={styles.statusText}>
          {step === "identifying" ? "Identifying plant…" : "Generating sprite…"}
        </Text>
      </View>
    );
  }

  // Web: no live viewfinder — image picker only
  if (Platform.OS === "web") {
    return (
      <View style={styles.center}>
        <Text style={styles.heading}>Upload a plant photo</Text>
        <Pressable style={styles.button} onPress={pickFromGallery}>
          <Text style={styles.buttonText}>Choose image</Text>
        </Pressable>
        {error && <Text style={styles.error}>{error}</Text>}
      </View>
    );
  }

  if (!perm) return <View />;
  if (!perm.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.heading}>Camera permission required</Text>
        <Pressable style={styles.button} onPress={requestPerm}>
          <Text style={styles.buttonText}>Grant permission</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back" />
      <View style={styles.bar}>
        <Pressable style={styles.button} onPress={pickFromGallery}>
          <Text style={styles.buttonText}>Gallery</Text>
        </Pressable>
        <Pressable style={[styles.button, { backgroundColor: "#E7F5C5" }]} onPress={snap}>
          <Text style={styles.buttonText}>Capture</Text>
        </Pressable>
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, gap: 16 },
  heading: { color: "#E7F5C5", fontSize: 18 },
  statusText: { color: "#E7F5C5", marginTop: 12 },
  preview: { width: 200, height: 200, marginBottom: 16, borderRadius: 8 },
  bar: { flexDirection: "row", padding: 16, gap: 12, justifyContent: "center" },
  button: { backgroundColor: "#7BB661", padding: 14, borderRadius: 10, minWidth: 120, alignItems: "center" },
  buttonText: { color: "#1F3D2B", fontWeight: "600" },
  error: { color: "#FFB4B4", textAlign: "center", padding: 12 },
});

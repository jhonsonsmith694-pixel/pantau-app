import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { SplashScreen } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  useFonts,
  Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold, Outfit_800ExtraBold,
} from "@expo-google-fonts/outfit";
import { JetBrainsMono_400Regular, JetBrainsMono_500Medium } from "@expo-google-fonts/jetbrains-mono";
import { AppProvider } from "../src/AppContext";
import { useApp } from "../src/hooks/useApp";
import { ErrorBoundary } from "../src/components/ErrorBoundary";
import { configureNotificationHandler, requestNotificationPermission } from "../src/services/notifications";
import { registerBackgroundFetch } from "../src/services/background";

SplashScreen.preventAutoHideAsync();

// Configure notification display behavior once at module load (defensive).
try { configureNotificationHandler(); } catch {}

// Global baseline font so every Text without an explicit family uses Outfit
// (taste skills ban system defaults). Headers/labels override with their own weight.
const RNTextAny = Text as any;
RNTextAny.defaultProps = RNTextAny.defaultProps || {};
RNTextAny.defaultProps.style = [{ fontFamily: "Outfit_400Regular" }, RNTextAny.defaultProps.style];

export default function RootLayout() {
  return (
    <AppProvider>
      <ErrorBoundary>
        <RootNavigator />
      </ErrorBoundary>
    </AppProvider>
  );
}

function RootNavigator() {
  const { loaded } = useApp();
  const [splashDone, setSplashDone] = useState(false);
  const [fontsLoaded] = useFonts({
    Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold, Outfit_800ExtraBold,
    JetBrainsMono_400Regular, JetBrainsMono_500Medium,
  });

  useEffect(() => {
    if (loaded && fontsLoaded) {
      setTimeout(() => {
        SplashScreen.hideAsync();
        setSplashDone(true);
      }, 200);
      // Set up notifications + background price-alert checks (best-effort).
      requestNotificationPermission().then(granted => {
        if (granted) registerBackgroundFetch();
      });
    }
  }, [loaded, fontsLoaded]);

  if (!splashDone) {
    return (
      <View style={styles.splash}>
        <StatusBar style="dark" />
        <View style={styles.splashContent}>
          <View style={styles.splashLogo}>
            <Ionicons name="eye" size={40} color="#FFFFFF" />
          </View>
          <Text style={styles.splashTitle}>PANTAU</Text>
          <ActivityIndicator color="#0F766E" style={{ marginTop: 20 }} />
        </View>
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#F7F7F8" },
        animation: "slide_from_right",
      }}>
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="monitor/[id]" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="compare" options={{ animation: "slide_from_bottom" }} />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, backgroundColor: "#F7F7F8", justifyContent: "center", alignItems: "center" },
  splashContent: { alignItems: "center" },
  splashLogo: { width: 80, height: 80, borderRadius: 24, backgroundColor: "#0F766E", alignItems: "center", justifyContent: "center", marginBottom: 16 },
  splashTitle: { fontSize: 30, fontWeight: "800", color: "#18181B", letterSpacing: -1, fontFamily: "Outfit_800ExtraBold" },
});

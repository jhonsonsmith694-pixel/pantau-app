import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { SplashScreen } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AppProvider } from "../src/AppContext";
import { useApp } from "../src/hooks/useApp";
import { ErrorBoundary } from "../src/components/ErrorBoundary";

SplashScreen.preventAutoHideAsync();

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

  useEffect(() => {
    if (loaded) {
      setTimeout(() => {
        SplashScreen.hideAsync();
        setSplashDone(true);
      }, 300);
    }
  }, [loaded]);

  if (!splashDone) {
    return (
      <View style={styles.splash}>
        <StatusBar style="dark" />
        <View style={styles.splashContent}>
          <View style={styles.splashLogo}>
            <Ionicons name="eye" size={40} color="#FFFFFF" />
          </View>
          <Text style={styles.splashTitle}>PANTAU</Text>
          <ActivityIndicator color="#0066FF" style={{ marginTop: 20 }} />
        </View>
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#F0F2F5" },
        animation: "slide_from_right",
      }}>
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, backgroundColor: "#F0F2F5", justifyContent: "center", alignItems: "center" },
  splashContent: { alignItems: "center" },
  splashLogo: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#0066FF", alignItems: "center", justifyContent: "center", marginBottom: 16 },
  splashTitle: { fontSize: 28, fontWeight: "800", color: "#0F172A", letterSpacing: -0.5 },
});

import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Keyboard } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useApp } from "../../src/hooks/useApp";
import { useTheme } from "../../src/hooks";
import { SPACING, BORDER_RADIUS } from "../../src/config";
import { setOnboarded } from "../../src/storage";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

const AVATARS: { name: string; icon: IconName }[] = [
  { name: "happy", icon: "happy" },
  { name: "rocket", icon: "rocket" },
  { name: "bulb", icon: "bulb" },
  { name: "star", icon: "star" },
  { name: "heart", icon: "heart" },
  { name: "code-slash", icon: "code-slash" },
];

export default function OnboardingScreen() {
  const { setUser } = useApp();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("happy");

  const handleStart = async () => {
    const finalName = name.trim() || "Pengguna";
    setUser({ name: finalName, avatar });
    await setOnboarded();
    router.replace("/(tabs)");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }} keyboardVerticalOffset={Platform.OS === "android" ? 0 : 0}>
        <LinearGradient colors={isDark ? ["#1E3A5F", "#1E293B"] : ["#0066FF", "#0044CC"]} style={styles.header}>
          <View style={styles.logoCircle}>
            <Ionicons name="eye" size={36} color="#FFFFFF" />
          </View>
          <Text style={styles.title}>PANTAU</Text>
          <Text style={styles.subtitle}>AI Personal Monitor</Text>
        </LinearGradient>

        <View style={[styles.form, { backgroundColor: colors.surface }]}>
          <Text style={[styles.formTitle, { color: colors.text }]}>Siapa kamu?</Text>

          <View style={[styles.inputWrap, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
            <Ionicons name="person" size={18} color={colors.textTertiary} style={{ marginRight: 8 }} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Nama kamu"
              placeholderTextColor={colors.textTertiary}
              value={name}
              onChangeText={setName}
              onSubmitEditing={handleStart}
              returnKeyType="done"
            />
          </View>

          <Text style={[styles.formTitle, { color: colors.text, marginTop: SPACING.xl }]}>Pilih Avatar</Text>
          <View style={styles.avatarGrid}>
            {AVATARS.map(a => (
              <TouchableOpacity key={a.name} onPress={() => setAvatar(a.name)} style={[styles.avatarItem, { backgroundColor: avatar === a.name ? colors.primary : colors.surfaceSecondary, borderColor: avatar === a.name ? colors.primary : colors.border }]}>
                <Ionicons name={a.icon} size={28} color={avatar === a.name ? "#FFF" : colors.text} />
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity onPress={handleStart} style={[styles.startBtn, { backgroundColor: colors.primary, opacity: 1 }]}>
            <Text style={styles.startBtnText}>Mulai Pantau!</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: "center", paddingTop: 40, paddingBottom: 40 },
  logoCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  title: { fontSize: 28, fontWeight: "800", color: "#FFFFFF", letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: "rgba(255,255,255,0.8)", marginTop: 4 },
  form: { flex: 1, borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -20, padding: SPACING.xl },
  formTitle: { fontSize: 16, fontWeight: "700", marginBottom: SPACING.md },
  inputWrap: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: BORDER_RADIUS.lg, paddingHorizontal: SPACING.md, height: 48 },
  input: { flex: 1, fontSize: 15 },
  avatarGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "center", marginBottom: SPACING.xxl },
  avatarItem: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", borderWidth: 2 },
  startBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 14, borderRadius: BORDER_RADIUS.lg, gap: 8 },
  startBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
});

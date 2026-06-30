import { useState, useCallback, useMemo } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Switch, Alert, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "../../src/hooks/useApp";
import { useTheme } from "../../src/hooks";
import { Card, Button, ConfirmDialog, Toast } from "../../src/components";
import { getStorageUsage } from "../../src/storage";
import { CONFIG, SPACING, BORDER_RADIUS } from "../../src/config";
import { ThemeMode } from "../../src/types";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

export default function ProfilScreen() {
  const { user, logout, notificationEnabled, setNotificationEnabled, syncing, syncNow, lastSyncAt, themeMode, setThemeMode } = useApp();
  const { colors, isDark } = useTheme();
  const [showLogout, setShowLogout] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [storageInfo, setStorageInfo] = useState<{ used: number; items: Record<string, number> } | null>(null);

  const loadStorage = useCallback(async () => {
    const info = await getStorageUsage();
    setStorageInfo(info);
  }, []);

  const themeOptions: { key: ThemeMode; label: string; icon: IconName }[] = [
    { key: "light", label: "Terang", icon: "sunny" },
    { key: "dark", label: "Gelap", icon: "moon" },
    { key: "system", label: "Sistem", icon: "phone-portrait" },
  ];

  const handleSync = useCallback(async () => {
    setToastMsg("Menyimpan ke cloud");
    setShowToast(true);
    await syncNow();
    setToastMsg("Tersimpan ke cloud");
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  }, [syncNow]);

  const handleExport = useCallback(async () => {
    try {
      const { loadMonitors, loadNotes } = await import("../../src/storage");
      const m = await loadMonitors();
      const n = await loadNotes();
      const data = JSON.stringify({ monitors: m, notes: n, exportedAt: new Date().toISOString() }, null, 2);
      // In a real app, use expo-file-system or share
      Alert.alert("Export Data", `Data siap diexport (${data.length} bytes).\nFitur export file akan ditambahkan dengan expo-file-system.`);
    } catch {}
  }, []);

  const handleDeleteAccount = useCallback(() => {
    Alert.alert("Hapus Akun", "Semua data akan dihapus permanen. Lanjutkan?", [
      { text: "Batal", style: "cancel" },
      { text: "Hapus", style: "destructive", onPress: logout },
    ]);
  }, [logout]);

  const MenuItem = ({ icon, label, value, onPress, color }: { icon: IconName; label: string; value?: string; onPress?: () => void; color?: string }) => (
    <TouchableOpacity onPress={onPress} disabled={!onPress} style={[styles.menuItem, { borderBottomColor: colors.border }]}>
      <View style={[styles.menuIcon, { backgroundColor: (color || colors.primary) + "15" }]}>
        <Ionicons name={icon} size={18} color={color || colors.primary} />
      </View>
      <Text style={[styles.menuLabel, { color: colors.text }]}>{label}</Text>
      {value && <Text style={[styles.menuValue, { color: colors.textTertiary }]}>{value}</Text>}
      {onPress && <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} keyboardShouldPersistTaps="handled">
        {/* Profile Card */}
        <View style={[styles.profileCard, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Ionicons name={user?.avatar as IconName || "person"} size={28} color="#FFF" />
          </View>
          <Text style={[styles.profileName, { color: colors.text }]}>{user?.name || "Pengguna"}</Text>
          <Text style={[styles.profileSub, { color: colors.textTertiary }]}>Mode: {syncing === "success" ? "Online" : "Offline-First"}</Text>
        </View>

        {/* Sync */}
        <Card colors={colors} style={{ marginHorizontal: SPACING.lg, marginTop: SPACING.lg }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flex: 1, paddingRight: SPACING.md }}>
              <Text style={[styles.menuLabel, { color: colors.text }]}>Sync ke Cloud</Text>
              <Text style={{ color: colors.textTertiary, fontSize: 12, marginTop: 2, lineHeight: 17 }}>
                {syncing === "syncing" ? "Menyimpan" : syncing === "error" ? "Gagal — coba lagi" : lastSyncAt ? `Backup terakhir: ${lastSyncAt.slice(0, 10)}` : "Cadangkan catatan & pantauan kamu ke cloud biar aman dan balik lagi kalau ganti HP"}
              </Text>
            </View>
            <Button title="Sync" onPress={handleSync} variant={syncing === "success" ? "secondary" : "primary"} size="sm" colors={colors} icon="cloud-upload" loading={syncing === "syncing"} />
          </View>
        </Card>

        {/* Theme */}
        <View style={[styles.section, { paddingHorizontal: SPACING.lg, marginTop: SPACING.lg }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Tampilan</Text>
        </View>
        <Card colors={colors} style={{ marginHorizontal: SPACING.lg }}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {themeOptions.map(opt => (
              <TouchableOpacity key={opt.key} onPress={() => setThemeMode(opt.key)} style={[styles.themeOpt, { backgroundColor: themeMode === opt.key ? colors.primary : colors.surfaceSecondary, borderColor: colors.border }]}>
                <Ionicons name={opt.icon} size={18} color={themeMode === opt.key ? "#FFF" : colors.text} />
                <Text style={{ color: themeMode === opt.key ? "#FFF" : colors.text, fontSize: 12, fontWeight: "500" }}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Notifications */}
        <View style={[styles.section, { paddingHorizontal: SPACING.lg, marginTop: SPACING.lg }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Pengaturan</Text>
        </View>
        <Card colors={colors} style={{ marginHorizontal: SPACING.lg }}>
          <MenuItem icon="notifications" label="Notifikasi" value={notificationEnabled ? "Aktif" : "Nonaktif"} />
          <View style={[styles.menuItem, { borderBottomColor: colors.border }]}>
            <View style={[styles.menuIcon, { backgroundColor: colors.success + "15" }]}>
              <Ionicons name="notifications" size={18} color={colors.success} />
            </View>
            <Text style={[styles.menuLabel, { color: colors.text, flex: 1 }]}>Notifikasi Push</Text>
            <Switch value={notificationEnabled} onValueChange={setNotificationEnabled} trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#FFF" />
          </View>
          <MenuItem icon="cloud-download" label="Export Data" onPress={handleExport} />
          <MenuItem icon="trash-outline" label="Hapus Akun" color={colors.error} onPress={handleDeleteAccount} />
        </Card>

        {/* Info */}
        <View style={[styles.section, { paddingHorizontal: SPACING.lg, marginTop: SPACING.lg }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Informasi</Text>
        </View>
        <Card colors={colors} style={{ marginHorizontal: SPACING.lg }}>
          <MenuItem icon="information-circle" label="Versi" value={`${CONFIG.version}`} onPress={() => {}} />
          <MenuItem icon="cube" label="Build" value={CONFIG.buildNumber} />
          <MenuItem icon="server" label="Server" value="Cloudflare D1" />
          <MenuItem icon="cloud-done" label="Status Sync" value={syncing === "success" ? "Connected" : lastSyncAt ? "Last sync available" : "Never"} />
          <MenuItem icon="layers" label="Penyimpanan" value={storageInfo ? `${(storageInfo.used / 1024).toFixed(1)} KB` : "Tap lihat"} onPress={loadStorage} />
        </Card>

        {/* About */}
        <Card colors={colors} style={{ marginHorizontal: SPACING.lg, marginTop: SPACING.lg }}>
          <MenuItem icon="code-slash" label={`PANTAU v${CONFIG.version}`} />
          <MenuItem icon="logo-github" label="GitHub" onPress={() => Linking.openURL("https://github.com/jhonsonsmith694-pixel/pantau-app")} />
        </Card>

        {/* Logout */}
        <View style={{ padding: SPACING.lg }}>
          <Button title="Logout" onPress={() => setShowLogout(true)} variant="danger" colors={colors} icon="log-out" />
        </View>

        {/* Footer */}
        <Text style={{ textAlign: "center", color: colors.textTertiary, fontSize: 12, paddingBottom: SPACING.xl, fontFamily: "Outfit_400Regular" }}>Dibuat oleh Bara · AI Personal Monitor</Text>
      </ScrollView>

      <ConfirmDialog visible={showLogout} title="Logout" message="Semua data lokal akan dihapus. Lanjutkan?" confirmLabel="Logout" onConfirm={() => { setShowLogout(false); logout(); }} onCancel={() => setShowLogout(false)} destructive colors={colors} />

      <Toast visible={showToast} message={toastMsg} type={syncing === "error" ? "error" : "success"} icon={syncing === "error" ? "alert-circle" : "checkmark-circle"} colors={colors} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  profileCard: { alignItems: "center", paddingVertical: SPACING.xxl, borderBottomWidth: 1 },
  avatar: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", marginBottom: SPACING.md },
  profileName: { fontSize: 20, fontFamily: "Outfit_700Bold" },
  profileSub: { fontSize: 13, marginTop: 2, fontFamily: "Outfit_400Regular" },
  section: { marginBottom: SPACING.sm },
  sectionTitle: { fontSize: 14, fontFamily: "Outfit_600SemiBold" },
  menuItem: { flexDirection: "row", alignItems: "center", paddingVertical: SPACING.md, borderBottomWidth: 0.5 },
  menuIcon: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center", marginRight: SPACING.md },
  menuLabel: { fontSize: 14, flex: 1, fontFamily: "Outfit_500Medium" },
  menuValue: { fontSize: 12, marginRight: 8, fontFamily: "Outfit_400Regular" },
  themeOpt: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: BORDER_RADIUS.md, borderWidth: 1 },
});

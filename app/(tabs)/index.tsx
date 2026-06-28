import { useCallback, useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Keyboard } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useApp } from "../../src/hooks/useApp";
import { useTheme, useRefresh } from "../../src/hooks";
import { Card, EmptyState, Skeleton } from "../../src/components";
import { COLORS, SPACING, BORDER_RADIUS } from "../../src/config";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

const CATEGORY_ICONS: Record<string, IconName> = {
  harga: "cash", berita: "newspaper", stok: "cube", jadwal: "calendar",
};

export default function BerandaScreen() {
  const { user, monitors, notes, syncNow, syncing } = useApp();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { refreshing, onRefresh } = useRefresh(syncNow);

  // Stats
  const stats = useMemo(() => ({
    total: monitors.length,
    active: monitors.filter(m => m.active).length,
    notes: notes.length,
    pinned: notes.filter(n => n.pinned).length,
  }), [monitors, notes]);

  const recentMonitors = useMemo(() => monitors.slice(0, 5), [monitors]);

  const categoryIcon = (cat: string) => CATEGORY_ICONS[cat] || "ellipse";

  if (monitors.length === 0 && notes.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top"]}>
        <LinearGradient colors={isDark ? ["#1E3A5F", "#1E293B"] : ["#0066FF", "#0044CC"]} style={styles.gradientHeader}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.greeting}>Halo, {user?.name || "Pengguna"} 👋</Text>
              <Text style={styles.subtitle}>Belum ada pantauan</Text>
            </View>
            <TouchableOpacity onPress={() => router.push("/pantau")} style={[styles.addBtn, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
              <Ionicons name="add" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>
        </LinearGradient>
        <ScrollView
          contentContainerStyle={{ flex: 1, justifyContent: "center" }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={Keyboard.dismiss}
        >
          <EmptyState
            icon="eye"
            title="Mulai Pantau"
            description="Tambahkan monitor harga, berita, stok, atau jadwal favorit kamu"
            action={{ label: "Tambahkan", onPress: () => router.push("/pantau") }}
            colors={colors}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top"]}>
      <LinearGradient colors={isDark ? ["#1E3A5F", "#1E293B"] : ["#0066FF", "#0044CC"]} style={styles.gradientHeader}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>Halo, {user?.name || "Pengguna"} 👋</Text>
            <Text style={styles.subtitle}>Ada {stats.active} pantauan aktif</Text>
          </View>
          <TouchableOpacity onPress={() => router.push("/pantau")} style={[styles.addBtn, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
            <Ionicons name="add" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={Keyboard.dismiss}
      >
        {/* Stats Cards */}
        <View style={styles.statsRow}>
          {[
            { label: "Pantauan", value: stats.total, icon: "eye" as IconName, color: colors.primary },
            { label: "Aktif", value: stats.active, icon: "checkmark-circle" as IconName, color: colors.success },
            { label: "Catatan", value: stats.notes, icon: "document-text" as IconName, color: colors.warning },
            { label: "Disematkan", value: stats.pinned, icon: "pin" as IconName, color: colors.error },
          ].map((s, i) => (
            <View key={i} style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.statIcon, { backgroundColor: s.color + "20" }]}>
                <Ionicons name={s.icon} size={18} color={s.color} />
              </View>
              <Text style={[styles.statValue, { color: colors.text }]}>{s.value}</Text>
              <Text style={[styles.statLabel, { color: colors.textTertiary }]}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Recent Monitors */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Pantauan Terbaru</Text>
          <TouchableOpacity onPress={() => router.push("/pantau")}>
            <Text style={[styles.sectionLink, { color: colors.primary }]}>Lihat Semua</Text>
          </TouchableOpacity>
        </View>

        {recentMonitors.map(m => (
          <TouchableOpacity key={m.id} onPress={() => router.push("/pantau")} activeOpacity={0.7}>
            <Card colors={colors} style={styles.monitorCard}>
              <View style={[styles.mIcon, { backgroundColor: `${COLORS.light.primary}15` }]}>
                <Ionicons name={categoryIcon(m.category)} size={20} color={COLORS.light.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: SPACING.md }}>
                <Text style={[styles.mTitle, { color: colors.text }]}>{m.title}</Text>
                <Text style={[styles.mMeta, { color: colors.textTertiary }]}>{m.category} • {m.createdAt}</Text>
              </View>
              <View style={[styles.statusDot, { backgroundColor: m.active ? colors.success : colors.textTertiary }]} />
            </Card>
          </TouchableOpacity>
        ))}

        {/* Recent Notes */}
        {notes.filter(n => n.pinned).length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Catatan Disematkan</Text>
              <TouchableOpacity onPress={() => router.push("/catatan")}>
                <Text style={[styles.sectionLink, { color: colors.primary }]}>Lihat Semua</Text>
              </TouchableOpacity>
            </View>
            {notes.filter(n => n.pinned).slice(0, 3).map(n => (
              <TouchableOpacity key={n.id} onPress={() => router.push("/catatan")} activeOpacity={0.7}>
                <Card colors={colors} style={[styles.noteCard, { borderLeftColor: n.color || colors.border, borderLeftWidth: 3 }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.mTitle, { color: colors.text }]}>{n.title}</Text>
                    <Text style={[styles.mMeta, { color: colors.textTertiary }]} numberOfLines={2}>{n.content}</Text>
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradientHeader: { paddingTop: 20, paddingBottom: 30, paddingHorizontal: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerContent: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  greeting: { fontSize: 22, fontWeight: "700", color: "#FFFFFF" },
  subtitle: { fontSize: 14, color: "rgba(255,255,255,0.8)", marginTop: 4 },
  addBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  statsRow: { flexDirection: "row", gap: 8, marginTop: -16, marginBottom: SPACING.xl },
  statCard: { flex: 1, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, alignItems: "center", borderWidth: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  statIcon: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  statValue: { fontSize: 18, fontWeight: "800" },
  statLabel: { fontSize: 11, marginTop: 2 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: SPACING.md, marginTop: SPACING.sm },
  sectionTitle: { fontSize: 16, fontWeight: "700" },
  sectionLink: { fontSize: 13, fontWeight: "600" },
  monitorCard: { flexDirection: "row", alignItems: "center", paddingVertical: SPACING.md },
  mIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  mTitle: { fontSize: 14, fontWeight: "600" },
  mMeta: { fontSize: 12, marginTop: 2 },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginLeft: 8 },
  noteCard: { paddingVertical: SPACING.md },
});

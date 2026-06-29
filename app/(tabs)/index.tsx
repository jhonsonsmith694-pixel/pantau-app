import { useCallback, useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Keyboard } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useApp } from "../../src/hooks/useApp";
import { useTheme, useRefresh } from "../../src/hooks";
import { Card, EmptyState, Skeleton } from "../../src/components";
import { FadeInView, PressableScale } from "../../src/components/motion";
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
        <LinearGradient colors={(colors.gradient as [string, string])} style={styles.gradientHeader}>
          <View style={styles.headerContent}>
            <View style={{ flex: 1, paddingRight: SPACING.md }}>
              <Text style={styles.greeting}>Halo, {user?.name || "Pengguna"}</Text>
              <Text style={styles.subtitle}>Pantau harga & info penting, lalu tanya AI soal datanya</Text>
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
            title="Mulai pantau"
            description="Tambahkan harga crypto, emas, atau kurs untuk dipantau real-time"
            action={{ label: "Tambahkan", onPress: () => router.push("/pantau") }}
            colors={colors}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top"]}>
      <LinearGradient colors={(colors.gradient as [string, string])} style={styles.gradientHeader}>
        <View style={styles.headerContent}>
          <View style={{ flex: 1, paddingRight: SPACING.md }}>
            <Text style={styles.greeting}>Halo, {user?.name || "Pengguna"}</Text>
            <Text style={styles.subtitle}>{stats.active} pantauan aktif · tanya AI soal datanya</Text>
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

        {/* AI entry point */}
        <FadeInView index={1}>
          <PressableScale onPress={() => router.push("/ai")} accessibilityLabel="Buka asisten AI">
            <View style={[styles.aiBanner, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.aiBannerIcon, { backgroundColor: colors.accentSoft }]}>
                <Ionicons name="sparkles" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.aiBannerTitle, { color: colors.text }]}>Asisten AI</Text>
                <Text style={[styles.aiBannerDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                  Tanya apa saja soal pantauan kamu — dijawab pakai data harga real.
                </Text>
              </View>
              <Ionicons name="arrow-forward" size={18} color={colors.textTertiary} />
            </View>
          </PressableScale>
        </FadeInView>

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
              <View style={[styles.mIcon, { backgroundColor: colors.accentSoft }]}>
                <Ionicons name={categoryIcon(m.category)} size={20} color={colors.primary} />
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
  greeting: { fontSize: 22, fontFamily: "Outfit_700Bold", color: "#FFFFFF" },
  subtitle: { fontSize: 13, color: "rgba(255,255,255,0.85)", marginTop: 4, fontFamily: "Outfit_400Regular" },
  addBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  statsRow: { flexDirection: "row", gap: 8, marginTop: -16, marginBottom: SPACING.lg },
  statCard: { flex: 1, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, alignItems: "center", borderWidth: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  statIcon: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  statValue: { fontSize: 19, fontFamily: "JetBrainsMono_500Medium" },
  statLabel: { fontSize: 11, marginTop: 2, fontFamily: "Outfit_400Regular" },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: SPACING.md, marginTop: SPACING.sm },
  aiBanner: { flexDirection: "row", alignItems: "center", gap: SPACING.md, padding: SPACING.lg, borderRadius: BORDER_RADIUS.xl, borderWidth: 1, marginBottom: SPACING.xl },
  aiBannerIcon: { width: 44, height: 44, borderRadius: BORDER_RADIUS.lg, alignItems: "center", justifyContent: "center" },
  aiBannerTitle: { fontSize: 15, fontFamily: "Outfit_600SemiBold" },
  aiBannerDesc: { fontSize: 13, lineHeight: 18, marginTop: 2, fontFamily: "Outfit_400Regular" },
  sectionTitle: { fontSize: 16, fontFamily: "Outfit_600SemiBold" },
  sectionLink: { fontSize: 13, fontFamily: "Outfit_500Medium" },
  monitorCard: { flexDirection: "row", alignItems: "center", paddingVertical: SPACING.md },
  mIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  mTitle: { fontSize: 14, fontFamily: "Outfit_600SemiBold" },
  mMeta: { fontSize: 12, marginTop: 2, fontFamily: "Outfit_400Regular" },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginLeft: 8 },
  noteCard: { paddingVertical: SPACING.md },
});

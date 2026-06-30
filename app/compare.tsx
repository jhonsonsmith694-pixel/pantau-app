import { useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useApp } from "../src/hooks/useApp";
import { useTheme } from "../src/hooks";
import { SPACING, BORDER_RADIUS, FONT_FAMILY, TABULAR, ELEVATION, GRADIENTS } from "../src/config";
import { FadeInView, PressableScale } from "../src/components/motion";
import { getLiveValue, LiveQuote } from "../src/services/liveData";

export default function CompareScreen() {
  const { monitors } = useApp();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const [selected, setSelected] = useState<number[]>([]);
  const [quotes, setQuotes] = useState<Record<number, LiveQuote | null>>({});
  const [loading, setLoading] = useState(false);

  const toggle = (id: number) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 4 ? [...prev, id] : prev);
  };

  useEffect(() => {
    const toLoad = selected.filter(id => quotes[id] === undefined);
    if (!toLoad.length) return;
    setLoading(true);
    Promise.all(toLoad.map(async id => {
      const m = monitors.find(x => x.id === id);
      if (!m) return;
      try {
        const q = await getLiveValue(m.title, m.category);
        setQuotes(prev => ({ ...prev, [id]: q }));
      } catch {
        setQuotes(prev => ({ ...prev, [id]: null }));
      }
    })).finally(() => setLoading(false));
  }, [selected]);

  const selectedMonitors = useMemo(() => monitors.filter(m => selected.includes(m.id)), [monitors, selected]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top"]}>
      <LinearGradient colors={(isDark ? GRADIENTS.heroDark : GRADIENTS.hero) as readonly [string, string, ...string[]]} style={styles.header}>
        <View style={styles.headerRow}>
          <PressableScale onPress={() => router.back()} accessibilityLabel="Kembali">
            <View style={styles.iconBtn}><Ionicons name="arrow-back" size={22} color="#FFF" /></View>
          </PressableScale>
          <View style={{ flex: 1, marginLeft: SPACING.md }}>
            <Text style={styles.headerTitle}>Bandingkan</Text>
            <Text style={styles.headerSub}>Pilih hingga 4 pantauan</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 40 }}>
        {/* Selector chips */}
        <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>PILIH PANTAUAN</Text>
        <View style={styles.chipsWrap}>
          {monitors.map(m => (
            <TouchableOpacity key={m.id} onPress={() => toggle(m.id)}>
              <View style={[styles.chip, {
                backgroundColor: selected.includes(m.id) ? colors.primary : colors.surface,
                borderColor: selected.includes(m.id) ? colors.primary : colors.border,
              }]}>
                <Text style={{ color: selected.includes(m.id) ? "#FFF" : colors.text, fontSize: 13, fontFamily: FONT_FAMILY.medium }}>{m.title}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {selectedMonitors.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="git-compare-outline" size={40} color={colors.textTertiary} />
            <Text style={[styles.emptyText, { color: colors.textTertiary }]}>Pilih minimal 2 pantauan untuk dibandingkan</Text>
          </View>
        ) : (
          <View style={{ marginTop: SPACING.lg }}>
            {loading && <ActivityIndicator color={colors.primary} style={{ marginBottom: SPACING.md }} />}
            {selectedMonitors.map((m, i) => {
              const q = quotes[m.id];
              return (
                <FadeInView key={m.id} index={i}>
                  <View style={[styles.compareCard, { backgroundColor: colors.surface, borderColor: colors.border }, ELEVATION.sm]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>{m.title}</Text>
                      <Text style={[styles.cardCat, { color: colors.textTertiary }]}>{m.category}</Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={[styles.cardValue, { color: colors.text }, TABULAR]}>
                        {q === undefined ? "..." : q && q.value > 0 ? q.display : "—"}
                      </Text>
                      {q && q.change24h !== null && (
                        <Text style={[{ fontSize: 12, fontFamily: FONT_FAMILY.semibold, color: q.change24h >= 0 ? colors.priceUp : colors.priceDown }, TABULAR]}>
                          {q.change24h >= 0 ? "+" : ""}{q.change24h.toFixed(2)}%
                        </Text>
                      )}
                    </View>
                  </View>
                </FadeInView>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 16, paddingBottom: 24, paddingHorizontal: SPACING.lg, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  headerRow: { flexDirection: "row", alignItems: "center" },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 22, fontFamily: FONT_FAMILY.bold, color: "#FFF", letterSpacing: -0.4 },
  headerSub: { fontSize: 13, color: "rgba(255,255,255,0.8)", fontFamily: FONT_FAMILY.regular, marginTop: 2 },
  sectionLabel: { fontSize: 11, fontFamily: FONT_FAMILY.semibold, letterSpacing: 1.2, marginBottom: SPACING.sm },
  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: BORDER_RADIUS.full, borderWidth: 1 },
  empty: { alignItems: "center", justifyContent: "center", paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 14, textAlign: "center", fontFamily: FONT_FAMILY.regular, maxWidth: 220 },
  compareCard: { flexDirection: "row", alignItems: "center", padding: SPACING.lg, borderRadius: BORDER_RADIUS.lg, borderWidth: 1, marginBottom: SPACING.sm },
  cardTitle: { fontSize: 15, fontFamily: FONT_FAMILY.semibold },
  cardCat: { fontSize: 12, fontFamily: FONT_FAMILY.regular, marginTop: 2, textTransform: "capitalize" },
  cardValue: { fontSize: 17, fontFamily: FONT_FAMILY.bold, letterSpacing: -0.3 },
});

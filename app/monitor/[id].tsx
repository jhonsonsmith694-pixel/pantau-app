import { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useApp } from "../../src/hooks/useApp";
import { useTheme } from "../../src/hooks";
import { SPACING, BORDER_RADIUS, FONTS, TABULAR, MOTION, FONT_FAMILY } from "../../src/config";
import { FadeInView, PressableScale, AnimatedNumber } from "../../src/components/motion";
import { getLiveValue, LiveQuote } from "../../src/services/liveData";
import { api } from "../../src/api/client";
import { security } from "../../src/services/security";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

const CAT_ICON: Record<string, IconName> = {
  harga: "cash",
  berita: "newspaper",
  stok: "cube",
  jadwal: "calendar",
};

export default function MonitorDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { monitors, user } = useApp();
  const { colors } = useTheme();
  const router = useRouter();
  const [quote, setQuote] = useState<LiveQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSources, setAiSources] = useState<{ title: string; url: string }[]>([]);

  const monitor = monitors.find(m => String(m.id) === id);

  useEffect(() => {
    if (!monitor) return;
    setLoading(true);
    getLiveValue(monitor.title, monitor.category)
      .then(q => setQuote(q))
      .catch(() => setQuote(null))
      .finally(() => setLoading(false));
  }, [monitor?.title, monitor?.category]);

  const askAI = useCallback(async () => {
    if (!monitor || aiLoading) return;
    setAiLoading(true);
    try {
      const uid = await security.getDeviceId();
      if (!api.getToken()) {
        await api.register(uid, user?.name || "Pengguna", "person").catch(() => {});
      }
      const items = quote
        ? [{ title: monitor.title, value: quote.display, change: quote.change24h }]
        : [{ title: monitor.title }];
      const res = await api.aiAsk({
        question: `Berikan info lengkap terkini tentang "${monitor.title}". Sertakan harga/data terbaru, tren, dan analisis singkat.`,
        items,
        web: true,
      });
      if (res.success) {
        setAiAnswer(res.data.answer);
        setAiSources(res.data.sources || []);
      } else {
        setAiAnswer("Gagal mendapatkan analisis. Coba lagi.");
      }
    } catch {
      setAiAnswer("Koneksi bermasalah. Coba lagi.");
    } finally {
      setAiLoading(false);
    }
  }, [monitor, quote, user, aiLoading]);

  if (!monitor) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text, padding: SPACING.xl }}>Monitor tidak ditemukan</Text>
      </SafeAreaView>
    );
  }

  const icon = CAT_ICON[monitor.category] || "pricetag";

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top"]}>
      {/* Header */}
      <LinearGradient colors={colors.gradient as [string, string]} style={styles.header}>
        <View style={styles.headerRow}>
          <PressableScale onPress={() => router.back()} accessibilityLabel="Kembali">
            <View style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color="#FFF" />
            </View>
          </PressableScale>
          <View style={{ flex: 1, marginLeft: SPACING.md }}>
            <Text style={styles.headerTitle} numberOfLines={1}>{monitor.title}</Text>
            <Text style={styles.headerSub}>{monitor.category} • {monitor.active ? "Aktif" : "Nonaktif"}</Text>
          </View>
          <View style={[styles.catIconBig, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
            <Ionicons name={icon} size={28} color="#FFF" />
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 40 }}>
        {/* Price / Data Card */}
        <FadeInView index={0}>
          <View style={[styles.dataCard, { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: colors.cardShadow }]}>
            {loading ? (
              <ActivityIndicator size="large" color={colors.primary} style={{ padding: SPACING.xl }} />
            ) : quote ? (
              <>
                {quote.value > 0 && (
                  <View style={{ alignItems: "center", paddingVertical: SPACING.lg }}>
                    <Text style={[styles.priceLabel, { color: colors.textTertiary }]}>HARGA TERKINI</Text>
                    <AnimatedNumber
                      value={quote.value}
                      duration={MOTION.durationSlow}
                      format={(n) => {
                        const s = Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
                        return 'Rp ' + s;
                      }}
                      style={[styles.priceValue, { color: colors.text }]}
                    />
                    {quote.change24h !== null && (
                      <View style={[styles.changeBadge, { backgroundColor: (quote.change24h >= 0 ? colors.priceUp : colors.priceDown) + "18" }]}>
                        <Ionicons name={quote.change24h >= 0 ? "trending-up" : "trending-down"} size={16} color={quote.change24h >= 0 ? colors.priceUp : colors.priceDown} />
                        <Text style={[styles.changeText, { color: quote.change24h >= 0 ? colors.priceUp : colors.priceDown }]}>
                          {quote.change24h >= 0 ? "+" : ""}{quote.change24h.toFixed(2)}% (24j)
                        </Text>
                      </View>
                    )}
                    <Text style={[styles.sourceText, { color: colors.textTertiary }]}>Sumber: {quote.source}</Text>
                  </View>
                )}
                {quote.snippet && (
                  <View style={[styles.snippetBox, { backgroundColor: colors.surfaceSecondary }]}>
                    <Ionicons name="document-text-outline" size={16} color={colors.primary} />
                    <Text style={[styles.snippetContent, { color: colors.text }]}>{quote.snippet}</Text>
                  </View>
                )}
              </>
            ) : (
              <View style={{ padding: SPACING.xl, alignItems: "center" }}>
                <Ionicons name="cloud-offline-outline" size={32} color={colors.textTertiary} />
                <Text style={[styles.noDataText, { color: colors.textTertiary }]}>Belum ada data real-time</Text>
                <Text style={[styles.noDataSub, { color: colors.textTertiary }]}>Tekan "Tanya AI" untuk cari info terkini</Text>
              </View>
            )}
          </View>
        </FadeInView>

        {/* Chart Placeholder */}
        <FadeInView index={1}>
          <View style={[styles.chartPlaceholder, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="bar-chart-outline" size={36} color={colors.textTertiary} />
            <Text style={[styles.chartText, { color: colors.textTertiary }]}>Grafik harga segera hadir</Text>
          </View>
        </FadeInView>

        {/* Ask AI Button */}
        <FadeInView index={2}>
          <PressableScale onPress={askAI} disabled={aiLoading} accessibilityLabel="Tanya AI tentang pantauan ini">
            <LinearGradient colors={colors.gradient as [string, string]} style={styles.aiButton}>
              <Ionicons name="sparkles" size={20} color="#FFF" />
              <Text style={styles.aiButtonText}>
                {aiLoading ? "Sedang menganalisis..." : "Tanya AI tentang ini"}
              </Text>
            </LinearGradient>
          </PressableScale>
        </FadeInView>

        {/* AI Answer */}
        {aiAnswer && (
          <FadeInView index={3}>
            <View style={[styles.aiAnswerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.aiAnswerHeader}>
                <View style={[styles.aiAvatar, { backgroundColor: colors.accentSoft }]}>
                  <Ionicons name="sparkles" size={14} color={colors.primary} />
                </View>
                <Text style={[styles.aiAnswerLabel, { color: colors.primary }]}>PANTAU AI</Text>
              </View>
              <Text style={[styles.aiAnswerText, { color: colors.text }]}>{aiAnswer}</Text>
              {aiSources.length > 0 && (
                <View style={styles.aiSources}>
                  <Text style={[styles.aiSourcesLabel, { color: colors.textTertiary }]}>SUMBER</Text>
                  {aiSources.slice(0, 3).map((s, i) => (
                    <PressableScale key={i} onPress={() => s.url && Linking.openURL(s.url)}>
                      <View style={styles.aiSourceRow}>
                        <Ionicons name="link" size={12} color={colors.primary} />
                        <Text style={[styles.aiSourceText, { color: colors.primary }]} numberOfLines={1}>{s.title}</Text>
                      </View>
                    </PressableScale>
                  ))}
                </View>
              )}
            </View>
          </FadeInView>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 16, paddingBottom: 24, paddingHorizontal: SPACING.lg, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerRow: { flexDirection: "row", alignItems: "center" },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 20, fontFamily: FONT_FAMILY.bold, color: "#FFF", letterSpacing: -0.4 },
  headerSub: { fontSize: 13, color: "rgba(255,255,255,0.8)", fontFamily: FONT_FAMILY.regular, marginTop: 2 },
  catIconBig: { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  dataCard: { borderRadius: BORDER_RADIUS.xl, borderWidth: 1, overflow: "hidden", marginBottom: SPACING.lg, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 1, shadowRadius: 16, elevation: 6 },
  priceLabel: { fontSize: 11, fontFamily: FONT_FAMILY.semibold, letterSpacing: 1.2, marginBottom: 8 },
  priceValue: { fontSize: 32, fontFamily: FONT_FAMILY.bold, letterSpacing: -1 },
  changeBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 6, borderRadius: BORDER_RADIUS.full, marginTop: 10, gap: 6 },
  changeText: { fontSize: 14, fontFamily: FONT_FAMILY.semibold },
  sourceText: { fontSize: 11, fontFamily: FONT_FAMILY.regular, marginTop: 8 },
  snippetBox: { flexDirection: "row", alignItems: "flex-start", gap: 10, margin: SPACING.lg, marginTop: 0, padding: SPACING.md, borderRadius: BORDER_RADIUS.lg },
  snippetContent: { flex: 1, fontSize: 13, lineHeight: 19, fontFamily: FONT_FAMILY.regular },
  noDataText: { fontSize: 15, fontFamily: FONT_FAMILY.semibold, marginTop: 12 },
  noDataSub: { fontSize: 13, fontFamily: FONT_FAMILY.regular, marginTop: 4 },
  chartPlaceholder: { borderRadius: BORDER_RADIUS.xl, borderWidth: 1, height: 140, alignItems: "center", justifyContent: "center", marginBottom: SPACING.lg, gap: 8 },
  chartText: { fontSize: 13, fontFamily: FONT_FAMILY.regular },
  aiButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 16, borderRadius: BORDER_RADIUS.xl, marginBottom: SPACING.lg },
  aiButtonText: { fontSize: 16, fontFamily: FONT_FAMILY.semibold, color: "#FFF" },
  aiAnswerCard: { borderRadius: BORDER_RADIUS.xl, borderWidth: 1, padding: SPACING.lg, marginBottom: SPACING.lg },
  aiAnswerHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: SPACING.md },
  aiAvatar: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  aiAnswerLabel: { fontSize: 11, fontFamily: FONT_FAMILY.semibold, letterSpacing: 1 },
  aiAnswerText: { fontSize: 14, lineHeight: 22, fontFamily: FONT_FAMILY.regular },
  aiSources: { marginTop: SPACING.md, paddingTop: SPACING.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "rgba(127,127,127,0.2)" },
  aiSourcesLabel: { fontSize: 9, fontFamily: FONT_FAMILY.semibold, letterSpacing: 1, marginBottom: 4 },
  aiSourceRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 3 },
  aiSourceText: { fontSize: 12, flex: 1, fontFamily: FONT_FAMILY.medium },
});

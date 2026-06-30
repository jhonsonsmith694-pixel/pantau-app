import { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Linking, TextInput, Alert, Switch, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Speech from "expo-speech";
import { useApp } from "../../src/hooks/useApp";
import { useTheme } from "../../src/hooks";
import { SPACING, BORDER_RADIUS, FONTS, TABULAR, MOTION, FONT_FAMILY, ELEVATION, GRADIENTS } from "../../src/config";
import { FadeInView, PressableScale, AnimatedNumber } from "../../src/components/motion";
import { PriceChart } from "../../src/components/PriceChart";
import { getLiveValue, LiveQuote } from "../../src/services/liveData";
import { getPriceHistory, recordPrice } from "../../src/services/priceHistory";
import { shareViewAsImage } from "../../src/services/share";
import { PricePoint, PriceAlert } from "../../src/types";
import { api } from "../../src/api/client";
import { security } from "../../src/services/security";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

const CAT_ICON: Record<string, IconName> = {
  harga: "cash", berita: "newspaper", stok: "cube", jadwal: "calendar",
};

const fmtIDR = (n: number) => 'Rp ' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const parseNum = (s: string) => Number(s.replace(/[^0-9]/g, '')) || 0;

export default function MonitorDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { monitors, user, toggleFavorite, setMonitorAlert } = useApp();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const cardRef = useRef<View>(null);

  const [quote, setQuote] = useState<LiveQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<PricePoint[]>([]);
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSources, setAiSources] = useState<{ title: string; url: string }[]>([]);
  const [speaking, setSpeaking] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertType, setAlertType] = useState<'above' | 'below'>('above');
  const [alertValue, setAlertValue] = useState("");

  const monitor = monitors.find(m => String(m.id) === id);
  const screenW = Dimensions.get('window').width;

  useEffect(() => {
    if (!monitor) return;
    setLoading(true);
    getPriceHistory(monitor.title).then(setHistory);
    getLiveValue(monitor.title, monitor.category)
      .then(q => {
        setQuote(q);
        if (q && q.value > 0) {
          recordPrice(monitor.title, q.value);
          getPriceHistory(monitor.title).then(setHistory);
        }
      })
      .catch(() => setQuote(null))
      .finally(() => setLoading(false));
    // init alert form from existing
    if (monitor.alert) {
      setAlertType(monitor.alert.type);
      setAlertValue(String(monitor.alert.threshold));
    }
  }, [monitor?.title, monitor?.category]);

  const askAI = useCallback(async () => {
    if (!monitor || aiLoading) return;
    setAiLoading(true);
    try {
      const uid = await security.getDeviceId();
      if (!api.getToken()) await api.register(uid, user?.name || "Pengguna", "person").catch(() => {});
      const items = quote ? [{ title: monitor.title, value: quote.display, change: quote.change24h }] : [{ title: monitor.title }];
      const res = await api.aiAsk({
        question: `Berikan info lengkap terkini tentang "${monitor.title}". Sertakan harga/data terbaru, tren, dan analisis singkat. Sebutkan juga sentimen pasar/berita kalau ada.`,
        items, web: true,
      });
      if (res.success) {
        setAiAnswer(res.data.answer);
        setAiSources(res.data.sources || []);
      } else setAiAnswer("Gagal mendapatkan analisis. Coba lagi.");
    } catch {
      setAiAnswer("Koneksi bermasalah. Coba lagi.");
    } finally {
      setAiLoading(false);
    }
  }, [monitor, quote, user, aiLoading]);

  const toggleSpeak = useCallback(() => {
    if (!aiAnswer) return;
    if (speaking) {
      Speech.stop();
      setSpeaking(false);
    } else {
      const clean = aiAnswer.replace(/[💡🔔📊]/g, '').replace(/\[\d+\]/g, '');
      Speech.speak(clean, {
        language: 'id-ID',
        onDone: () => setSpeaking(false),
        onStopped: () => setSpeaking(false),
        onError: () => setSpeaking(false),
      });
      setSpeaking(true);
    }
  }, [aiAnswer, speaking]);

  const saveAlert = useCallback(() => {
    if (!monitor) return;
    const threshold = parseNum(alertValue);
    if (threshold <= 0) { Alert.alert("Target tidak valid", "Masukkan angka target harga."); return; }
    const alert: PriceAlert = { enabled: true, type: alertType, threshold };
    setMonitorAlert(monitor.id, alert);
    setShowAlert(false);
    Alert.alert("Notifikasi aktif", `Kamu akan dikabari saat ${monitor.title} ${alertType === 'above' ? 'tembus di atas' : 'turun di bawah'} ${fmtIDR(threshold)}.`);
  }, [monitor, alertType, alertValue, setMonitorAlert]);

  const removeAlert = useCallback(() => {
    if (!monitor) return;
    setMonitorAlert(monitor.id, undefined);
    setShowAlert(false);
  }, [monitor, setMonitorAlert]);

  const onShare = useCallback(() => { shareViewAsImage(cardRef, `Pantau ${monitor?.title}`); }, [monitor]);

  if (!monitor) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text, padding: SPACING.xl }}>Monitor tidak ditemukan</Text>
      </SafeAreaView>
    );
  }

  const icon = CAT_ICON[monitor.category] || "pricetag";
  const hasAlert = monitor.alert?.enabled;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top"]}>
      <LinearGradient colors={(isDark ? GRADIENTS.heroDark : GRADIENTS.hero) as readonly [string, string, ...string[]]} style={styles.header}>
        <View style={styles.headerRow}>
          <PressableScale onPress={() => router.back()} accessibilityLabel="Kembali">
            <View style={styles.iconBtn}><Ionicons name="arrow-back" size={22} color="#FFF" /></View>
          </PressableScale>
          <View style={{ flex: 1, marginLeft: SPACING.md }}>
            <Text style={styles.headerTitle} numberOfLines={1}>{monitor.title}</Text>
            <Text style={styles.headerSub}>{monitor.category}</Text>
          </View>
          <PressableScale onPress={() => toggleFavorite(monitor.id)} accessibilityLabel="Favorit">
            <View style={styles.iconBtn}><Ionicons name={monitor.favorite ? "star" : "star-outline"} size={20} color={monitor.favorite ? "#FBBF24" : "#FFF"} /></View>
          </PressableScale>
          <PressableScale onPress={onShare} accessibilityLabel="Bagikan">
            <View style={[styles.iconBtn, { marginLeft: 8 }]}><Ionicons name="share-social" size={18} color="#FFF" /></View>
          </PressableScale>
        </View>
      </LinearGradient>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 48 }}>
        {/* Data Card (shareable) */}
        <FadeInView index={0}>
          <View ref={cardRef} collapsable={false} style={[styles.dataCard, { backgroundColor: colors.surface, borderColor: colors.border }, ELEVATION.lg]}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.catChip, { backgroundColor: colors.accentSoft }]}>
                <Ionicons name={icon} size={16} color={colors.primary} />
                <Text style={[styles.catChipText, { color: colors.primary }]}>{monitor.category}</Text>
              </View>
              <Text style={[styles.brandTag, { color: colors.textTertiary }]}>PANTAU</Text>
            </View>
            {loading ? (
              <ActivityIndicator size="large" color={colors.primary} style={{ padding: SPACING.xl }} />
            ) : quote && quote.value > 0 ? (
              <View style={{ paddingVertical: SPACING.md }}>
                <Text style={[styles.priceLabel, { color: colors.textTertiary }]}>HARGA TERKINI</Text>
                <AnimatedNumber value={quote.value} duration={MOTION.durationSlow} format={fmtIDR} style={[styles.priceValue, { color: colors.text }]} />
                {quote.change24h !== null && (
                  <View style={[styles.changeBadge, { backgroundColor: (quote.change24h >= 0 ? colors.priceUp : colors.priceDown) + "18" }]}>
                    <Ionicons name={quote.change24h >= 0 ? "trending-up" : "trending-down"} size={15} color={quote.change24h >= 0 ? colors.priceUp : colors.priceDown} />
                    <Text style={[styles.changeText, { color: quote.change24h >= 0 ? colors.priceUp : colors.priceDown }]}>
                      {quote.change24h >= 0 ? "+" : ""}{quote.change24h.toFixed(2)}% · 24 jam
                    </Text>
                  </View>
                )}
                <Text style={[styles.sourceText, { color: colors.textTertiary }]}>Sumber: {quote.source}</Text>
              </View>
            ) : quote?.snippet ? (
              <View style={[styles.snippetBox, { backgroundColor: colors.surfaceSecondary }]}>
                <Text style={[styles.snippetContent, { color: colors.text }]}>{quote.snippet}</Text>
                <Text style={[styles.sourceText, { color: colors.textTertiary, marginTop: 6 }]}>via {quote.source}</Text>
              </View>
            ) : (
              <View style={{ padding: SPACING.lg, alignItems: "center" }}>
                <Ionicons name="cloud-offline-outline" size={28} color={colors.textTertiary} />
                <Text style={[styles.noDataText, { color: colors.textTertiary }]}>Belum ada data. Tekan "Tanya AI".</Text>
              </View>
            )}
            {/* Chart */}
            {quote && quote.value > 0 && (
              <View style={{ marginTop: SPACING.md, alignItems: "center" }}>
                <PriceChart points={history} colors={colors} width={screenW - SPACING.lg * 2 - SPACING.lg * 2} height={150} />
              </View>
            )}
          </View>
        </FadeInView>

        {/* Price Alert */}
        <FadeInView index={1}>
          <PressableScale onPress={() => setShowAlert(!showAlert)} accessibilityLabel="Atur notifikasi harga">
            <View style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }, ELEVATION.sm]}>
              <View style={[styles.rowIcon, { backgroundColor: hasAlert ? colors.success + "20" : colors.accentSoft }]}>
                <Ionicons name={hasAlert ? "notifications" : "notifications-outline"} size={18} color={hasAlert ? colors.success : colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: colors.text }]}>Notifikasi Harga</Text>
                <Text style={[styles.rowSub, { color: colors.textTertiary }]}>
                  {hasAlert ? `Aktif: ${monitor.alert!.type === 'above' ? 'di atas' : 'di bawah'} ${fmtIDR(monitor.alert!.threshold)}` : "Kabari aku saat harga tembus target"}
                </Text>
              </View>
              <Ionicons name={showAlert ? "chevron-up" : "chevron-down"} size={18} color={colors.textTertiary} />
            </View>
          </PressableScale>

          {showAlert && (
            <View style={[styles.alertForm, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
                {(['above', 'below'] as const).map(t => (
                  <PressableScale key={t} onPress={() => setAlertType(t)} style={{ flex: 1 }}>
                    <View style={[styles.typeBtn, { backgroundColor: alertType === t ? colors.primary : colors.surfaceSecondary, borderColor: colors.border }]}>
                      <Ionicons name={t === 'above' ? "trending-up" : "trending-down"} size={16} color={alertType === t ? "#FFF" : colors.textSecondary} />
                      <Text style={{ color: alertType === t ? "#FFF" : colors.textSecondary, fontFamily: FONT_FAMILY.medium, fontSize: 13 }}>
                        {t === 'above' ? 'Di atas' : 'Di bawah'}
                      </Text>
                    </View>
                  </PressableScale>
                ))}
              </View>
              <TextInput
                style={[styles.alertInput, { backgroundColor: colors.surfaceSecondary, color: colors.text, borderColor: colors.border }]}
                placeholder="Target harga (Rp)"
                placeholderTextColor={colors.textTertiary}
                keyboardType="numeric"
                value={alertValue}
                onChangeText={setAlertValue}
              />
              <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
                {hasAlert && (
                  <PressableScale onPress={removeAlert} style={{ flex: 1 }}>
                    <View style={[styles.alertBtn, { backgroundColor: colors.surfaceSecondary }]}>
                      <Text style={{ color: colors.error, fontFamily: FONT_FAMILY.semibold }}>Matikan</Text>
                    </View>
                  </PressableScale>
                )}
                <PressableScale onPress={saveAlert} style={{ flex: 1 }}>
                  <View style={[styles.alertBtn, { backgroundColor: colors.primary }]}>
                    <Text style={{ color: "#FFF", fontFamily: FONT_FAMILY.semibold }}>Simpan</Text>
                  </View>
                </PressableScale>
              </View>
            </View>
          )}
        </FadeInView>

        {/* Ask AI */}
        <FadeInView index={2}>
          <PressableScale onPress={askAI} disabled={aiLoading} accessibilityLabel="Tanya AI">
            <LinearGradient colors={GRADIENTS.emerald as readonly [string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.aiButton, ELEVATION.glow]}>
              <Ionicons name="sparkles" size={20} color="#FFF" />
              <Text style={styles.aiButtonText}>{aiLoading ? "Menganalisis..." : "Tanya AI tentang ini"}</Text>
            </LinearGradient>
          </PressableScale>
        </FadeInView>

        {aiAnswer && (
          <FadeInView index={3}>
            <View style={[styles.aiCard, { backgroundColor: colors.surface, borderColor: colors.border }, ELEVATION.md]}>
              <View style={styles.aiHeader}>
                <View style={[styles.aiAvatar, { backgroundColor: colors.accentSoft }]}>
                  <Ionicons name="sparkles" size={14} color={colors.primary} />
                </View>
                <Text style={[styles.aiLabel, { color: colors.primary }]}>PANTAU AI</Text>
                <View style={{ flex: 1 }} />
                <PressableScale onPress={toggleSpeak} accessibilityLabel="Bacakan">
                  <View style={[styles.speakBtn, { backgroundColor: speaking ? colors.primary : colors.surfaceSecondary }]}>
                    <Ionicons name={speaking ? "stop" : "volume-high"} size={16} color={speaking ? "#FFF" : colors.primary} />
                  </View>
                </PressableScale>
              </View>
              <Text style={[styles.aiText, { color: colors.text }]}>{aiAnswer}</Text>
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
  header: { paddingTop: 16, paddingBottom: 24, paddingHorizontal: SPACING.lg, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  headerRow: { flexDirection: "row", alignItems: "center" },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 20, fontFamily: FONT_FAMILY.bold, color: "#FFF", letterSpacing: -0.4 },
  headerSub: { fontSize: 13, color: "rgba(255,255,255,0.8)", fontFamily: FONT_FAMILY.regular, marginTop: 2 },
  dataCard: { borderRadius: BORDER_RADIUS.xxl, borderWidth: 1, padding: SPACING.lg, marginBottom: SPACING.lg },
  cardHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  catChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: BORDER_RADIUS.full },
  catChipText: { fontSize: 12, fontFamily: FONT_FAMILY.semibold, textTransform: "capitalize" },
  brandTag: { fontSize: 11, fontFamily: FONT_FAMILY.bold, letterSpacing: 2 },
  priceLabel: { fontSize: 11, fontFamily: FONT_FAMILY.semibold, letterSpacing: 1.2, marginBottom: 6 },
  priceValue: { fontSize: 34, fontFamily: FONT_FAMILY.bold, letterSpacing: -1 },
  changeBadge: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 5, borderRadius: BORDER_RADIUS.full, marginTop: 10, gap: 5 },
  changeText: { fontSize: 13, fontFamily: FONT_FAMILY.semibold },
  sourceText: { fontSize: 11, fontFamily: FONT_FAMILY.regular, marginTop: 8 },
  snippetBox: { padding: SPACING.md, borderRadius: BORDER_RADIUS.lg, marginTop: SPACING.sm },
  snippetContent: { fontSize: 13, lineHeight: 19, fontFamily: FONT_FAMILY.regular },
  noDataText: { fontSize: 14, fontFamily: FONT_FAMILY.medium, marginTop: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: SPACING.md, padding: SPACING.md, borderRadius: BORDER_RADIUS.lg, borderWidth: 1, marginBottom: SPACING.sm },
  rowIcon: { width: 38, height: 38, borderRadius: BORDER_RADIUS.md, alignItems: "center", justifyContent: "center" },
  rowTitle: { fontSize: 14, fontFamily: FONT_FAMILY.semibold },
  rowSub: { fontSize: 12, fontFamily: FONT_FAMILY.regular, marginTop: 2 },
  alertForm: { padding: SPACING.lg, borderRadius: BORDER_RADIUS.lg, borderWidth: 1, marginBottom: SPACING.sm },
  typeBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: BORDER_RADIUS.md, borderWidth: 1 },
  alertInput: { borderWidth: 1, borderRadius: BORDER_RADIUS.md, paddingHorizontal: 14, height: 46, fontSize: 16, fontFamily: FONT_FAMILY.monoMedium },
  alertBtn: { paddingVertical: 12, borderRadius: BORDER_RADIUS.md, alignItems: "center" },
  aiButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 16, borderRadius: BORDER_RADIUS.xl, marginBottom: SPACING.lg },
  aiButtonText: { fontSize: 16, fontFamily: FONT_FAMILY.semibold, color: "#FFF" },
  aiCard: { borderRadius: BORDER_RADIUS.xl, borderWidth: 1, padding: SPACING.lg, marginBottom: SPACING.lg },
  aiHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: SPACING.md },
  aiAvatar: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  aiLabel: { fontSize: 11, fontFamily: FONT_FAMILY.semibold, letterSpacing: 1 },
  speakBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  aiText: { fontSize: 14, lineHeight: 22, fontFamily: FONT_FAMILY.regular },
  aiSources: { marginTop: SPACING.md, paddingTop: SPACING.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "rgba(127,127,127,0.2)" },
  aiSourcesLabel: { fontSize: 9, fontFamily: FONT_FAMILY.semibold, letterSpacing: 1, marginBottom: 4 },
  aiSourceRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 3 },
  aiSourceText: { fontSize: 12, flex: 1, fontFamily: FONT_FAMILY.medium },
});

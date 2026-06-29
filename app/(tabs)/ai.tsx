import { useCallback, useRef, useState } from "react";
import {
  View, Text, TextInput, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, Keyboard, Animated, Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "../../src/hooks/useApp";
import { useTheme } from "../../src/hooks";
import { SPACING, BORDER_RADIUS, FONTS, TABULAR } from "../../src/config";
import { FadeInView, PressableScale, usePulse } from "../../src/components/motion";
import { getLiveValue, isSupported } from "../../src/services/liveData";
import { api } from "../../src/api/client";

type Msg = { id: string; role: "user" | "ai"; text: string; model?: string; sources?: { title: string; url: string }[]; usedWeb?: boolean };

const SUGGESTIONS = [
  "Ringkas semua pantauan saya",
  "Berita crypto terbaru hari ini?",
  "Bitcoin lagi naik atau turun?",
  "Apa yang bagus saya pantau?",
];

export default function AiScreen() {
  const { user, monitors } = useApp();
  const { colors } = useTheme();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const pulse = usePulse(loading);

  // Same derivation the AppContext uses to map a user to a stable id.
  const userId = user?.name ? user.name.toLowerCase().replace(/[^a-z0-9]/g, "") : undefined;

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  }, []);

  // Make sure we hold a valid session token before asking the AI.
  const ensureAuth = useCallback(async () => {
    if (api.getToken()) return;
    if (userId) {
      await api.register(userId, user?.name || "Pengguna", (user as any)?.avatar || "person").catch(() => {});
    }
  }, [userId, user]);

  // Pull real live values for recognised monitors so the AI answers from
  // actual numbers, never invented ones.
  const gatherItems = useCallback(async () => {
    return Promise.all(
      monitors.map(async (m) => {
        if (!isSupported(m.title, m.category)) return { title: m.title };
        try {
          const q = await getLiveValue(m.title, m.category);
          return q ? { title: m.title, value: q.display, change: q.change24h } : { title: m.title };
        } catch {
          return { title: m.title };
        }
      })
    );
  }, [monitors]);

  const send = useCallback(
    async (question: string) => {
      const text = question.trim();
      if (!text || loading) return;
      Keyboard.dismiss();
      setInput("");
      const userMsg: Msg = { id: `u${Date.now()}`, role: "user", text };
      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);
      scrollToEnd();

      try {
        await ensureAuth();
        const items = await gatherItems();
        let res = await api.aiAsk({ items, question: text, web: true }, userId);
        // One retry if the session expired/missing.
        if (!res.success && /unauth|401|sesi/i.test(res.error || "")) {
          api.setToken(null);
          await ensureAuth();
          res = await api.aiAsk({ items, question: text, web: true }, userId);
        }
        const aiMsg: Msg = res.success
          ? { id: `a${Date.now()}`, role: "ai", text: res.data.answer || "Belum ada jawaban.", model: res.data.model, sources: res.data.sources, usedWeb: res.data.usedWeb }
          : { id: `a${Date.now()}`, role: "ai", text: `Gagal memuat jawaban. ${res.error || "Coba lagi."}` };
        setMessages((prev) => [...prev, aiMsg]);
      } catch (e: any) {
        setMessages((prev) => [...prev, { id: `a${Date.now()}`, role: "ai", text: "Koneksi bermasalah. Coba lagi." }]);
      } finally {
        setLoading(false);
        scrollToEnd();
      }
    },
    [loading, ensureAuth, gatherItems, user, scrollToEnd]
  );

  const empty = messages.length === 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[FONTS.eyebrow, { color: colors.primary }]}>PANTAU AI</Text>
        <Text style={[styles.title, { color: colors.text }]}>Asisten kamu</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Tanya apa saja. Dijawab pakai data harga real + pencarian web terkini.
        </Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: SPACING.lg, paddingBottom: SPACING.xl }}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={scrollToEnd}
        >
          {empty && (
            <FadeInView>
              <View style={[styles.introCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={[styles.introIcon, { backgroundColor: colors.accentSoft }]}>
                  <Ionicons name="sparkles" size={22} color={colors.primary} />
                </View>
                <Text style={[styles.introTitle, { color: colors.text }]}>Mulai ngobrol</Text>
                <Text style={[styles.introDesc, { color: colors.textSecondary }]}>
                  Aku bisa meringkas pantauan, baca tren harga, dan kasih saran apa yang layak dipantau.
                </Text>
              </View>
            </FadeInView>
          )}

          {messages.map((m, i) => (
            <FadeInView key={m.id} index={Math.min(i, 4)}>
              {m.role === "user" ? (
                <View style={[styles.bubbleUser, { backgroundColor: colors.primary }]}>
                  <Text style={styles.bubbleUserText}>{m.text}</Text>
                </View>
              ) : (
                <View style={styles.aiRow}>
                  <View style={[styles.aiAvatar, { backgroundColor: colors.accentSoft }]}>
                    <Ionicons name="sparkles" size={14} color={colors.primary} />
                  </View>
                  <View style={[styles.bubbleAi, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.bubbleAiText, { color: colors.text }]}>{m.text}</Text>
                    {!!m.sources?.length && (
                      <View style={styles.sources}>
                        <Text style={[styles.sourcesLabel, { color: colors.textTertiary }]}>SUMBER WEB</Text>
                        {m.sources.slice(0, 4).map((s, si) => (
                          <PressableScale key={si} onPress={() => s.url && Linking.openURL(s.url)} scaleTo={0.98} accessibilityRole="link" accessibilityLabel={s.title}>
                            <View style={styles.sourceRow}>
                              <Ionicons name="link" size={12} color={colors.primary} />
                              <Text style={[styles.sourceText, { color: colors.primary }]} numberOfLines={1}>{s.title || s.url}</Text>
                            </View>
                          </PressableScale>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              )}
            </FadeInView>
          ))}

          {loading && (
            <View style={styles.aiRow}>
              <View style={[styles.aiAvatar, { backgroundColor: colors.accentSoft }]}>
                <Ionicons name="sparkles" size={14} color={colors.primary} />
              </View>
              <Animated.View style={[styles.bubbleAi, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pulse }]}>
                <Text style={[styles.bubbleAiText, { color: colors.textSecondary }]}>Sedang berpikir…</Text>
              </Animated.View>
            </View>
          )}
        </ScrollView>

        {/* Suggestions */}
        {empty && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
            keyboardShouldPersistTaps="handled"
          >
            {SUGGESTIONS.map((s, i) => (
              <FadeInView key={s} index={i}>
                <PressableScale onPress={() => send(s)} accessibilityLabel={s}>
                  <View style={[styles.chip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.chipText, { color: colors.text }]}>{s}</Text>
                  </View>
                </PressableScale>
              </FadeInView>
            ))}
          </ScrollView>
        )}

        {/* Composer */}
        <View style={[styles.composer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <TextInput
            style={[styles.input, { color: colors.text, backgroundColor: colors.surfaceSecondary }]}
            placeholder="Tanya apa saja…"
            placeholderTextColor={colors.textTertiary}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => send(input)}
            returnKeyType="send"
            editable={!loading}
            multiline
          />
          <PressableScale onPress={() => send(input)} disabled={loading || !input.trim()} accessibilityLabel="Kirim">
            <View style={[styles.sendBtn, { backgroundColor: input.trim() && !loading ? colors.primary : colors.border }]}>
              <Ionicons name="arrow-up" size={20} color="#FFFFFF" />
            </View>
          </PressableScale>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, paddingBottom: SPACING.md },
  title: { ...FONTS.h1, marginTop: 4 },
  subtitle: { ...FONTS.regular, marginTop: 6, maxWidth: "92%" },
  introCard: { borderRadius: BORDER_RADIUS.xl, borderWidth: 1, padding: SPACING.xl, alignItems: "flex-start", marginBottom: SPACING.lg },
  introIcon: { width: 44, height: 44, borderRadius: BORDER_RADIUS.lg, alignItems: "center", justifyContent: "center", marginBottom: SPACING.md },
  introTitle: { ...FONTS.h3, marginBottom: 4 },
  introDesc: { ...FONTS.regular },
  bubbleUser: { alignSelf: "flex-end", maxWidth: "82%", paddingVertical: SPACING.md, paddingHorizontal: SPACING.lg, borderRadius: BORDER_RADIUS.xl, borderBottomRightRadius: BORDER_RADIUS.sm, marginBottom: SPACING.md },
  bubbleUserText: { color: "#FFFFFF", fontSize: 15, lineHeight: 21, fontFamily: "Outfit_500Medium" },
  aiRow: { flexDirection: "row", alignItems: "flex-end", marginBottom: SPACING.md, maxWidth: "90%" },
  aiAvatar: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", marginRight: SPACING.sm },
  bubbleAi: { flex: 1, paddingVertical: SPACING.md, paddingHorizontal: SPACING.lg, borderRadius: BORDER_RADIUS.xl, borderBottomLeftRadius: BORDER_RADIUS.sm, borderWidth: 1 },
  bubbleAiText: { fontSize: 15, lineHeight: 22 },
  modelTag: { fontSize: 10, marginTop: 6 },
  sources: { marginTop: SPACING.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "rgba(127,127,127,0.25)", paddingTop: SPACING.sm },
  sourcesLabel: { fontFamily: FONTS.eyebrow.fontFamily, fontSize: 9, letterSpacing: 1.2, marginBottom: 4 },
  sourceRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 3 },
  sourceText: { fontSize: 12, flex: 1, fontFamily: "Outfit_500Medium" },
  chipsRow: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.sm, gap: SPACING.sm },
  chip: { paddingVertical: SPACING.sm, paddingHorizontal: SPACING.lg, borderRadius: BORDER_RADIUS.full, borderWidth: 1, marginRight: SPACING.sm },
  chipText: { fontSize: 13, fontFamily: "Outfit_500Medium" },
  composer: { flexDirection: "row", alignItems: "flex-end", padding: SPACING.md, borderTopWidth: 1, gap: SPACING.sm },
  input: { flex: 1, minHeight: 44, maxHeight: 120, borderRadius: BORDER_RADIUS.xl, paddingHorizontal: SPACING.lg, paddingTop: Platform.OS === "ios" ? 12 : 8, paddingBottom: Platform.OS === "ios" ? 12 : 8, fontSize: 15 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
});

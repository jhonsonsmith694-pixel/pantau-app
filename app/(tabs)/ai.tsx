import { useCallback, useEffect, useRef, useState } from "react";
import {
  View, Text, TextInput, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, Keyboard, Animated, Linking, TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useApp } from "../../src/hooks/useApp";
import { useTheme } from "../../src/hooks";
import { SPACING, BORDER_RADIUS, FONTS, TABULAR, FONT_FAMILY } from "../../src/config";
import { FadeInView, PressableScale, usePulse } from "../../src/components/motion";
import { getLiveValue, isSupported } from "../../src/services/liveData";
import { api } from "../../src/api/client";
import { security } from "../../src/services/security";

type Msg = { id: string; role: "user" | "ai"; text: string; model?: string; sources?: { title: string; url: string }[]; usedWeb?: boolean; suggestions?: string[] };

const STORAGE_KEY = "@pantau_ai_history";
const MAX_HISTORY = 50;

const SUGGESTIONS = [
  "Harga beras hari ini?",
  "Berita bola terbaru",
  "Harga emas Antam sekarang",
  "Ringkas pantauan saya",
  "Kurs dollar hari ini",
  "Harga BBM terbaru",
];

// Extract follow-up suggestions from AI response
function extractSuggestions(text: string): string[] {
  const lines = text.split('\n');
  const suggestions: string[] = [];
  let inSuggestionBlock = false;
  for (const line of lines) {
    if (line.includes('💡') || line.toLowerCase().includes('pertanyaan lanjutan')) {
      inSuggestionBlock = true;
      continue;
    }
    if (inSuggestionBlock && line.trim().startsWith('-')) {
      const cleaned = line.trim().replace(/^-\s*/, '').trim();
      if (cleaned.length > 5 && cleaned.length < 100) suggestions.push(cleaned);
    }
  }
  return suggestions.slice(0, 3);
}

// Remove the suggestion block from displayed text
function cleanResponse(text: string): string {
  const idx = text.indexOf('💡');
  if (idx > 0) return text.slice(0, idx).trim();
  return text;
}

export default function AiScreen() {
  const { user, monitors } = useApp();
  const { colors } = useTheme();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const pulse = usePulse(loading);

  // Load chat history from AsyncStorage
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(raw => {
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as Msg[];
            setMessages(parsed.slice(-MAX_HISTORY));
          } catch {}
        }
      })
      .finally(() => setHistoryLoaded(true));
  }, []);

  // Persist messages to AsyncStorage
  useEffect(() => {
    if (!historyLoaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_HISTORY))).catch(() => {});
  }, [messages, historyLoaded]);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  }, []);

  const ensureAuth = useCallback(async () => {
    if (api.getToken()) return;
    const uid = await security.getDeviceId();
    await api.register(uid, user?.name || "Pengguna", (user as any)?.avatar || "person").catch(() => {});
  }, [user]);

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
        let res = await api.aiAsk({ items, question: text, web: true });
        if (!res.success && /unauth|401|sesi/i.test(res.error || "")) {
          api.setToken(null);
          await ensureAuth();
          res = await api.aiAsk({ items, question: text, web: true });
        }
        if (res.success) {
          const fullText = res.data.answer || "Belum ada jawaban.";
          const suggestions = extractSuggestions(fullText);
          const displayText = cleanResponse(fullText);
          const aiMsg: Msg = {
            id: `a${Date.now()}`, role: "ai", text: displayText,
            model: res.data.model, sources: res.data.sources, usedWeb: res.data.usedWeb,
            suggestions,
          };
          setMessages((prev) => [...prev, aiMsg]);
        } else {
          setMessages((prev) => [...prev, { id: `a${Date.now()}`, role: "ai", text: `Gagal memuat jawaban. ${res.error || "Coba lagi."}` }]);
        }
      } catch (e: any) {
        setMessages((prev) => [...prev, { id: `a${Date.now()}`, role: "ai", text: "Koneksi bermasalah. Coba lagi." }]);
      } finally {
        setLoading(false);
        scrollToEnd();
      }
    },
    [loading, ensureAuth, gatherItems, user, scrollToEnd]
  );

  const clearHistory = useCallback(() => {
    setMessages([]);
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  }, []);

  const empty = messages.length === 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top"]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[FONTS.eyebrow, { color: colors.primary }]}>PANTAU AI</Text>
          <Text style={[styles.title, { color: colors.text }]}>Asisten kamu</Text>
        </View>
        {messages.length > 0 && (
          <PressableScale onPress={clearHistory} accessibilityLabel="Hapus riwayat">
            <View style={[styles.clearBtn, { backgroundColor: colors.surfaceSecondary }]}>
              <Ionicons name="trash-outline" size={16} color={colors.textTertiary} />
              <Text style={[styles.clearBtnText, { color: colors.textTertiary }]}>Hapus</Text>
            </View>
          </PressableScale>
        )}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
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
                  Tanya apa saja - harga, berita, analisis. Dijawab pakai data real-time + web search. Riwayat chat tersimpan otomatis.
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
                  <View style={{ flex: 1 }}>
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
                    {/* Follow-up suggestion chips */}
                    {m.suggestions && m.suggestions.length > 0 && (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestionsRow}>
                        {m.suggestions.map((s, si) => (
                          <PressableScale key={si} onPress={() => send(s)} accessibilityLabel={s}>
                            <View style={[styles.suggestionChip, { backgroundColor: colors.accentSoft, borderColor: colors.primary + "30" }]}>
                              <Ionicons name="bulb-outline" size={12} color={colors.primary} />
                              <Text style={[styles.suggestionText, { color: colors.primary }]} numberOfLines={1}>{s}</Text>
                            </View>
                          </PressableScale>
                        ))}
                      </ScrollView>
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
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Ionicons name="globe-outline" size={14} color={colors.primary} />
                  <Text style={[styles.bubbleAiText, { color: colors.textSecondary }]}>Mencari di web & menyusun jawaban...</Text>
                </View>
              </Animated.View>
            </View>
          )}
        </ScrollView>

        {/* Suggestions when empty */}
        {empty && (
          <View style={styles.chipsWrap}>
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
          </View>
        )}

        {/* Composer */}
        <View style={[styles.composer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <TextInput
            style={[styles.input, { color: colors.text, backgroundColor: colors.surfaceSecondary }]}
            placeholder="Tanya apa saja..."
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
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, paddingBottom: SPACING.md, borderBottomWidth: 1 },
  title: { ...FONTS.h1, marginTop: 4 },
  clearBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: BORDER_RADIUS.full },
  clearBtnText: { fontSize: 12, fontFamily: FONT_FAMILY.medium },
  introCard: { borderRadius: BORDER_RADIUS.xl, borderWidth: 1, padding: SPACING.xl, alignItems: "flex-start", marginBottom: SPACING.lg },
  introIcon: { width: 44, height: 44, borderRadius: BORDER_RADIUS.lg, alignItems: "center", justifyContent: "center", marginBottom: SPACING.md },
  introTitle: { ...FONTS.h3, marginBottom: 4 },
  introDesc: { ...FONTS.regular },
  bubbleUser: { alignSelf: "flex-end", maxWidth: "82%", paddingVertical: SPACING.md, paddingHorizontal: SPACING.lg, borderRadius: BORDER_RADIUS.xl, borderBottomRightRadius: BORDER_RADIUS.sm, marginBottom: SPACING.md },
  bubbleUserText: { color: "#FFFFFF", fontSize: 15, lineHeight: 21, fontFamily: FONT_FAMILY.medium },
  aiRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: SPACING.md, maxWidth: "92%" },
  aiAvatar: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", marginRight: SPACING.sm, marginTop: 4 },
  bubbleAi: { flex: 1, paddingVertical: SPACING.md, paddingHorizontal: SPACING.lg, borderRadius: BORDER_RADIUS.xl, borderBottomLeftRadius: BORDER_RADIUS.sm, borderWidth: 1 },
  bubbleAiText: { fontSize: 14, lineHeight: 21, fontFamily: FONT_FAMILY.regular },
  sources: { marginTop: SPACING.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "rgba(127,127,127,0.25)", paddingTop: SPACING.sm },
  sourcesLabel: { fontFamily: FONT_FAMILY.semibold, fontSize: 9, letterSpacing: 1.2, marginBottom: 4 },
  sourceRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 3 },
  sourceText: { fontSize: 12, flex: 1, fontFamily: FONT_FAMILY.medium },
  suggestionsRow: { marginTop: SPACING.sm, marginLeft: 0 },
  suggestionChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: BORDER_RADIUS.full, borderWidth: 1, marginRight: 8 },
  suggestionText: { fontSize: 12, fontFamily: FONT_FAMILY.medium, maxWidth: 180 },
  chipsWrap: { paddingBottom: SPACING.sm },
  chipsRow: { paddingHorizontal: SPACING.lg, gap: SPACING.sm },
  chip: { paddingVertical: SPACING.sm, paddingHorizontal: SPACING.lg, borderRadius: BORDER_RADIUS.full, borderWidth: 1, marginRight: SPACING.sm },
  chipText: { fontSize: 13, fontFamily: FONT_FAMILY.medium },
  composer: { flexDirection: "row", alignItems: "flex-end", padding: SPACING.md, borderTopWidth: 1, gap: SPACING.sm },
  input: { flex: 1, minHeight: 44, maxHeight: 120, borderRadius: BORDER_RADIUS.xl, paddingHorizontal: SPACING.lg, paddingTop: Platform.OS === "ios" ? 12 : 8, paddingBottom: Platform.OS === "ios" ? 12 : 8, fontSize: 15, fontFamily: FONT_FAMILY.regular },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
});

import { useState, useCallback, useMemo, useEffect } from "react";
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, FlatList, Keyboard, Alert, RefreshControl, Platform, KeyboardAvoidingView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useApp } from "../../src/hooks/useApp";
import { useTheme } from "../../src/hooks";
import { Card, EmptyState, Badge, CardSkeleton } from "../../src/components";
import { MONITOR_CATEGORIES, PREDEFINED_MONITORS } from "../../src/types";
import { SPACING, BORDER_RADIUS, FONTS, TABULAR, MOTION, FONT_FAMILY } from "../../src/config";
import { getLiveValue, isSupported, LiveQuote } from "../../src/services/liveData";
import { useRouter } from "expo-router";
import { FadeInView, PressableScale, AnimatedNumber } from "../../src/components/motion";

type QuoteState =
  | { status: "loading" }
  | { status: "ok"; quote: LiveQuote }
  | { status: "error"; message: string }
  | { status: "manual" };

type IconName = React.ComponentProps<typeof Ionicons>["name"];

// Per-category icon so the monitor list reads visually, not just text.
const CAT_ICON: Record<string, IconName> = {
  harga: "cash-outline",
  berita: "newspaper-outline",
  stok: "cube-outline",
  jadwal: "calendar-outline",
};
// Large decorative category icons (background)
const CAT_ICON_LARGE: Record<string, IconName> = {
  harga: "cash",
  berita: "newspaper",
  stok: "cube",
  jadwal: "calendar",
};
const catIcon = (c: string): IconName => CAT_ICON[c] || "pricetag-outline";
const catIconLarge = (c: string): IconName => CAT_ICON_LARGE[c] || "pricetag";

// IDR formatter for AnimatedNumber
const formatIDRAnimated = (n: number): string => {
  const s = Math.round(Math.abs(n)).toString();
  const grouped = s.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return 'Rp ' + grouped;
};

export default function PantauScreen() {
  const { monitors, addMonitor, editMonitor, toggleMonitor, deleteMonitor } = useApp();
  const { colors, isDark } = useTheme();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("semua");
  const [newTitle, setNewTitle] = useState("");
  const [newCat, setNewCat] = useState("harga");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCat, setEditCat] = useState("harga");
  const [quotes, setQuotes] = useState<Record<number, QuoteState>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const router = useRouter();

  const liveCount = useMemo(
    () => monitors.filter(m => isSupported(m.title, m.category)).length,
    [monitors]
  );

  const loadQuotes = useCallback(async () => {
    const supported = monitors.filter(m => isSupported(m.title, m.category));
    // Mark unsupported as manual-loading too (Firecrawl might resolve them)
    setQuotes(prev => {
      const next: Record<number, QuoteState> = { ...prev };
      monitors.forEach(m => {
        if (!next[m.id] || next[m.id].status === "error") next[m.id] = { status: "loading" };
      });
      return next;
    });
    await Promise.all(monitors.map(async m => {
      try {
        const q = await getLiveValue(m.title, m.category);
        setQuotes(prev => ({ ...prev, [m.id]: q ? { status: "ok", quote: q } : { status: "manual" } }));
      } catch (e: any) {
        setQuotes(prev => ({ ...prev, [m.id]: { status: "error", message: e?.message || "Gagal memuat" } }));
      }
    }));
    setInitialLoading(false);
  }, [monitors]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await loadQuotes(); } finally { setRefreshing(false); }
  }, [loadQuotes]);

  // Reload live values on mount and whenever the monitor set/titles change.
  const monitorSignature = useMemo(() => monitors.map(m => `${m.id}:${m.title}`).join("|"), [monitors]);
  useEffect(() => { loadQuotes(); }, [monitorSignature]); // eslint-disable-line react-hooks/exhaustive-deps

  const renderQuote = useCallback((m: { id: number; createdAt: string }) => {
    const st = quotes[m.id];
    if (!st || st.status === "loading") return null; // skeleton handles loading state
    if (st.status === "manual") {
      return <Text style={[styles.itemMeta, { color: colors.textTertiary }]}>Pantauan manual · belum ada data</Text>;
    }
    if (st.status === "error") {
      return <Text style={[styles.itemMeta, { color: colors.warning }]}>Gagal memuat — tarik untuk coba lagi</Text>;
    }
    const q = st.quote;

    // Firecrawl snippet-only result (no numeric value)
    if (q.snippet && q.value === 0) {
      return (
        <View style={{ marginTop: 3 }}>
          <Text style={[styles.snippetText, { color: colors.textSecondary }]} numberOfLines={2}>
            {q.snippet}
          </Text>
          <Text style={[styles.snippetSource, { color: colors.textTertiary }]}>
            via {q.source}
          </Text>
        </View>
      );
    }

    const hasChange = q.change24h !== null;
    const up = (q.change24h ?? 0) >= 0;
    return (
      <View style={{ marginTop: 3 }}>
        <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap" }}>
          <AnimatedNumber
            value={q.value}
            duration={MOTION.durationSlow}
            format={formatIDRAnimated}
            style={[styles.itemValue, { color: colors.text }, TABULAR]}
          />
          {hasChange && (
            <View style={{ flexDirection: "row", alignItems: "center", marginLeft: 8 }}>
              <Ionicons name={up ? "trending-up" : "trending-down"} size={13} color={up ? colors.priceUp : colors.priceDown} />
              <Text style={[{ fontSize: 12, fontWeight: "600", color: up ? colors.priceUp : colors.priceDown, marginLeft: 2 }, TABULAR]}>
                {up ? "+" : ""}{(q.change24h as number).toFixed(2)}%
              </Text>
            </View>
          )}
          <Text style={[styles.itemSource, { color: colors.textTertiary }]}>{q.source}</Text>
        </View>
        {/* Firecrawl snippet below the price if available */}
        {q.snippet && (
          <View style={{ marginTop: 4 }}>
            <Text style={[styles.snippetText, { color: colors.textSecondary }]} numberOfLines={2}>
              {q.snippet}
            </Text>
            <Text style={[styles.snippetSource, { color: colors.textTertiary }]}>
              via {q.source}
            </Text>
          </View>
        )}
      </View>
    );
  }, [quotes, colors]);

  const filteredMonitors = useMemo(() => {
    const q = search.toLowerCase();
    return monitors.filter(m => {
      const matchCat = activeCategory === "semua" || m.category === activeCategory;
      const matchSearch = m.title.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [monitors, search, activeCategory]);

  const handleAdd = useCallback(() => {
    const t = newTitle.trim();
    if (!t) return;
    const exists = monitors.some(m => m.title.toLowerCase() === t.toLowerCase());
    if (exists) { Alert.alert("Sudah ada", `"${t}" sudah ada di daftar pantauan`); return; }
    addMonitor(t, newCat as any);
    setNewTitle("");
  }, [newTitle, newCat, monitors, addMonitor]);

  const handleEdit = useCallback((m: typeof monitors[0]) => {
    setEditingId(m.id);
    setEditTitle(m.title);
    setEditCat(m.category);
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (!editingId || !editTitle.trim()) return;
    editMonitor(editingId, { title: editTitle.trim(), category: editCat as any });
    setEditingId(null);
  }, [editingId, editTitle, editCat, editMonitor]);

  const handleDelete = useCallback((id: number, title: string) => {
    Alert.alert("Hapus Pantauan", `Hapus "${title}"?`, [
      { text: "Batal", style: "cancel" },
      { text: "Hapus", style: "destructive", onPress: () => deleteMonitor(id) },
    ]);
  }, [deleteMonitor]);

  const renderItem = useCallback(({ item, index }: { item: typeof monitors[0]; index: number }) => {
    const isLoading = !quotes[item.id] || quotes[item.id].status === "loading";

    return (
      <FadeInView index={index} style={{ marginBottom: SPACING.sm }}>
        <PressableScale onPress={() => router.push(`/monitor/${item.id}`)} onLongPress={() => handleEdit(item)}>
          <View style={[styles.monitorCard, {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            shadowColor: colors.cardShadow,
          }]}>
            {/* Large semi-transparent category icon (decoration) */}
            <View style={styles.bgIconContainer}>
              <Ionicons
                name={catIconLarge(item.category)}
                size={52}
                color={colors.primary}
                style={{ opacity: 0.07 }}
              />
            </View>

            {/* Active indicator */}
            <TouchableOpacity onPress={() => toggleMonitor(item.id)} style={{ marginRight: SPACING.sm }}>
              <Ionicons name={item.active ? "checkmark-circle" : "ellipse-outline"} size={24} color={item.active ? colors.success : colors.textTertiary} />
            </TouchableOpacity>

            {/* Category icon */}
            <View style={[styles.catIcon, { backgroundColor: colors.accentSoft, opacity: item.active ? 1 : 0.5 }]}>
              <Ionicons name={catIcon(item.category)} size={18} color={colors.primary} />
            </View>

            {/* Content */}
            <View style={{ flex: 1, marginLeft: SPACING.md }}>
              <Text style={[styles.itemTitle, { color: colors.text }]}>{item.title}</Text>
              {isLoading ? (
                <View style={{ marginTop: 6 }}>
                  <View style={[styles.skeletonLine, { backgroundColor: colors.border, width: '50%' }]} />
                </View>
              ) : (
                renderQuote(item)
              )}
            </View>

            {/* Delete */}
            <TouchableOpacity onPress={() => handleDelete(item.id, item.title)} style={{ marginLeft: SPACING.sm, padding: 4 }}>
              <Ionicons name="trash-outline" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>
        </PressableScale>
      </FadeInView>
    );
  }, [colors, toggleMonitor, handleEdit, handleDelete, renderQuote, quotes]);

  // Skeleton loader for initial load
  const renderSkeletons = () => (
    <View style={{ padding: SPACING.lg }}>
      {[0, 1, 2, 3].map(i => (
        <FadeInView key={i} index={i}>
          <CardSkeleton colors={colors} />
        </FadeInView>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
      {/* Gradient Header */}
      <LinearGradient colors={colors.gradient as [string, string]} style={styles.gradientHeader}>
        <View style={styles.headerContent}>
          <View style={{ flex: 1, paddingRight: SPACING.md }}>
            <Text style={styles.headerTitle}>Pantau</Text>
            <Text style={styles.headerSub}>
              {liveCount > 0
                ? `${liveCount} harga real-time · tarik untuk refresh`
                : 'Harga real-time crypto, emas & kurs'}
            </Text>
          </View>
          <View style={[styles.liveIndicator, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
            <View style={[styles.liveDot, { backgroundColor: '#34D399' }]} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Search */}
      <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="search" size={18} color={colors.textTertiary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Cari pantauan..."
          placeholderTextColor={colors.textTertiary}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Category Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catRow} contentContainerStyle={{ paddingHorizontal: SPACING.lg }}>
        {[{ key: "semua", label: "Semua", icon: "apps" as IconName }, ...MONITOR_CATEGORIES].map(c => (
          <TouchableOpacity key={c.key} onPress={() => setActiveCategory(c.key)} style={[styles.catBtn, { backgroundColor: activeCategory === c.key ? colors.primary : colors.surface, borderColor: colors.border }]}>
            <Ionicons name={c.icon} size={14} color={activeCategory === c.key ? "#FFF" : colors.textTertiary} style={{ marginRight: 4 }} />
            <Text style={[styles.catText, { color: activeCategory === c.key ? "#FFF" : colors.textTertiary }]}>{c.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* AI entry point — full assistant lives in its own tab */}
      {monitors.length > 0 && (
        <FadeInView index={0}>
          <PressableScale onPress={() => router.push("/ai")} accessibilityLabel="Buka asisten AI">
            <View style={[styles.aiCard, { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: colors.cardShadow }]}>
              <View style={[styles.aiIcon, { backgroundColor: colors.accentSoft }]}>
                <Ionicons name="sparkles" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.aiTitle, { color: colors.text }]}>Tanya asisten AI</Text>
                <Text style={[styles.aiBody, { color: colors.textSecondary }]} numberOfLines={1}>
                  Ringkasan & insight dari pantauan kamu, pakai data real.
                </Text>
              </View>
              <Ionicons name="arrow-forward" size={18} color={colors.textTertiary} />
            </View>
          </PressableScale>
        </FadeInView>
      )}

      {/* Edit Modal */}
      {editingId && (
        <View style={[styles.editOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.editModal, { backgroundColor: colors.surface }]}>
            <Text style={[styles.editTitleStyle, { color: colors.text }]}>Edit Pantauan</Text>
            <TextInput style={[styles.editInput, { backgroundColor: colors.surfaceSecondary, color: colors.text, borderColor: colors.border }]} value={editTitle} onChangeText={setEditTitle} placeholder="Nama pantauan" placeholderTextColor={colors.textTertiary} />
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
              {MONITOR_CATEGORIES.map(c => (
                <TouchableOpacity key={c.key} onPress={() => setEditCat(c.key)} style={[styles.catBtn, { backgroundColor: editCat === c.key ? colors.primary : colors.surfaceSecondary, borderColor: colors.border }]}>
                  <Text style={{ color: editCat === c.key ? "#FFF" : colors.text, fontSize: 12 }}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TouchableOpacity onPress={() => setEditingId(null)} style={[styles.editBtn, { backgroundColor: colors.surfaceSecondary }]}>
                <Text style={{ color: colors.text, fontWeight: "600" }}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSaveEdit} style={[styles.editBtn, { backgroundColor: colors.primary }]}>
                <Text style={{ color: "#FFF", fontWeight: "600" }}>Simpan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Content */}
      {initialLoading && monitors.length > 0 ? (
        renderSkeletons()
      ) : filteredMonitors.length === 0 ? (
        <ScrollView keyboardShouldPersistTaps="handled" onScrollBeginDrag={Keyboard.dismiss}>
          <EmptyState icon="eye-off" title={search ? "Tidak ada hasil" : "Belum ada pantauan"} description={search ? "Coba kata kunci lain" : "Tambahkan sesuatu untuk dipantau di bawah"} colors={colors} />
        </ScrollView>
      ) : (
        <FlatList
          data={filteredMonitors}
          renderItem={renderItem}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={{ padding: SPACING.lg, paddingBottom: SPACING.lg }}
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={Keyboard.dismiss}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
        />
      )}

      {/* Add new monitor form */}
      <View style={[styles.bottomBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <TextInput
          style={[styles.bottomInput, { backgroundColor: colors.surfaceSecondary, color: colors.text, borderColor: colors.border }]}
          placeholder="Nama yang mau dipantau..."
          placeholderTextColor={colors.textTertiary}
          value={newTitle}
          onChangeText={setNewTitle}
          onSubmitEditing={handleAdd}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 6 }}>
          {MONITOR_CATEGORIES.map(c => (
            <TouchableOpacity key={c.key} onPress={() => setNewCat(c.key)} style={[styles.catChip, { backgroundColor: newCat === c.key ? colors.primary : colors.surfaceSecondary, borderColor: colors.border }]}>
              <Text style={{ color: newCat === c.key ? "#FFF" : colors.text, fontSize: 12 }}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <TouchableOpacity onPress={handleAdd} disabled={!newTitle.trim()} style={[styles.addButton, { backgroundColor: newTitle.trim() ? colors.primary : colors.border }]}>
          <Ionicons name="add" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  gradientHeader: {
    paddingTop: 20,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 26,
    fontFamily: FONT_FAMILY.bold,
    color: "#FFFFFF",
    letterSpacing: -0.6,
  },
  headerSub: {
    fontSize: 13,
    color: "rgba(255,255,255,0.85)",
    marginTop: 4,
    fontFamily: FONT_FAMILY.regular,
  },
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.full,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 5,
  },
  liveText: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.semibold,
    color: "#FFFFFF",
    letterSpacing: 1,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    margin: SPACING.lg,
    marginTop: SPACING.lg,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md,
    height: 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    fontFamily: FONT_FAMILY.regular,
  },
  catRow: { marginBottom: SPACING.sm },
  catBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    marginRight: 8,
  },
  catText: { fontSize: 13, fontFamily: FONT_FAMILY.medium },
  monitorCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    overflow: "hidden",
    // Enhanced depth shadows
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  bgIconContainer: {
    position: "absolute",
    right: 12,
    top: "50%",
    marginTop: -26,
  },
  catIcon: {
    width: 38,
    height: 38,
    borderRadius: BORDER_RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
  },
  itemTitle: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.semibold,
  },
  itemMeta: {
    fontSize: 12,
    marginTop: 2,
    fontFamily: FONT_FAMILY.regular,
  },
  itemValue: {
    fontSize: 16,
    letterSpacing: -0.3,
  },
  itemSource: {
    fontSize: 10,
    marginLeft: 8,
    marginTop: 1,
  },
  snippetText: {
    fontSize: 12,
    lineHeight: 17,
    fontFamily: FONT_FAMILY.regular,
  },
  snippetSource: {
    fontSize: 10,
    marginTop: 2,
    fontFamily: FONT_FAMILY.regular,
    fontStyle: "italic",
  },
  skeletonLine: {
    height: 12,
    borderRadius: 6,
  },
  aiCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  aiIcon: {
    width: 38,
    height: 38,
    borderRadius: BORDER_RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
  },
  aiTitle: { fontSize: 14, fontFamily: FONT_FAMILY.semibold },
  aiBody: { fontSize: 13, lineHeight: 18, marginTop: 2, fontFamily: FONT_FAMILY.regular },
  bottomBar: {
    padding: SPACING.lg,
    paddingBottom: SPACING.lg,
    borderTopWidth: 1,
  },
  bottomInput: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: 12,
    height: 40,
    fontSize: 14,
    fontFamily: FONT_FAMILY.regular,
  },
  catChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    marginRight: 6,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-end",
    marginTop: -40,
  },
  editOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  editModal: {
    width: 300,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
  },
  editTitleStyle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: SPACING.lg,
  },
  editInput: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: 12,
    height: 40,
    fontSize: 14,
    marginBottom: SPACING.md,
  },
  editBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: BORDER_RADIUS.md,
    alignItems: "center",
  },
});

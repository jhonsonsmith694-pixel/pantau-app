import { useState, useCallback, useMemo, useEffect } from "react";
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, FlatList, Keyboard, Alert, RefreshControl, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "../../src/hooks/useApp";
import { useTheme } from "../../src/hooks";
import { Card, EmptyState, Badge } from "../../src/components";
import { MONITOR_CATEGORIES, PREDEFINED_MONITORS } from "../../src/types";
import { SPACING, BORDER_RADIUS, FONTS, TABULAR } from "../../src/config";
import { getLiveValue, isSupported, LiveQuote } from "../../src/services/liveData";
import { useRouter } from "expo-router";
import { FadeInView, PressableScale } from "../../src/components/motion";

type QuoteState =
  | { status: "loading" }
  | { status: "ok"; quote: LiveQuote }
  | { status: "error"; message: string }
  | { status: "manual" };

type IconName = React.ComponentProps<typeof Ionicons>["name"];

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
  const router = useRouter();

  const liveCount = useMemo(
    () => monitors.filter(m => isSupported(m.title, m.category)).length,
    [monitors]
  );

  const loadQuotes = useCallback(async () => {
    const supported = monitors.filter(m => isSupported(m.title, m.category));
    setQuotes(prev => {
      const next: Record<number, QuoteState> = { ...prev };
      monitors.forEach(m => {
        if (!isSupported(m.title, m.category)) next[m.id] = { status: "manual" };
        else if (!next[m.id] || next[m.id].status === "manual" || next[m.id].status === "error") next[m.id] = { status: "loading" };
      });
      return next;
    });
    await Promise.all(supported.map(async m => {
      try {
        const q = await getLiveValue(m.title, m.category);
        setQuotes(prev => ({ ...prev, [m.id]: q ? { status: "ok", quote: q } : { status: "manual" } }));
      } catch (e: any) {
        setQuotes(prev => ({ ...prev, [m.id]: { status: "error", message: e?.message || "Gagal memuat" } }));
      }
    }));
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
    if (!st || st.status === "loading") {
      return <ActivityIndicator size="small" color={colors.textTertiary} style={{ alignSelf: "flex-start", marginTop: 4 }} />;
    }
    if (st.status === "manual") {
      return <Text style={[styles.itemMeta, { color: colors.textTertiary }]}>Pantauan manual · belum ada data harga live</Text>;
    }
    if (st.status === "error") {
      return <Text style={[styles.itemMeta, { color: colors.warning }]}>Gagal memuat — tarik ke bawah untuk coba lagi</Text>;
    }
    const q = st.quote;
    const hasChange = q.change24h !== null;
    const up = (q.change24h ?? 0) >= 0;
    return (
      <View style={{ flexDirection: "row", alignItems: "center", marginTop: 3, flexWrap: "wrap" }}>
        <Text style={[styles.itemValue, { color: colors.text }, TABULAR]}>{q.display}</Text>
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

  const renderItem = useCallback(({ item }: { item: typeof monitors[0] }) => (
    <TouchableOpacity onPress={() => toggleMonitor(item.id)} onLongPress={() => handleEdit(item)} activeOpacity={0.7}>
      <Card colors={colors} style={{ flexDirection: "row", alignItems: "center", paddingVertical: SPACING.md }}>
        <TouchableOpacity onPress={() => toggleMonitor(item.id)} style={{ marginRight: SPACING.md }}>
          <Ionicons name={item.active ? "checkmark-circle" : "ellipse-outline"} size={24} color={item.active ? colors.success : colors.textTertiary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.itemTitle, { color: colors.text }]}>{item.title}</Text>
          {renderQuote(item)}
        </View>
        <Badge label={item.category} color={colors.primary} colors={colors} />
        <TouchableOpacity onPress={() => handleDelete(item.id, item.title)} style={{ marginLeft: SPACING.sm, padding: 4 }}>
          <Ionicons name="trash-outline" size={18} color={colors.textTertiary} />
        </TouchableOpacity>
      </Card>
    </TouchableOpacity>
  ), [colors, toggleMonitor, handleEdit, handleDelete, renderQuote]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Pantau</Text>
        <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
          Harga real-time crypto, emas & kurs. Item lain tersimpan sebagai pantauan manual.
        </Text>
      </View>

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
        <PressableScale onPress={() => router.push("/ai")} accessibilityLabel="Buka asisten AI">
          <View style={[styles.aiCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
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
      )}

      {/* Edit Modal */}
      {editingId && (
        <View style={[styles.editOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.editModal, { backgroundColor: colors.surface }]}>
            <Text style={[styles.editTitle, { color: colors.text }]}>Edit Pantauan</Text>
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

      {filteredMonitors.length === 0 ? (
        <ScrollView keyboardShouldPersistTaps="handled" onScrollBeginDrag={Keyboard.dismiss}>
          <EmptyState icon="eye-off" title={search ? "Tidak ada hasil" : "Belum ada pantauan"} description={search ? "Coba kata kunci lain" : "Tambahkan sesuatu untuk dipantau di bawah"} colors={colors} />
        </ScrollView>
      ) : (
        <FlatList
          data={filteredMonitors}
          renderItem={renderItem}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 140 }}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: SPACING.xl, paddingVertical: SPACING.lg, borderBottomWidth: 1 },
  headerTitle: { fontFamily: FONTS.h1.fontFamily, fontSize: 26, letterSpacing: -0.6 },
  headerSub: { fontFamily: FONTS.regular.fontFamily, fontSize: 13, marginTop: 4, lineHeight: 18 },
  searchBar: { flexDirection: "row", alignItems: "center", margin: SPACING.lg, borderWidth: 1, borderRadius: BORDER_RADIUS.lg, paddingHorizontal: SPACING.md, height: 44 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14, fontFamily: FONTS.regular.fontFamily },
  catRow: { marginBottom: SPACING.sm },
  catBtn: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 6, borderRadius: BORDER_RADIUS.full, borderWidth: 1, marginRight: 8 },
  catText: { fontSize: 13, fontFamily: FONTS.medium.fontFamily },
  itemTitle: { fontSize: 15, fontFamily: FONTS.semibold.fontFamily },
  itemMeta: { fontSize: 12, marginTop: 2, fontFamily: FONTS.regular.fontFamily },
  itemValue: { fontSize: 16, letterSpacing: -0.3 },
  itemSource: { fontSize: 10, marginLeft: 8, marginTop: 1 },
  aiCard: { flexDirection: "row", alignItems: "center", gap: SPACING.md, marginHorizontal: SPACING.lg, marginBottom: SPACING.sm, padding: SPACING.md, borderRadius: BORDER_RADIUS.lg, borderWidth: 1 },
  aiIcon: { width: 38, height: 38, borderRadius: BORDER_RADIUS.md, alignItems: "center", justifyContent: "center" },
  aiTitle: { fontSize: 14, fontFamily: FONTS.semibold.fontFamily },
  aiBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: BORDER_RADIUS.full, minWidth: 70, alignItems: "center" },
  aiBody: { fontSize: 13, lineHeight: 18, marginTop: 2 },
  bottomBar: { position: "absolute", bottom: 0, left: 0, right: 0, padding: SPACING.lg, paddingBottom: SPACING.xxxl, borderTopWidth: 1 },
  bottomInput: { borderWidth: 1, borderRadius: BORDER_RADIUS.md, paddingHorizontal: 12, height: 40, fontSize: 14 },
  catChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: BORDER_RADIUS.full, borderWidth: 1, marginRight: 6 },
  addButton: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", alignSelf: "flex-end", marginTop: -40 },
  editOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, justifyContent: "center", alignItems: "center", zIndex: 100 },
  editModal: { width: 300, borderRadius: BORDER_RADIUS.xl, padding: SPACING.xl },
  editTitle: { fontSize: 18, fontWeight: "700", marginBottom: SPACING.lg },
  editInput: { borderWidth: 1, borderRadius: BORDER_RADIUS.md, paddingHorizontal: 12, height: 40, fontSize: 14, marginBottom: SPACING.md },
  editBtn: { flex: 1, paddingVertical: 10, borderRadius: BORDER_RADIUS.md, alignItems: "center" },
});

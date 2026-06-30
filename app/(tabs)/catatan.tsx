import { useState, useCallback, useMemo, useRef } from "react";
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, FlatList, Keyboard, Alert, Share, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useApp } from "../../src/hooks/useApp";
import { useTheme, useDebounce } from "../../src/hooks";
import { Card, EmptyState, Badge, Button, Toast } from "../../src/components";
import { NOTE_CATEGORIES, NOTE_COLORS } from "../../src/types";
import { SPACING, BORDER_RADIUS, FONTS } from "../../src/config";

export default function CatatanScreen() {
  const { notes, addNote, editNote, deleteNote, togglePin } = useApp();
  const { colors } = useTheme();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("Semua");
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] = useState("Umum");
  const [newColor, setNewColor] = useState("#FFFFFF");
  const db = useDebounce(search);

  // Edit state
  const [editingNote, setEditingNote] = useState<typeof notes[0] | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editCategory, setEditCategory] = useState("Umum");
  const [editColor, setEditColor] = useState("#FFFFFF");
  const [detailNote, setDetailNote] = useState<typeof notes[0] | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2000);
  }, []);

  const filteredNotes = useMemo(() => {
    const q = db.toLowerCase();
    return notes.filter(n => {
      const matchCat = activeCategory === "Semua" || n.category === activeCategory;
      const matchSearch = n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [notes, db, activeCategory]);

  const pinnedNotes = useMemo(() => filteredNotes.filter(n => n.pinned), [filteredNotes]);
  const unpinnedNotes = useMemo(() => filteredNotes.filter(n => !n.pinned), [filteredNotes]);

  const handleAdd = useCallback(() => {
    if (!newTitle.trim()) return;          // title is enough; content is optional
    addNote(newTitle.trim(), newContent.trim(), newCategory, newColor);
    setNewTitle("");
    setNewContent("");
    setNewCategory("Umum");
    setNewColor("#FFFFFF");
    setShowForm(false);
    Keyboard.dismiss();
    showToast("Catatan tersimpan");
  }, [newTitle, newContent, newCategory, newColor, addNote, showToast]);

  const handleEdit = useCallback((n: typeof notes[0]) => {
    setEditingNote(n);
    setEditTitle(n.title);
    setEditContent(n.content);
    setEditCategory(n.category);
    setEditColor(n.color);
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (!editingNote || !editTitle.trim()) return;
    editNote(editingNote.id, editTitle.trim(), editContent.trim(), editCategory, editColor);
    setEditingNote(null);
    Keyboard.dismiss();
    showToast("Perubahan tersimpan");
  }, [editingNote, editTitle, editContent, editCategory, editColor, editNote, showToast]);

  const handleDelete = useCallback((id: number, title: string) => {
    Alert.alert("Hapus Catatan", `Hapus catatan "${title}"?`, [
      { text: "Batal", style: "cancel" },
      { text: "Hapus", style: "destructive", onPress: () => deleteNote(id) },
    ]);
  }, [deleteNote]);

  const handleShare = useCallback(async (title: string, content: string) => {
    try { await Share.share({ title, message: `${title}\n\n${content}` }); }
    catch {}
  }, []);

  const openDetail = useCallback((n: typeof notes[0]) => setDetailNote(n), []);

  // Detail Screen
  if (detailNote) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => setDetailNote(null)}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text, flex: 1, marginLeft: 12 }]}>{detailNote.title}</Text>
          <View style={{ flexDirection: "row", gap: 4 }}>
            <TouchableOpacity onPress={() => handleEdit(detailNote)} style={{ padding: 8 }}>
              <Ionicons name="pencil" size={20} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { togglePin(detailNote.id); setDetailNote(null); }} style={{ padding: 8 }}>
              <Ionicons name={detailNote.pinned ? "pin" : "pin-outline"} size={20} color={colors.warning} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleShare(detailNote.title, detailNote.content)} style={{ padding: 8 }}>
              <Ionicons name="share-outline" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: SPACING.xl }} keyboardShouldPersistTaps="handled" onScrollBeginDrag={Keyboard.dismiss}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: SPACING.lg }}>
            <Badge label={detailNote.category} color={colors.primary} colors={colors} />
            <Text style={{ color: colors.textTertiary, fontSize: 12 }}>{detailNote.createdAt}</Text>
          </View>
          <Text style={[styles.detailContent, { color: colors.text, lineHeight: 22 }]}>{detailNote.content}</Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Catatan</Text>
          <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
            Simpan ide, daftar, info penting · {notes.length} catatan
          </Text>
        </View>
      </View>

      {/* Search */}
      <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="search" size={18} color={colors.textTertiary} />
        <TextInput style={[styles.searchInput, { color: colors.text }]} placeholder="Cari catatan..." placeholderTextColor={colors.textTertiary} value={search} onChangeText={setSearch} />
      </View>

      {/* Category Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SPACING.sm }} contentContainerStyle={{ paddingHorizontal: SPACING.lg }}>
        {["Semua", ...NOTE_CATEGORIES].map(c => (
          <TouchableOpacity key={c} onPress={() => setActiveCategory(c)} style={[styles.catBtn, { backgroundColor: activeCategory === c ? colors.primary : colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.catText, { color: activeCategory === c ? "#FFF" : colors.textTertiary }]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Edit Modal */}
      {editingNote && (
        <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modal, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text, marginBottom: SPACING.lg }]}>Edit Catatan</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.surfaceSecondary, color: colors.text, borderColor: colors.border }]} value={editTitle} onChangeText={setEditTitle} placeholder="Judul" placeholderTextColor={colors.textTertiary} />
            <TextInput style={[styles.input, styles.textArea, { backgroundColor: colors.surfaceSecondary, color: colors.text, borderColor: colors.border }]} value={editContent} onChangeText={setEditContent} placeholder="Isi catatan..." placeholderTextColor={colors.textTertiary} multiline />
            <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
              {NOTE_CATEGORIES.map(c => (
                <TouchableOpacity key={c} onPress={() => setEditCategory(c)} style={[styles.catChip, { backgroundColor: editCategory === c ? colors.primary : colors.surfaceSecondary, borderColor: colors.border }]}>
                  <Text style={{ color: editCategory === c ? "#FFF" : colors.text, fontSize: 11 }}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
              {NOTE_COLORS.map(c => (
                <TouchableOpacity key={c} onPress={() => setEditColor(c)} style={[styles.colorDot, { backgroundColor: c, borderWidth: editColor === c ? 2 : 1, borderColor: editColor === c ? colors.primary : colors.border }]} />
              ))}
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TouchableOpacity onPress={() => setEditingNote(null)} style={[styles.editBtn, { backgroundColor: colors.surfaceSecondary }]}>
                <Text style={{ color: colors.text, fontWeight: "600" }}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSaveEdit} style={[styles.editBtn, { backgroundColor: colors.primary }]}>
                <Text style={{ color: "#FFF", fontWeight: "600" }}>Simpan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <FlatList
        data={pinnedNotes.length > 0 ? [...pinnedNotes, { _divider: true } as any, ...unpinnedNotes] : unpinnedNotes}
        renderItem={useCallback(({ item }: any) => {
          if (item._divider) {
            return unpinnedNotes.length > 0 ? (
              <Text style={[styles.sectionDivider, { color: colors.textTertiary }]}>Lainnya</Text>
            ) : null;
          }
          const n = item as typeof notes[0];
          return (
            <TouchableOpacity onPress={() => openDetail(n)} onLongPress={() => handleEdit(n)} activeOpacity={0.7}>
              <Card colors={colors} style={[styles.noteCard, { borderLeftColor: n.color || colors.border, borderLeftWidth: 3 }]}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.noteTitle, { color: colors.text }]}>{n.title}</Text>
                    <Text style={[styles.noteContent, { color: colors.textTertiary }]} numberOfLines={2}>{n.content}</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 }}>
                      <Badge label={n.category} color={colors.primary} colors={colors} />
                      <Text style={{ color: colors.textTertiary, fontSize: 11 }}>{n.createdAt}</Text>
                    </View>
                  </View>
                  <View style={{ alignItems: "center", gap: 4 }}>
                    {n.pinned && <Ionicons name="pin" size={14} color={colors.warning} />}
                    <TouchableOpacity onPress={() => handleShare(n.title, n.content)}><Ionicons name="share-outline" size={16} color={colors.textTertiary} /></TouchableOpacity>
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          );
        }, [colors, openDetail, handleEdit, handleShare])}
        keyExtractor={item => item._divider ? "divider" : String(item.id)}
        contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={Keyboard.dismiss}
        ListEmptyComponent={<EmptyState icon="document-text-outline" title="Belum ada catatan" description="Simpan ide, daftar belanja, atau info penting di sini" action={{ label: "Buat catatan", onPress: () => setShowForm(true) }} colors={colors} />}
      />

      {/* FAB */}
      <TouchableOpacity onPress={() => setShowForm(!showForm)} style={[styles.fab, { backgroundColor: colors.primary }]}>
        <Ionicons name={showForm ? "close" : "add"} size={24} color="#FFF" />
      </TouchableOpacity>

      {/* Add Form — keyboard-safe centered modal so Simpan is always reachable */}
      {showForm && (
        <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.kav}>
            <View style={[styles.modal, { backgroundColor: colors.surface }]}>
              <View style={styles.modalHead}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Catatan baru</Text>
                <TouchableOpacity onPress={() => { setShowForm(false); Keyboard.dismiss(); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close" size={22} color={colors.textTertiary} />
                </TouchableOpacity>
              </View>
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
                <TextInput style={[styles.input, { backgroundColor: colors.surfaceSecondary, color: colors.text, borderColor: colors.border }]} value={newTitle} onChangeText={setNewTitle} placeholder="Judul catatan" placeholderTextColor={colors.textTertiary} autoFocus />
                <TextInput style={[styles.input, styles.textArea, { backgroundColor: colors.surfaceSecondary, color: colors.text, borderColor: colors.border }]} value={newContent} onChangeText={setNewContent} placeholder="Isi catatan (opsional)…" placeholderTextColor={colors.textTertiary} multiline />
                <Text style={[styles.helper, { color: colors.textTertiary }]}>Judul aja udah cukup — isi boleh dikosongin.</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }} keyboardShouldPersistTaps="handled">
                  {NOTE_CATEGORIES.map(c => (
                    <TouchableOpacity key={c} onPress={() => setNewCategory(c)} style={[styles.catChip, { backgroundColor: newCategory === c ? colors.primary : colors.surfaceSecondary, borderColor: colors.border }]}>
                      <Text style={{ color: newCategory === c ? "#FFF" : colors.text, fontSize: 11, fontFamily: FONTS.medium.fontFamily }}>{c}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
                  {NOTE_COLORS.map(c => (
                    <TouchableOpacity key={c} onPress={() => setNewColor(c)} style={[styles.colorDot, { backgroundColor: c, borderWidth: newColor === c ? 2 : 1, borderColor: newColor === c ? colors.primary : colors.border }]} />
                  ))}
                </View>
                <Button title="Simpan catatan" onPress={handleAdd} colors={colors} disabled={!newTitle.trim()} />
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      )}

      <Toast visible={!!toast} message={toast || ""} type="success" icon="checkmark-circle" colors={colors} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: SPACING.xl, paddingVertical: SPACING.lg, borderBottomWidth: 1, flexDirection: "row", alignItems: "center" },
  headerTitle: { fontSize: 26, fontFamily: FONTS.h1.fontFamily, letterSpacing: -0.6 },
  headerSub: { fontSize: 13, marginTop: 4, fontFamily: FONTS.regular.fontFamily, lineHeight: 18 },
  searchBar: { flexDirection: "row", alignItems: "center", margin: SPACING.lg, borderWidth: 1, borderRadius: BORDER_RADIUS.lg, paddingHorizontal: SPACING.md, height: 44 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14, fontFamily: FONTS.regular.fontFamily },
  catBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: BORDER_RADIUS.full, borderWidth: 1, marginRight: 8 },
  catText: { fontSize: 13, fontFamily: FONTS.medium.fontFamily },
  catChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: BORDER_RADIUS.full, borderWidth: 1, marginRight: 6 },
  noteCard: { paddingVertical: SPACING.md },
  noteTitle: { fontSize: 15, fontFamily: FONTS.semibold.fontFamily },
  noteContent: { fontSize: 13, marginTop: 4, lineHeight: 18, fontFamily: FONTS.regular.fontFamily },
  sectionDivider: { fontSize: 12, fontFamily: FONTS.semibold.fontFamily, marginVertical: SPACING.sm, paddingHorizontal: 4 },
  overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, justifyContent: "center", alignItems: "center", zIndex: 100, paddingHorizontal: SPACING.lg },
  kav: { width: "100%", alignItems: "center", justifyContent: "center" },
  modal: { width: "100%", maxWidth: 360, borderRadius: BORDER_RADIUS.xl, padding: SPACING.xl },
  modalHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: SPACING.lg },
  modalTitle: { fontSize: 18, fontFamily: FONTS.bold.fontFamily },
  helper: { fontSize: 12, marginBottom: SPACING.md, marginTop: -2, fontFamily: FONTS.regular.fontFamily },
  input: { borderWidth: 1, borderRadius: BORDER_RADIUS.md, paddingHorizontal: 12, minHeight: 44, fontSize: 14, marginBottom: 8, fontFamily: FONTS.regular.fontFamily, paddingVertical: 10 },
  textArea: { minHeight: 90, textAlignVertical: "top", paddingTop: 10 },
  colorDot: { width: 26, height: 26, borderRadius: 13 },
  editBtn: { flex: 1, paddingVertical: 11, borderRadius: BORDER_RADIUS.md, alignItems: "center" },
  fab: { position: "absolute", bottom: 100, right: SPACING.lg, width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", elevation: 6, shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6, zIndex: 10 },
  detailContent: { fontSize: 15, fontFamily: FONTS.regular.fontFamily },
});

// i18n — lightweight ID/EN translation system (no external deps).

export type Lang = 'id' | 'en';

const STRINGS: Record<string, { id: string; en: string }> = {
  'tab.home': { id: 'Beranda', en: 'Home' },
  'tab.monitor': { id: 'Pantau', en: 'Monitor' },
  'tab.ai': { id: 'AI', en: 'AI' },
  'tab.notes': { id: 'Catatan', en: 'Notes' },
  'tab.profile': { id: 'Profil', en: 'Profile' },

  // Home / Beranda
  'home.greeting': { id: 'Halo', en: 'Hi' },
  'home.subtitle': { id: 'pantauan aktif · tanya AI soal datanya', en: 'active monitors · ask AI about them' },
  'home.subtitleEmpty': { id: 'Pantau harga & info penting, lalu tanya AI', en: 'Monitor prices & key info, then ask AI' },
  'home.startTitle': { id: 'Mulai pantau', en: 'Start monitoring' },
  'home.startDesc': { id: 'Tambahkan harga, berita, atau info apa saja untuk dipantau real-time', en: 'Add prices, news, or anything to monitor in real-time' },
  'home.add': { id: 'Tambahkan', en: 'Add' },
  'home.statMonitors': { id: 'Pantauan', en: 'Monitors' },
  'home.statActive': { id: 'Aktif', en: 'Active' },
  'home.statNotes': { id: 'Catatan', en: 'Notes' },
  'home.statPinned': { id: 'Disematkan', en: 'Pinned' },
  'home.aiTitle': { id: 'Asisten AI', en: 'AI Assistant' },
  'home.aiDesc': { id: 'Tanya apa saja soal pantauan kamu — dijawab pakai data real.', en: 'Ask anything about your monitors — answered with real data.' },
  'home.recentMonitors': { id: 'Pantauan Terbaru', en: 'Recent Monitors' },
  'home.seeAll': { id: 'Lihat Semua', en: 'See All' },
  'home.pinnedNotes': { id: 'Catatan Disematkan', en: 'Pinned Notes' },

  // Monitor / Pantau
  'monitor.title': { id: 'Pantau', en: 'Monitor' },
  'monitor.subLive': { id: 'harga real-time · tarik untuk refresh', en: 'real-time prices · pull to refresh' },
  'monitor.subDefault': { id: 'Pantau harga, berita, sembako, bansos & apa saja', en: 'Monitor prices, news, groceries, aid & anything' },
  'monitor.search': { id: 'Cari pantauan...', en: 'Search monitors...' },
  'monitor.emptyTitle': { id: 'Belum ada pantauan', en: 'No monitors yet' },
  'monitor.emptyDesc': { id: 'Tambahkan sesuatu untuk dipantau', en: 'Add something to monitor' },
  'monitor.noResult': { id: 'Tidak ada hasil', en: 'No results' },
  'monitor.noResultDesc': { id: 'Coba kata kunci lain', en: 'Try another keyword' },
  'monitor.addTitle': { id: 'Pantau hal baru', en: 'Monitor something new' },
  'monitor.addHint': { id: 'Harga, berita, stok, jadwal — apa aja. Ketik nama atau tempel link.', en: 'Prices, news, stock, schedule — anything. Type a name or paste a link.' },
  'monitor.addPlaceholder': { id: 'Contoh: Harga Beras, Berita Bola, Bitcoin...', en: 'e.g. Rice price, Football news, Bitcoin...' },
  'monitor.addBtn': { id: 'Tambah Pantauan', en: 'Add Monitor' },
  'monitor.tapDetail': { id: 'Ketuk untuk lihat detail & tanya AI', en: 'Tap for detail & ask AI' },
  'monitor.failLoad': { id: 'Gagal memuat — tarik untuk coba lagi', en: 'Failed to load — pull to retry' },
  'monitor.cat.all': { id: 'Semua', en: 'All' },
  'monitor.cat.harga': { id: 'Harga', en: 'Price' },
  'monitor.cat.berita': { id: 'Berita', en: 'News' },
  'monitor.cat.stok': { id: 'Stok', en: 'Stock' },
  'monitor.cat.jadwal': { id: 'Jadwal', en: 'Schedule' },

  // Detail
  'detail.priceNow': { id: 'HARGA TERKINI', en: 'CURRENT PRICE' },
  'detail.source': { id: 'Sumber', en: 'Source' },
  'detail.noData': { id: 'Belum ada data. Tekan "Tanya AI".', en: 'No data yet. Tap "Ask AI".' },
  'detail.readFull': { id: 'Baca berita lengkap', en: 'Read full article' },
  'detail.loadingFull': { id: 'Memuat isi lengkap...', en: 'Loading full content...' },
  'detail.verify': { id: 'CEK KEBENARAN', en: 'VERIFY SOURCES' },
  'detail.alertTitle': { id: 'Notifikasi Harga', en: 'Price Alert' },
  'detail.alertOn': { id: 'Aktif', en: 'On' },
  'detail.alertDesc': { id: 'Kabari aku saat harga tembus target', en: 'Notify me when price hits target' },
  'detail.above': { id: 'Di atas', en: 'Above' },
  'detail.below': { id: 'Di bawah', en: 'Below' },
  'detail.targetPrice': { id: 'Target harga (Rp)', en: 'Target price (Rp)' },
  'detail.askAI': { id: 'Tanya AI tentang ini', en: 'Ask AI about this' },
  'detail.analyzing': { id: 'Menganalisis...', en: 'Analyzing...' },

  // AI
  'ai.title': { id: 'Asisten kamu', en: 'Your assistant' },
  'ai.placeholder': { id: 'Tanya apa saja...', en: 'Ask anything...' },
  'ai.clear': { id: 'Hapus', en: 'Clear' },
  'ai.startTitle': { id: 'Mulai ngobrol', en: 'Start chatting' },
  'ai.startDesc': { id: 'Tanya apa saja - harga, berita, analisis. Dijawab pakai data real-time + web search. Riwayat tersimpan otomatis.', en: 'Ask anything - prices, news, analysis. Answered with real-time data + web search. History saved automatically.' },
  'ai.searching': { id: 'Mencari di web & menyusun jawaban...', en: 'Searching web & composing answer...' },

  // Notes / Catatan
  'notes.title': { id: 'Catatan', en: 'Notes' },
  'notes.search': { id: 'Cari catatan...', en: 'Search notes...' },
  'notes.emptyTitle': { id: 'Belum ada catatan', en: 'No notes yet' },
  'notes.emptyDesc': { id: 'Simpan ide, daftar belanja, atau info penting di sini', en: 'Save ideas, shopping lists, or important info here' },
  'notes.create': { id: 'Buat catatan', en: 'Create note' },
  'notes.newTitle': { id: 'Catatan baru', en: 'New note' },
  'notes.noteTitle': { id: 'Judul catatan', en: 'Note title' },
  'notes.noteContent': { id: 'Isi catatan (opsional)…', en: 'Note content (optional)…' },
  'notes.save': { id: 'Simpan catatan', en: 'Save note' },
  'notes.saved': { id: 'Catatan tersimpan', en: 'Note saved' },

  // Compare
  'compare.title': { id: 'Bandingkan', en: 'Compare' },
  'compare.sub': { id: 'Pilih hingga 4 pantauan', en: 'Pick up to 4 monitors' },
  'compare.pick': { id: 'PILIH PANTAUAN', en: 'PICK MONITORS' },
  'compare.empty': { id: 'Pilih minimal 2 pantauan untuk dibandingkan', en: 'Pick at least 2 monitors to compare' },

  // Alert / common
  'alert.title': { id: 'Notifikasi Harga', en: 'Price Alert' },
  'common.save': { id: 'Simpan', en: 'Save' },
  'common.cancel': { id: 'Batal', en: 'Cancel' },
  'common.delete': { id: 'Hapus', en: 'Delete' },
  'common.back': { id: 'Kembali', en: 'Back' },
  'common.off': { id: 'Matikan', en: 'Turn off' },

  // Profile
  'profile.language': { id: 'Bahasa / Language', en: 'Language / Bahasa' },
  'profile.theme': { id: 'Tampilan', en: 'Appearance' },
  'profile.settings': { id: 'Pengaturan', en: 'Settings' },
  'profile.info': { id: 'Informasi', en: 'Information' },
  'profile.login': { id: 'Login dengan Gmail', en: 'Sign in with Gmail' },
  'profile.sync': { id: 'Sync ke Cloud', en: 'Sync to Cloud' },
  'profile.export': { id: 'Export Data', en: 'Export Data' },
  'profile.deleteAccount': { id: 'Hapus Akun', en: 'Delete Account' },
  'profile.notif': { id: 'Notifikasi Push', en: 'Push Notifications' },
  'profile.logout': { id: 'Logout', en: 'Logout' },
  'theme.light': { id: 'Terang', en: 'Light' },
  'theme.dark': { id: 'Gelap', en: 'Dark' },
  'theme.system': { id: 'Sistem', en: 'System' },
};

let currentLang: Lang = 'id';

export function setLang(lang: Lang): void {
  currentLang = lang;
}

export function getLang(): Lang {
  return currentLang;
}

export function t(key: string): string {
  const entry = STRINGS[key];
  if (!entry) return key;
  return entry[currentLang] || entry.id;
}

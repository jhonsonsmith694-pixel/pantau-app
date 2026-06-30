// i18n — lightweight ID/EN translation system (no external deps).

export type Lang = 'id' | 'en';

const STRINGS: Record<string, { id: string; en: string }> = {
  'tab.home': { id: 'Beranda', en: 'Home' },
  'tab.monitor': { id: 'Pantau', en: 'Monitor' },
  'tab.ai': { id: 'AI', en: 'AI' },
  'tab.notes': { id: 'Catatan', en: 'Notes' },
  'tab.profile': { id: 'Profil', en: 'Profile' },
  'home.greeting': { id: 'Halo', en: 'Hi' },
  'monitor.title': { id: 'Pantau', en: 'Monitor' },
  'monitor.search': { id: 'Cari pantauan...', en: 'Search monitors...' },
  'monitor.add': { id: 'Nama yang mau dipantau...', en: 'What to monitor...' },
  'monitor.empty': { id: 'Belum ada pantauan', en: 'No monitors yet' },
  'ai.title': { id: 'Asisten kamu', en: 'Your assistant' },
  'ai.placeholder': { id: 'Tanya apa saja...', en: 'Ask anything...' },
  'ai.clear': { id: 'Hapus', en: 'Clear' },
  'alert.title': { id: 'Notifikasi Harga', en: 'Price Alert' },
  'alert.above': { id: 'Di atas', en: 'Above' },
  'alert.below': { id: 'Di bawah', en: 'Below' },
  'common.save': { id: 'Simpan', en: 'Save' },
  'common.cancel': { id: 'Batal', en: 'Cancel' },
  'common.delete': { id: 'Hapus', en: 'Delete' },
  'profile.language': { id: 'Bahasa', en: 'Language' },
  'profile.theme': { id: 'Tampilan', en: 'Appearance' },
  'profile.login': { id: 'Login dengan Gmail', en: 'Sign in with Gmail' },
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

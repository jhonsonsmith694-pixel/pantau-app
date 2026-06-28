// Welcome data — shown to first-time users
import { Monitor, Note } from '../types';

export const WELCOME_MONITORS: Monitor[] = [
  { id: 1, title: 'Harga Emas Antam', category: 'harga', active: true, createdAt: 'Baru saja' },
  { id: 2, title: 'Bitcoin / BTC', category: 'harga', active: true, createdAt: 'Baru saja' },
  { id: 3, title: 'Berita Teknologi', category: 'berita', active: false, createdAt: 'Baru saja' },
];

export const WELCOME_NOTES: Note[] = [
  {
    id: 1,
    title: 'Selamat datang di PANTAU!',
    content: 'PANTAU adalah AI personal monitor kamu. Pantau harga, berita, stok, dan jadwal favorit kamu. Semua gratis.',
    pinned: true,
    category: 'Umum',
    color: '#DBEAFE',
    createdAt: 'Baru saja',
  },
  {
    id: 2,
    title: 'Cara Pakai',
    content: '1. Buka tab Pantau\n2. Pilih kategori\n3. Ketik atau pilih rekomendasi\n4. Pantauan muncul di Beranda',
    pinned: false,
    category: 'Ide',
    color: '#D1FAE5',
    createdAt: 'Baru saja',
  },
  {
    id: 3,
    title: 'Ide Pantauan',
    content: '• Harga Emas Antam\n• Kurs Dolar\n• Bitcoin\n• Harga BBM\n• Berita Bola\n• Jadwal Film\n• Stok Tiket Konser',
    pinned: false,
    category: 'Ide',
    color: '#FEF3C7',
    createdAt: 'Baru saja',
  },
];
